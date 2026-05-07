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

  async getSessionCount() {
    const { count } = await this.supabaseService
      .getClient()
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'done');

    return { total_sessions: count ?? 0 };
  }

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

  /**
   * Paginar un query de Supabase para superar el límite de 1000 filas por defecto.
   * Construye el query desde cero en cada iteración y aplica `.range(from, to)`.
   */
  private async fetchAllPaged<T>(
    buildQuery: () => {
      range: (
        from: number,
        to: number,
      ) => Promise<{ data: T[] | null; error: unknown }>;
    },
    pageSize = 1000,
  ): Promise<T[]> {
    const all: T[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await buildQuery().range(
        offset,
        offset + pageSize - 1,
      );
      if (error) {
        this.logger.error(`Error paginando query: ${JSON.stringify(error)}`);
        break;
      }
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      offset += pageSize;
    }
    return all;
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
      const affinityData = await this.fetchAllPaged<{ candidate_id: string }>(
        () =>
          db
            .from('match_result_candidates')
            .select('candidate_id')
            .eq('rank', 1) as never,
      );

      const totalRank1 = affinityData.length;
      const affinityCount = new Map<string, number>();
      for (const row of affinityData) {
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
      const regionData = await this.fetchAllPaged<{
        region: string;
        match_result_candidates: unknown;
      }>(
        () =>
          db
            .from('sessions')
            .select('region, match_result_candidates(candidate_id, rank)')
            .eq('status', 'done') as never,
      );

      const byRegion = this.computeByRegion(regionData);

      // by_age
      const ageData = await this.fetchAllPaged<{
        age_range: string;
        match_result_candidates: unknown;
      }>(
        () =>
          db
            .from('sessions')
            .select('age_range, match_result_candidates(candidate_id, rank)')
            .eq('status', 'done') as never,
      );

      const byAge = this.computeByAge(ageData);

      // preference_vs_match (solo sesiones con preferencia por un candidato real)
      const prefData = await this.fetchAllPaged<{
        initial_preference: string;
        match_result_candidates: unknown;
      }>(
        () =>
          db
            .from('sessions')
            .select(
              'initial_preference, match_result_candidates(candidate_id, rank)',
            )
            .eq('status', 'done')
            .not(
              'initial_preference',
              'in',
              '("undecided","blank","na")',
            ) as never,
      );

      const preferenceVsMatch = this.computePreferenceVsMatch(prefData);

      // initial_preference_counts: TODAS las sesiones, incluyendo undecided/blank/na
      const allPrefData = await this.fetchAllPaged<{
        initial_preference: string | null;
      }>(
        () =>
          db
            .from('sessions')
            .select('initial_preference')
            .eq('status', 'done') as never,
      );

      const prefCounts = new Map<string, number>();
      for (const row of allPrefData) {
        const key = row.initial_preference ?? 'na';
        prefCounts.set(key, (prefCounts.get(key) ?? 0) + 1);
      }
      const totalAllPrefs = Array.from(prefCounts.values()).reduce(
        (a, b) => a + b,
        0,
      );
      const initialPreferenceCounts = Array.from(prefCounts.entries())
        .map(([preference, count]) => ({
          preference,
          count,
          pct:
            totalAllPrefs > 0
              ? Math.round((count / totalAllPrefs) * 1000) / 10
              : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // gap_national_pct
      let gapPct = 0;
      if (prefData.length > 0) {
        const mismatches = prefData.filter((s) => {
          const candidates = s.match_result_candidates as {
            candidate_id: string;
            rank: number;
          }[];
          const top = candidates?.find((c) => c.rank === 1);
          return top && top.candidate_id !== s.initial_preference;
        });
        gapPct =
          Math.round((mismatches.length / prefData.length) * 1000) / 10;
      }

      // decisive_axes
      const weightData = await this.fetchAllPaged<{
        weight: number;
        questions: unknown;
      }>(
        () => db.from('answers').select('weight, questions(axis)') as never,
      );

      const axisWeights = new Map<string, { total: number; count: number }>();
      for (const row of weightData) {
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
      const polarData = await this.fetchAllPaged<{
        value: number;
        questions: unknown;
      }>(
        () => db.from('answers').select('value, questions(axis)') as never,
      );

      const axisValues = new Map<string, number[]>();
      for (const row of polarData) {
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
      const rankData = await this.fetchAllPaged<{
        session_id: string;
        score: number;
        rank: number;
      }>(
        () =>
          db
            .from('match_result_candidates')
            .select('session_id, score, rank')
            .in('rank', [1, 2])
            .order('session_id')
            .order('rank') as never,
      );

      let undecidedCount = 0;
      let sessionCount = 0;
      const sessionScores = new Map<string, number[]>();
      for (const row of rankData) {
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
        initial_preference_counts: initialPreferenceCounts,
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

  // ==================== MÉTRICAS AVANZADAS (solo desarrollo) ====================

  async getEngagementMetrics() {
    const db = this.supabaseService.getClient();

    // Total y tasa de completado
    const { count: total } = await db.from('sessions').select('id', { count: 'exact', head: true });
    const { count: done } = await db.from('sessions').select('id', { count: 'exact', head: true }).eq('status', 'done');
    const { count: abandoned } = await db.from('sessions').select('id', { count: 'exact', head: true }).in('status', ['created', 'answering']);

    // Tiempo promedio de completado
    const { data: times } = await db
      .from('sessions')
      .select('created_at, completed_at')
      .eq('status', 'done')
      .not('completed_at', 'is', null);

    let avgTimeSeconds = 0;
    let minTime = Infinity;
    let maxTime = 0;
    if (times && times.length > 0) {
      const durations = times.map((t) => {
        const diff = (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / 1000;
        return diff;
      }).filter((d) => d > 0 && d < 3600); // filtrar outliers
      if (durations.length > 0) {
        avgTimeSeconds = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        minTime = Math.round(Math.min(...durations));
        maxTime = Math.round(Math.max(...durations));
      }
    }

    // Distribución por hora del día
    const { data: hourData } = await db.from('sessions').select('created_at').eq('status', 'done');
    const byHour: Record<number, number> = {};
    for (const s of hourData ?? []) {
      const hour = new Date(s.created_at).getHours();
      byHour[hour] = (byHour[hour] ?? 0) + 1;
    }
    const hourDistribution = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: byHour[h] ?? 0 }));

    // Distribución por día de la semana
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const byDay: Record<number, number> = {};
    for (const s of hourData ?? []) {
      const day = new Date(s.created_at).getDay();
      byDay[day] = (byDay[day] ?? 0) + 1;
    }
    const dayDistribution = days.map((name, i) => ({ day: name, count: byDay[i] ?? 0 }));

    return {
      total_sessions: total ?? 0,
      completed: done ?? 0,
      abandoned: abandoned ?? 0,
      completion_rate: total ? Math.round(((done ?? 0) / total) * 1000) / 10 : 0,
      avg_time_seconds: avgTimeSeconds,
      min_time_seconds: minTime === Infinity ? 0 : minTime,
      max_time_seconds: maxTime,
      by_hour: hourDistribution,
      by_day: dayDistribution,
    };
  }

  async getAffinityDeepMetrics() {
    const db = this.supabaseService.getClient();

    const { data: allResults } = await db
      .from('match_result_candidates')
      .select('session_id, candidate_id, score, rank');

    if (!allResults || allResults.length === 0) return {};

    // Agrupar por sesión
    const sessions = new Map<string, typeof allResults>();
    for (const r of allResults) {
      const arr = sessions.get(r.session_id) ?? [];
      arr.push(r);
      sessions.set(r.session_id, arr);
    }

    // Candidato más polarizante (mayor varianza en scores)
    const candidateScores = new Map<string, number[]>();
    for (const r of allResults) {
      const scores = candidateScores.get(r.candidate_id) ?? [];
      scores.push(r.score);
      candidateScores.set(r.candidate_id, scores);
    }
    const polarization = Array.from(candidateScores.entries()).map(([id, scores]) => {
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
      return { candidateId: id, variance: Math.round(variance * 10) / 10, stddev: Math.round(Math.sqrt(variance) * 10) / 10 };
    }).sort((a, b) => b.variance - a.variance);

    // Segunda opción más frecuente por cada #1
    const secondChoice = new Map<string, Map<string, number>>();
    for (const candidates of sessions.values()) {
      const sorted = candidates.sort((a, b) => a.rank - b.rank);
      if (sorted.length >= 2) {
        const first = sorted[0].candidate_id;
        const second = sorted[1].candidate_id;
        if (!secondChoice.has(first)) secondChoice.set(first, new Map());
        const counts = secondChoice.get(first)!;
        counts.set(second, (counts.get(second) ?? 0) + 1);
      }
    }
    const secondChoiceResult = Array.from(secondChoice.entries()).map(([firstId, counts]) => {
      const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
      const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
      return { candidateId: firstId, mostCommonSecond: top?.[0] ?? '', pct: top ? Math.round((top[1] / total) * 1000) / 10 : 0 };
    });

    // Brecha promedio entre #1 y #2
    let totalGap = 0;
    let gapCount = 0;
    const gapDistribution = { tight: 0, moderate: 0, clear: 0, dominant: 0 };
    for (const candidates of sessions.values()) {
      const sorted = candidates.sort((a, b) => a.rank - b.rank);
      if (sorted.length >= 2) {
        const gap = sorted[0].score - sorted[1].score;
        totalGap += gap;
        gapCount++;
        if (gap <= 5) gapDistribution.tight++;
        else if (gap <= 15) gapDistribution.moderate++;
        else if (gap <= 30) gapDistribution.clear++;
        else gapDistribution.dominant++;
      }
    }
    const avgGap = gapCount > 0 ? Math.round((totalGap / gapCount) * 10) / 10 : 0;

    // Distribución de scores del #1
    const topScores: number[] = [];
    for (const candidates of sessions.values()) {
      const top = candidates.find((c) => c.rank === 1);
      if (top) topScores.push(top.score);
    }
    const scoreRanges = {
      '90-100': topScores.filter((s) => s >= 90).length,
      '80-89': topScores.filter((s) => s >= 80 && s < 90).length,
      '70-79': topScores.filter((s) => s >= 70 && s < 80).length,
      '60-69': topScores.filter((s) => s >= 60 && s < 70).length,
      '50-59': topScores.filter((s) => s >= 50 && s < 60).length,
      'bajo-50': topScores.filter((s) => s < 50).length,
    };

    // Fidelidad: qué candidato tiene más seguidores que coinciden
    const { data: sessionsFidelity } = await db
      .from('sessions')
      .select('initial_preference, match_result_candidates(candidate_id, rank)')
      .eq('status', 'done')
      .not('initial_preference', 'in', '("undecided","blank","na")');

    const fidelity = new Map<string, { match: number; total: number }>();
    for (const s of sessionsFidelity ?? []) {
      const candidates = s.match_result_candidates as { candidate_id: string; rank: number }[];
      const top = candidates?.find((c) => c.rank === 1);
      if (!top) continue;
      const existing = fidelity.get(s.initial_preference) ?? { match: 0, total: 0 };
      existing.total++;
      if (top.candidate_id === s.initial_preference) existing.match++;
      fidelity.set(s.initial_preference, existing);
    }
    const fidelityResult = Array.from(fidelity.entries())
      .map(([id, { match, total }]) => ({
        candidateId: id,
        fidelityPct: Math.round((match / total) * 1000) / 10,
        total,
      }))
      .sort((a, b) => b.fidelityPct - a.fidelityPct);

    return {
      most_polarizing: polarization,
      second_choice: secondChoiceResult,
      avg_gap_1st_2nd: avgGap,
      gap_distribution: gapDistribution,
      top_score_distribution: scoreRanges,
      candidate_fidelity: fidelityResult,
    };
  }

  async getAxesAnalysis() {
    const db = this.supabaseService.getClient();

    const { data: answers } = await db
      .from('answers')
      .select('value, weight, questions(axis)');

    if (!answers || answers.length === 0) return {};

    // Agrupar por eje
    const axisData = new Map<string, { values: number[]; weights: number[] }>();
    for (const a of answers) {
      const question = a.questions as unknown as { axis: string };
      if (!question?.axis) continue;
      const existing = axisData.get(question.axis) ?? { values: [], weights: [] };
      existing.values.push(a.value);
      existing.weights.push(a.weight);
      axisData.set(question.axis, existing);
    }

    // Eje más importante (mayor peso promedio)
    const axisImportance = Array.from(axisData.entries()).map(([axis, { weights }]) => ({
      axis,
      avgWeight: Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 100) / 100,
      highImportance: Math.round((weights.filter((w) => w === 3).length / weights.length) * 1000) / 10,
    })).sort((a, b) => b.avgWeight - a.avgWeight);

    // Respuestas más populares por eje
    const popularResponses = Array.from(axisData.entries()).map(([axis, { values }]) => {
      const counts: Record<number, number> = {};
      for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
      const distribution = Object.entries(counts)
        .map(([value, count]) => ({ value: parseInt(value), count, pct: Math.round((count / values.length) * 1000) / 10 }))
        .sort((a, b) => b.count - a.count);
      const mean = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
      return { axis, mean, distribution };
    });

    // Polarización por eje (stddev normalizada)
    const axisPolarization = Array.from(axisData.entries()).map(([axis, { values }]) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      return { axis, polarizationScore: Math.round((Math.sqrt(variance) / 3) * 100) / 100 };
    }).sort((a, b) => b.polarizationScore - a.polarizationScore);

    return {
      axis_importance: axisImportance,
      popular_responses: popularResponses,
      axis_polarization: axisPolarization,
    };
  }

  async getDemographicsCrossed() {
    const db = this.supabaseService.getClient();

    const { data } = await db
      .from('sessions')
      .select('age_range, region, answers(value, weight, questions(axis))')
      .eq('status', 'done');

    if (!data || data.length === 0) return {};

    // Eje más importante por edad
    const ageAxisWeight = new Map<string, Map<string, { total: number; count: number }>>();
    for (const s of data) {
      const answers = s.answers as unknown as { value: number; weight: number; questions: { axis: string } }[];
      if (!answers) continue;
      for (const a of answers) {
        const axis = (a.questions as unknown as { axis: string })?.axis;
        if (!axis) continue;
        if (!ageAxisWeight.has(s.age_range)) ageAxisWeight.set(s.age_range, new Map());
        const axisMap = ageAxisWeight.get(s.age_range)!;
        const existing = axisMap.get(axis) ?? { total: 0, count: 0 };
        existing.total += a.weight;
        existing.count++;
        axisMap.set(axis, existing);
      }
    }

    const importanceByAge = Array.from(ageAxisWeight.entries()).map(([age, axisMap]) => ({
      age_range: age,
      top_axes: Array.from(axisMap.entries())
        .map(([axis, { total, count }]) => ({ axis, avgWeight: Math.round((total / count) * 100) / 100 }))
        .sort((a, b) => b.avgWeight - a.avgWeight)
        .slice(0, 3),
    }));

    // Brecha generacional: diferencia de respuestas por eje entre jóvenes (18-24) y mayores (50+)
    const youngAnswers = new Map<string, number[]>();
    const olderAnswers = new Map<string, number[]>();
    for (const s of data) {
      const answers = s.answers as unknown as { value: number; weight: number; questions: { axis: string } }[];
      if (!answers) continue;
      const isYoung = s.age_range === '18-24';
      const isOlder = s.age_range === '50-64' || s.age_range === '65+';
      if (!isYoung && !isOlder) continue;
      const target = isYoung ? youngAnswers : olderAnswers;
      for (const a of answers) {
        const axis = (a.questions as unknown as { axis: string })?.axis;
        if (!axis) continue;
        const arr = target.get(axis) ?? [];
        arr.push(a.value);
        target.set(axis, arr);
      }
    }

    const generationalGap = Array.from(youngAnswers.entries()).map(([axis, young]) => {
      const older = olderAnswers.get(axis) ?? [];
      const youngMean = young.length > 0 ? young.reduce((a, b) => a + b, 0) / young.length : 0;
      const olderMean = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : 0;
      return {
        axis,
        young_mean: Math.round(youngMean * 100) / 100,
        older_mean: Math.round(olderMean * 100) / 100,
        gap: Math.round(Math.abs(youngMean - olderMean) * 100) / 100,
      };
    }).sort((a, b) => b.gap - a.gap);

    // Tasa de sorpresa por región
    const { data: surpriseData } = await db
      .from('sessions')
      .select('region, initial_preference, match_result_candidates(candidate_id, rank)')
      .eq('status', 'done')
      .not('initial_preference', 'in', '("undecided","blank","na")');

    const surpriseByRegion = new Map<string, { surprised: number; total: number }>();
    for (const s of surpriseData ?? []) {
      const candidates = s.match_result_candidates as { candidate_id: string; rank: number }[];
      const top = candidates?.find((c) => c.rank === 1);
      if (!top) continue;
      const existing = surpriseByRegion.get(s.region) ?? { surprised: 0, total: 0 };
      existing.total++;
      if (top.candidate_id !== s.initial_preference) existing.surprised++;
      surpriseByRegion.set(s.region, existing);
    }

    const surpriseRate = Array.from(surpriseByRegion.entries())
      .map(([region, { surprised, total }]) => ({
        region,
        surprise_pct: Math.round((surprised / total) * 1000) / 10,
        total,
      }))
      .sort((a, b) => b.surprise_pct - a.surprise_pct);

    return {
      importance_by_age: importanceByAge,
      generational_gap: generationalGap,
      surprise_by_region: surpriseRate,
    };
  }

  async getBlankVoteAnalysis() {
    const db = this.supabaseService.getClient();

    // Sesiones donde voto en blanco quedó #1
    const { data: blankWins } = await db
      .from('match_result_candidates')
      .select('session_id')
      .eq('candidate_id', 'c0')
      .eq('rank', 1);

    const blankSessionIds = (blankWins ?? []).map((b) => b.session_id);

    if (blankSessionIds.length === 0) {
      return { blank_wins: 0, message: 'Nadie ha sacado voto en blanco como #1 aún' };
    }

    // Perfil demográfico
    const { data: profiles } = await db
      .from('sessions')
      .select('age_range, region, gender')
      .in('id', blankSessionIds);

    const ageCounts: Record<string, number> = {};
    const regionCounts: Record<string, number> = {};
    for (const p of profiles ?? []) {
      ageCounts[p.age_range] = (ageCounts[p.age_range] ?? 0) + 1;
      regionCounts[p.region] = (regionCounts[p.region] ?? 0) + 1;
    }

    // Respuestas promedio de los que sacaron blanco
    const { data: blankAnswers } = await db
      .from('answers')
      .select('value, questions(axis)')
      .in('session_id', blankSessionIds);

    const axisMeans = new Map<string, { total: number; count: number }>();
    for (const a of blankAnswers ?? []) {
      const axis = (a.questions as unknown as { axis: string })?.axis;
      if (!axis) continue;
      const existing = axisMeans.get(axis) ?? { total: 0, count: 0 };
      existing.total += a.value;
      existing.count++;
      axisMeans.set(axis, existing);
    }

    const { count: totalDone } = await db.from('sessions').select('id', { count: 'exact', head: true }).eq('status', 'done');

    return {
      blank_wins: blankSessionIds.length,
      blank_pct: totalDone ? Math.round((blankSessionIds.length / totalDone) * 1000) / 10 : 0,
      profile: {
        by_age: Object.entries(ageCounts).sort((a, b) => b[1] - a[1]),
        by_region: Object.entries(regionCounts).sort((a, b) => b[1] - a[1]),
      },
      avg_responses_by_axis: Array.from(axisMeans.entries()).map(([axis, { total, count }]) => ({
        axis,
        avgValue: Math.round((total / count) * 100) / 100,
      })),
    };
  }

  async getPreferenceFlowDetailed() {
    const db = this.supabaseService.getClient();

    const { data } = await db
      .from('sessions')
      .select('initial_preference, match_result_candidates(candidate_id, rank, score)')
      .eq('status', 'done');

    if (!data || data.length === 0) return {};

    // Flujo detallado: de cada preferencia, a qué candidato va y con qué score promedio
    const flows = new Map<string, Map<string, { count: number; totalScore: number }>>();
    for (const s of data) {
      const candidates = s.match_result_candidates as { candidate_id: string; rank: number; score: number }[];
      const top = candidates?.find((c) => c.rank === 1);
      if (!top) continue;
      if (!flows.has(s.initial_preference)) flows.set(s.initial_preference, new Map());
      const destMap = flows.get(s.initial_preference)!;
      const existing = destMap.get(top.candidate_id) ?? { count: 0, totalScore: 0 };
      existing.count++;
      existing.totalScore += top.score;
      destMap.set(top.candidate_id, existing);
    }

    const flowResult = Array.from(flows.entries()).map(([from, destMap]) => {
      const total = Array.from(destMap.values()).reduce((a, b) => a + b.count, 0);
      const destinations = Array.from(destMap.entries())
        .map(([to, { count, totalScore }]) => ({
          candidateId: to,
          pct: Math.round((count / total) * 1000) / 10,
          count,
          avgScore: Math.round((totalScore / count) * 10) / 10,
        }))
        .sort((a, b) => b.pct - a.pct);

      const staysPct = destinations.find((d) => d.candidateId === from)?.pct ?? 0;

      return {
        fromPreference: from,
        total,
        stays_pct: staysPct,
        leaves_pct: Math.round((100 - staysPct) * 10) / 10,
        destinations,
      };
    }).sort((a, b) => b.total - a.total);

    return { preference_flow: flowResult };
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
          count,
        }))
        .sort((a, b) => b.pct - a.pct);
      return { fromCandidateId, fromTotal: total, to };
    });
  }
}
