import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async getPublicStats() {
    const enabled = this.configService.get<boolean>('ENABLE_PUBLIC_STATS', true);
    if (!enabled) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'stats_disabled',
        message: 'Estadísticas públicas deshabilitadas',
      });
    }

    const db = this.supabaseService.getClient();
    const { data } = await db
      .from('stats_cache')
      .select('data, updated_at')
      .eq('key', 'public_stats')
      .single();

    if (!data) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'insufficient_data',
        message: 'Aún no hay suficientes datos para mostrar estadísticas',
      });
    }

    const stats = data.data as Record<string, unknown>;
    const totalSessions = (stats.total_sessions as number) ?? 0;
    const minSessions = this.configService.get<number>('STATS_MIN_SESSIONS', 1000);

    if (totalSessions < minSessions) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'insufficient_data',
        message: `Se necesitan al menos ${minSessions} sesiones para mostrar estadísticas (actual: ${totalSessions})`,
      });
    }

    return { ...stats, last_updated: data.updated_at };
  }

  async refreshStats() {
    const db = this.supabaseService.getClient();
    this.logger.log('Recalculando estadísticas públicas...');

    try {
      // Total de sesiones completadas
      const { count: totalSessions } = await db
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'done');

      // aggregate_affinity: porcentaje por candidato entre los rank=1
      const { data: affinityData } = await db
        .from('match_result_candidates')
        .select('candidate_id')
        .eq('rank', 1);

      const totalRank1 = affinityData?.length ?? 0;
      const affinityCount = new Map<string, number>();
      for (const row of affinityData ?? []) {
        affinityCount.set(
          row.candidate_id,
          (affinityCount.get(row.candidate_id) ?? 0) + 1,
        );
      }
      const aggregateAffinity = Array.from(affinityCount.entries())
        .map(([candidateId, count]) => ({
          candidateId,
          pct: totalRank1 > 0 ? Math.round((count / totalRank1) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.pct - a.pct);

      // by_region
      const { data: regionData } = await db
        .from('sessions')
        .select('region, match_result_candidates(candidate_id, rank)')
        .eq('status', 'done');

      const byRegion = this.computeByRegion(regionData ?? []);

      // by_age
      const { data: ageData } = await db
        .from('sessions')
        .select('age_range, match_result_candidates(candidate_id, rank)')
        .eq('status', 'done');

      const byAge = this.computeByAge(ageData ?? []);

      // preference_vs_match
      const { data: prefData } = await db
        .from('sessions')
        .select('initial_preference, match_result_candidates(candidate_id, rank)')
        .eq('status', 'done')
        .not('initial_preference', 'in', '("undecided","blank","na")');

      const preferenceVsMatch = this.computePreferenceVsMatch(prefData ?? []);

      // gap_national_pct
      let gapPct = 0;
      if (prefData && prefData.length > 0) {
        const mismatches = prefData.filter((s) => {
          const candidates = s.match_result_candidates as { candidate_id: string; rank: number }[];
          const top = candidates?.find((c) => c.rank === 1);
          return top && top.candidate_id !== s.initial_preference;
        });
        gapPct =
          Math.round((mismatches.length / prefData.length) * 1000) / 10;
      }

      // decisive_axes
      const { data: weightData } = await db
        .from('answers')
        .select('weight, questions(axis)');

      const axisWeights = new Map<string, { total: number; count: number }>();
      for (const row of weightData ?? []) {
        const question = row.questions as unknown as { axis: string };
        if (!question?.axis) continue;
        const existing = axisWeights.get(question.axis) ?? { total: 0, count: 0 };
        existing.total += row.weight;
        existing.count += 1;
        axisWeights.set(question.axis, existing);
      }
      const decisiveAxes = Array.from(axisWeights.entries())
        .map(([axis, { total, count }]) => ({
          axis,
          avgWeight: Math.round((total / count) * 10) / 10,
        }))
        .sort((a, b) => b.avgWeight - a.avgWeight);

      // polarization_by_axis
      const { data: polarData } = await db
        .from('answers')
        .select('value, questions(axis)');

      const axisValues = new Map<string, number[]>();
      for (const row of polarData ?? []) {
        const question = row.questions as unknown as { axis: string };
        if (!question?.axis) continue;
        const vals = axisValues.get(question.axis) ?? [];
        vals.push(row.value);
        axisValues.set(question.axis, vals);
      }
      const polarizationByAxis = Array.from(axisValues.entries())
        .map(([axis, values]) => {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const variance =
            values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
          const stddev = Math.sqrt(variance);
          return {
            axis,
            polarizationScore: Math.round((stddev / 2) * 100) / 100,
          };
        })
        .sort((a, b) => b.polarizationScore - a.polarizationScore);

      // undecided_pct: porcentaje de usuarios donde top 2 scores difieren en <5
      const { data: rankData } = await db
        .from('match_result_candidates')
        .select('session_id, score, rank')
        .in('rank', [1, 2])
        .order('session_id')
        .order('rank');

      let undecidedCount = 0;
      let sessionCount = 0;
      const sessionScores = new Map<string, number[]>();
      for (const row of rankData ?? []) {
        const scores = sessionScores.get(row.session_id) ?? [];
        scores.push(row.score);
        sessionScores.set(row.session_id, scores);
      }
      for (const scores of sessionScores.values()) {
        if (scores.length >= 2) {
          sessionCount++;
          if (Math.abs(scores[0] - scores[1]) < 5) {
            undecidedCount++;
          }
        }
      }
      const undecidedPct =
        sessionCount > 0
          ? Math.round((undecidedCount / sessionCount) * 1000) / 10
          : 0;

      // Guardar en cache
      const statsData = {
        total_sessions: totalSessions ?? 0,
        aggregate_affinity: aggregateAffinity,
        by_region: byRegion,
        by_age: byAge,
        preference_vs_match: preferenceVsMatch,
        gap_national_pct: gapPct,
        decisive_axes: decisiveAxes,
        polarization_by_axis: polarizationByAxis,
        undecided_pct: undecidedPct,
      };

      await db.from('stats_cache').upsert(
        {
          key: 'public_stats',
          data: statsData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' },
      );

      this.logger.log(
        `Estadísticas actualizadas: ${totalSessions ?? 0} sesiones`,
      );
    } catch (error) {
      this.logger.error(`Error recalculando estadísticas: ${error}`);
    }
  }

  private computeByRegion(
    data: { region: string; match_result_candidates: unknown }[],
  ) {
    const regionMap = new Map<string, Map<string, number>>();

    for (const session of data) {
      const candidates = session.match_result_candidates as { candidate_id: string; rank: number }[];
      const top = candidates?.find((c) => c.rank === 1);
      if (!top) continue;

      if (!regionMap.has(session.region)) {
        regionMap.set(session.region, new Map());
      }
      const counts = regionMap.get(session.region)!;
      counts.set(top.candidate_id, (counts.get(top.candidate_id) ?? 0) + 1);
    }

    return Array.from(regionMap.entries()).map(([region, counts]) => {
      const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
      const top3 = Array.from(counts.entries())
        .map(([candidateId, count]) => ({
          candidateId,
          pct: Math.round((count / total) * 1000) / 10,
        }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3);
      return { region, top3 };
    });
  }

  private computeByAge(
    data: { age_range: string; match_result_candidates: unknown }[],
  ) {
    const ageMap = new Map<string, Map<string, number>>();

    for (const session of data) {
      const candidates = session.match_result_candidates as { candidate_id: string; rank: number }[];
      const top = candidates?.find((c) => c.rank === 1);
      if (!top) continue;

      if (!ageMap.has(session.age_range)) {
        ageMap.set(session.age_range, new Map());
      }
      const counts = ageMap.get(session.age_range)!;
      counts.set(top.candidate_id, (counts.get(top.candidate_id) ?? 0) + 1);
    }

    return Array.from(ageMap.entries()).map(([range, counts]) => {
      const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
      const distribution = Array.from(counts.entries())
        .map(([candidateId, count]) => ({
          candidateId,
          pct: Math.round((count / total) * 1000) / 10,
        }))
        .sort((a, b) => b.pct - a.pct);
      return { range, distribution };
    });
  }

  private computePreferenceVsMatch(
    data: { initial_preference: string; match_result_candidates: unknown }[],
  ) {
    const prefMap = new Map<string, Map<string, number>>();

    for (const session of data) {
      const candidates = session.match_result_candidates as { candidate_id: string; rank: number }[];
      const top = candidates?.find((c) => c.rank === 1);
      if (!top) continue;

      if (!prefMap.has(session.initial_preference)) {
        prefMap.set(session.initial_preference, new Map());
      }
      const counts = prefMap.get(session.initial_preference)!;
      counts.set(top.candidate_id, (counts.get(top.candidate_id) ?? 0) + 1);
    }

    return Array.from(prefMap.entries()).map(([fromCandidateId, counts]) => {
      const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
      const to = Array.from(counts.entries())
        .map(([candidateId, count]) => ({
          candidateId,
          pct: Math.round((count / total) * 1000) / 10,
        }))
        .sort((a, b) => b.pct - a.pct);
      return { fromCandidateId, to };
    });
  }
}
