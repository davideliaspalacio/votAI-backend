import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';
import { SubmitMatchDto } from './dto/submit-match.dto';
import { MatchScoringService, UserAnswer } from './match-scoring.service';
import { AiSummarizerService } from './ai-summarizer.service';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly scoringService: MatchScoringService,
    private readonly aiSummarizer: AiSummarizerService,
    private readonly configService: ConfigService,
    @InjectQueue('match') private readonly matchQueue: Queue,
  ) {}

  async submit(dto: SubmitMatchDto) {
    const db = this.supabaseService.getClient();

    // Validar sesión y traer preguntas asignadas
    const { data: session, error: sessErr } = await db
      .from('sessions')
      .select('id, status, assigned_questions')
      .eq('id', dto.sessionId)
      .single();

    if (sessErr || !session) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'SESSION_NOT_FOUND',
        message: `Sesión "${dto.sessionId}" no encontrada`,
      });
    }

    if (!['created', 'answering'].includes(session.status)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'SESSION_INVALID_STATUS',
        message: `La sesión ya fue procesada (status: ${session.status})`,
      });
    }

    // Validar que no haya questionIds duplicados
    const questionIds = dto.answers.map((a) => a.questionId);
    if (new Set(questionIds).size !== questionIds.length) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'DUPLICATE_ANSWERS',
        message: 'No se permiten respuestas duplicadas para la misma pregunta',
      });
    }

    // Validar contra preguntas ASIGNADAS a esta sesión (anti-bot)
    const assignedQuestions: string[] = session.assigned_questions ?? [];

    if (assignedQuestions.length > 0) {
      // Sesión tiene preguntas asignadas — validar que coincidan exactamente
      const assignedSet = new Set(assignedQuestions);
      for (const qId of questionIds) {
        if (!assignedSet.has(qId)) {
          throw new BadRequestException({
            statusCode: 400,
            error: 'QUESTION_NOT_ASSIGNED',
            message: `Pregunta "${qId}" no fue asignada a esta sesión`,
          });
        }
      }
    } else {
      // Fallback: sesión sin preguntas asignadas (compatibilidad)
      const { data: activeQuestions } = await db
        .from('questions')
        .select('id')
        .eq('active', true);

      const activeIds = new Set((activeQuestions ?? []).map((q) => q.id));
      for (const qId of questionIds) {
        if (!activeIds.has(qId)) {
          throw new BadRequestException({
            statusCode: 400,
            error: 'INVALID_QUESTION',
            message: `Pregunta "${qId}" no existe o no está activa`,
          });
        }
      }
    }

    // Guardar answers
    const answersToInsert = dto.answers.map((a) => ({
      session_id: dto.sessionId,
      question_id: a.questionId,
      value: a.value,
      weight: a.weight,
    }));

    const { error: insErr } = await db.from('answers').insert(answersToInsert);
    if (insErr) throw insErr;

    // Cambiar status
    await db
      .from('sessions')
      .update({ status: 'processing' })
      .eq('id', dto.sessionId);

    // Encolar job
    await this.matchQueue.add(
      'calculate',
      { sessionId: dto.sessionId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    return { status: 'processing' };
  }

  async getResult(sessionId: string) {
    const db = this.supabaseService.getClient();

    const { data: session, error: sessErr } = await db
      .from('sessions')
      .select('id, status, initial_preference')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'SESSION_NOT_FOUND',
        message: `Sesión "${sessionId}" no encontrada`,
      });
    }

    if (session.status !== 'done') {
      return { status: session.status as string };
    }

    // Traer resultados
    const { data: matchResult } = await db
      .from('match_results')
      .select('preference_match, ai_enriched_at')
      .eq('session_id', sessionId)
      .single();

    const { data: candidates } = await db
      .from('match_result_candidates')
      .select('candidate_id, score, rank, summary')
      .eq('session_id', sessionId)
      .order('rank', { ascending: true });

    const { data: axes } = await db
      .from('match_result_axes')
      .select('candidate_id, axis, user_stance, candidate_stance, quote, program_page')
      .eq('session_id', sessionId);

    // Agrupar ejes por candidato
    const axesByCandidate = new Map<string, typeof axes>();
    for (const ax of axes ?? []) {
      const existing = axesByCandidate.get(ax.candidate_id) ?? [];
      existing.push(ax);
      axesByCandidate.set(ax.candidate_id, existing);
    }

    const results = (candidates ?? []).map((c) => ({
      candidateId: c.candidate_id,
      score: c.score,
      summary: c.summary,
      byAxis: (axesByCandidate.get(c.candidate_id) ?? []).map((ax) => ({
        axis: ax.axis,
        userStance: ax.user_stance,
        candidateStance: ax.candidate_stance,
        quote: ax.quote,
        programPage: ax.program_page ?? undefined,
      })),
    }));

    return {
      status: 'done',
      initial_preference: session.initial_preference,
      results,
      preference_match: matchResult?.preference_match ?? false,
      ai_enriched: matchResult?.ai_enriched_at != null,
    };
  }

  async calculate(sessionId: string) {
    const db = this.supabaseService.getClient();

    try {
      // Traer answers
      const { data: answers, error: ansErr } = await db
        .from('answers')
        .select('question_id, value, weight')
        .eq('session_id', sessionId);

      if (ansErr) {
        throw new Error(`Error trayendo answers: ${ansErr.message}`);
      }

      if (!answers || answers.length === 0) {
        throw new Error('No se encontraron respuestas para la sesión');
      }

      // Traer preguntas para obtener el axis de cada una
      const questionIds = answers.map((a) => a.question_id);
      const { data: questions, error: qErr } = await db
        .from('questions')
        .select('id, axis')
        .in('id', questionIds);

      if (qErr) {
        throw new Error(`Error trayendo questions: ${qErr.message}`);
      }

      const questionAxisMap = new Map(
        (questions ?? []).map((q) => [q.id, q.axis as string]),
      );

      // Traer session
      const { data: session } = await db
        .from('sessions')
        .select('initial_preference')
        .eq('id', sessionId)
        .single();

      // Traer todas las posiciones
      const { data: positions } = await db
        .from('candidate_positions')
        .select('candidate_id, axis, summary, quote, program_page, stance_score');

      if (!positions || positions.length === 0) {
        throw new Error('No se encontraron posiciones de candidatos');
      }

      // Construir mapa de posiciones: candidateId → axis → stance_score
      const candidatePositions = new Map<string, Map<string, number>>();
      const candidatePositionDetails = new Map<
        string,
        Map<string, { summary: string; quote: string; programPage?: number; stanceScore: number }>
      >();

      for (const pos of positions) {
        if (!candidatePositions.has(pos.candidate_id)) {
          candidatePositions.set(pos.candidate_id, new Map());
          candidatePositionDetails.set(pos.candidate_id, new Map());
        }
        candidatePositions.get(pos.candidate_id)!.set(pos.axis, pos.stance_score);
        candidatePositionDetails.get(pos.candidate_id)!.set(pos.axis, {
          summary: pos.summary,
          quote: pos.quote,
          programPage: pos.program_page ?? undefined,
          stanceScore: pos.stance_score,
        });
      }

      // Preparar respuestas del usuario
      const userAnswers: UserAnswer[] = answers.map((a) => ({
        questionId: a.question_id,
        axis: questionAxisMap.get(a.question_id) ?? '',
        value: a.value,
        weight: a.weight,
      }));

      // Calcular scores
      const scores = this.scoringService.calculate(userAnswers, candidatePositions);

      // User stances con templates locales (sin IA — la IA se hace bajo demanda vía enrichWithAi)
      const userStances = new Map<string, string>();
      for (const a of userAnswers) {
        userStances.set(a.axis, this.aiSummarizer.templateStance(a.axis, a.value));
      }

      // Traer nombres de candidatos
      const { data: candidateNames } = await db
        .from('candidates')
        .select('id, name');
      const nameMap = new Map((candidateNames ?? []).map((c) => [c.id, c.name]));

      // Preparar datos para resúmenes
      const summaryInputs = scores.map((score) => {
        const axisDistSorted = [...score.axisDistances].sort(
          (a, b) => b.similarity - a.similarity,
        );
        const topAxes = axisDistSorted.slice(0, 2).map((a) => a.axis);
        const bottomAxes = axisDistSorted.slice(-2).map((a) => a.axis);
        const posDetails = candidatePositionDetails.get(score.candidateId);
        const posArray = posDetails
          ? Array.from(posDetails.entries()).map(([axis, detail]) => ({
              axis,
              stanceScore: detail.stanceScore,
              summary: detail.summary,
            }))
          : [];
        return { score, topAxes, bottomAxes, posArray };
      });

      // Summaries con templates locales para TODOS los candidatos (sin IA)
      const summaries = new Map<string, string>();
      for (const s of summaryInputs) {
        const name = nameMap.get(s.score.candidateId) ?? s.score.candidateId;
        summaries.set(
          s.score.candidateId,
          this.aiSummarizer.templateSummary({
            candidateName: name,
            score: s.score.score,
            answers: userAnswers.map((a) => ({
              axis: a.axis,
              value: a.value,
              weight: a.weight,
            })),
            positions: s.posArray,
            topAxes: s.topAxes,
            bottomAxes: s.bottomAxes,
          }),
        );
      }

      // Determinar preference_match
      const preferenceMatch =
        session?.initial_preference === scores[0]?.candidateId;

      // Insertar match_results
      await db.from('match_results').insert({
        session_id: sessionId,
        preference_match: preferenceMatch,
      });

      // Insertar match_result_candidates
      const candidateRows = scores.map((s) => ({
        session_id: sessionId,
        candidate_id: s.candidateId,
        score: s.score,
        rank: s.rank,
        summary: summaries.get(s.candidateId) ?? '',
      }));
      await db.from('match_result_candidates').insert(candidateRows);

      // Insertar match_result_axes para top 3
      const axisRows: {
        session_id: string;
        candidate_id: string;
        axis: string;
        user_stance: string;
        candidate_stance: string;
        quote: string;
        program_page: number | null;
      }[] = [];

      // Top 3 + candidato elegido (si no está en top 3)
      const initialPref = session?.initial_preference;
      const axesCandidates = scores.filter((s) =>
        s.rank <= 3 ||
        (initialPref && s.candidateId === initialPref),
      );

      for (const score of axesCandidates) {
        const posDetails = candidatePositionDetails.get(score.candidateId);
        if (!posDetails) continue;

        for (const [axis, detail] of posDetails) {
          axisRows.push({
            session_id: sessionId,
            candidate_id: score.candidateId,
            axis,
            user_stance: userStances.get(axis) ?? '',
            candidate_stance: detail.summary,
            quote: detail.quote,
            program_page: detail.programPage ?? null,
          });
        }
      }

      if (axisRows.length > 0) {
        await db.from('match_result_axes').insert(axisRows);
      }

      // Actualizar status de la sesión
      await db
        .from('sessions')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', sessionId);

      this.logger.log(`Match calculado para sesión ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error calculando match para ${sessionId}: ${error}`);

      // Marcar sesión con error (vuelve a processing para retry de Bull)
      await db
        .from('sessions')
        .update({ status: 'processing' })
        .eq('id', sessionId);

      throw error;
    }
  }

  async enrichWithAi(
    sessionId: string,
  ): Promise<{ enriched: boolean; cached?: boolean; reason?: string }> {
    const db = this.supabaseService.getClient();

    // 1. Validar sesión done
    const { data: session } = await db
      .from('sessions')
      .select('id, status')
      .eq('id', sessionId)
      .single();
    if (!session || session.status !== 'done') {
      throw new BadRequestException({
        statusCode: 400,
        error: 'SESSION_NOT_READY',
        message: 'La sesión no está terminada',
      });
    }

    // 2. Cache: si ya fue enriquecido, no llamar Claude de nuevo
    const { data: existing } = await db
      .from('match_results')
      .select('ai_enriched_at')
      .eq('session_id', sessionId)
      .single();
    if (existing?.ai_enriched_at) {
      return { enriched: true, cached: true };
    }

    // 3. Freno de emergencia: si USE_AI_SUMMARIES=false, no llamar Claude
    const useAi = this.configService.get<string>('USE_AI_SUMMARIES', 'true');
    if (useAi === 'false') {
      return { enriched: false, reason: 'disabled' };
    }

    // 4. Releer contexto necesario
    const { data: answers } = await db
      .from('answers')
      .select('question_id, value, weight')
      .eq('session_id', sessionId);

    if (!answers || answers.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'NO_ANSWERS',
        message: 'No se encontraron respuestas para la sesión',
      });
    }

    const questionIds = answers.map((a) => a.question_id);
    const { data: questions } = await db
      .from('questions')
      .select('id, axis')
      .in('id', questionIds);
    const qMap = new Map(
      (questions ?? []).map((q) => [q.id, q.axis as string]),
    );

    const userAnswers: UserAnswer[] = answers.map((a) => ({
      questionId: a.question_id,
      axis: qMap.get(a.question_id) ?? '',
      value: a.value,
      weight: a.weight,
    }));

    // 5. Top 3 candidatos
    const { data: top3 } = await db
      .from('match_result_candidates')
      .select('candidate_id, score, rank')
      .eq('session_id', sessionId)
      .lte('rank', 3)
      .order('rank', { ascending: true });

    if (!top3 || top3.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'NO_RESULTS',
        message: 'No se encontraron resultados para la sesión',
      });
    }

    // 6. Releer candidate_positions (necesario para topAxes/bottomAxes vía recálculo de scoring)
    const { data: positions } = await db
      .from('candidate_positions')
      .select('candidate_id, axis, summary, stance_score');

    if (!positions || positions.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'NO_POSITIONS',
        message: 'No se encontraron posiciones de candidatos',
      });
    }

    const candidatePositions = new Map<string, Map<string, number>>();
    const candidatePositionSummaries = new Map<
      string,
      Map<string, { summary: string; stanceScore: number }>
    >();
    for (const pos of positions) {
      if (!candidatePositions.has(pos.candidate_id)) {
        candidatePositions.set(pos.candidate_id, new Map());
        candidatePositionSummaries.set(pos.candidate_id, new Map());
      }
      candidatePositions.get(pos.candidate_id)!.set(pos.axis, pos.stance_score);
      candidatePositionSummaries.get(pos.candidate_id)!.set(pos.axis, {
        summary: pos.summary,
        stanceScore: pos.stance_score,
      });
    }

    // 7. Recalcular scoring para reconstruir axisDistances
    const scores = this.scoringService.calculate(userAnswers, candidatePositions);
    const scoreById = new Map(scores.map((s) => [s.candidateId, s]));

    // 8. Nombres de candidatos top 3
    const top3Ids = top3.map((c) => c.candidate_id);
    const { data: candidateNames } = await db
      .from('candidates')
      .select('id, name')
      .in('id', top3Ids);
    const nameMap = new Map(
      (candidateNames ?? []).map((c) => [c.id, c.name]),
    );

    // 9. Llamar Claude
    const userStancesAi = await this.aiSummarizer.generateUserStances(
      userAnswers.map((a) => ({
        axis: a.axis,
        value: a.value,
        weight: a.weight,
      })),
    );

    const top3Summaries = await Promise.all(
      top3.map(async (c) => {
        const score = scoreById.get(c.candidate_id);
        if (!score) return { candidateId: c.candidate_id, summary: '' };
        const axisDistSorted = [...score.axisDistances].sort(
          (a, b) => b.similarity - a.similarity,
        );
        const topAxes = axisDistSorted.slice(0, 2).map((a) => a.axis);
        const bottomAxes = axisDistSorted.slice(-2).map((a) => a.axis);
        const posDetails = candidatePositionSummaries.get(c.candidate_id);
        const posArray = posDetails
          ? Array.from(posDetails.entries()).map(([axis, detail]) => ({
              axis,
              stanceScore: detail.stanceScore,
              summary: detail.summary,
            }))
          : [];
        const summary = await this.aiSummarizer.generateCandidateSummary({
          candidateName: nameMap.get(c.candidate_id) ?? c.candidate_id,
          score: score.score,
          answers: userAnswers.map((a) => ({
            axis: a.axis,
            value: a.value,
            weight: a.weight,
          })),
          positions: posArray,
          topAxes,
          bottomAxes,
        });
        return { candidateId: c.candidate_id, summary };
      }),
    );

    // 10. UPDATE en DB
    for (const [axis, stance] of userStancesAi) {
      await db
        .from('match_result_axes')
        .update({ user_stance: stance })
        .eq('session_id', sessionId)
        .eq('axis', axis);
    }

    for (const { candidateId, summary } of top3Summaries) {
      if (!summary) continue;
      await db
        .from('match_result_candidates')
        .update({ summary })
        .eq('session_id', sessionId)
        .eq('candidate_id', candidateId);
    }

    await db
      .from('match_results')
      .update({ ai_enriched_at: new Date().toISOString() })
      .eq('session_id', sessionId);

    this.logger.log(`Match enriquecido con IA para sesión ${sessionId}`);
    return { enriched: true, cached: false };
  }
}
