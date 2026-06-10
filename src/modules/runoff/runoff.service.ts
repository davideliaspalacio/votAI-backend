import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../../supabase/supabase.service';
import { MatchScoringService, UserAnswer } from '../match/match-scoring.service';
import { AiSummarizerService } from '../match/ai-summarizer.service';
import { StartRunoffSessionDto } from './dto/start-runoff-session.dto';
import { SubmitRunoffMatchDto } from './dto/submit-runoff-match.dto';

// Candidatos que disputan la segunda vuelta: Cepeda (c1) y Abelardo (c2).
const RUNOFF_CANDIDATES = ['c1', 'c2'];
const INTENTION_SPECIALS = ['blank', 'undecided', 'na'];
const FIRST_ROUND_SPECIALS = ['blank', 'no_vote', 'na'];

@Injectable()
export class RunoffService {
  private readonly logger = new Logger(RunoffService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly scoringService: MatchScoringService,
    private readonly aiSummarizer: AiSummarizerService,
    private readonly configService: ConfigService,
    @InjectQueue('runoff-match') private readonly runoffQueue: Queue,
  ) {}

  // ----------------------- Sesión -----------------------

  async startSession(dto: StartRunoffSessionDto) {
    const db = this.supabaseService.getClient();

    // Intención de segunda vuelta: solo c1, c2 o valores especiales.
    if (
      !INTENTION_SPECIALS.includes(dto.runoff_intention) &&
      !RUNOFF_CANDIDATES.includes(dto.runoff_intention)
    ) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'INVALID_RUNOFF_INTENTION',
        message: `La intención "${dto.runoff_intention}" no es válida (use c1, c2, blank, undecided o na)`,
      });
    }

    // Voto de primera vuelta: candidato real (cualquiera) o valor especial.
    if (!FIRST_ROUND_SPECIALS.includes(dto.first_round_vote)) {
      const { data: candidate } = await db
        .from('candidates')
        .select('id')
        .eq('id', dto.first_round_vote)
        .single();

      if (!candidate) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'INVALID_FIRST_ROUND_VOTE',
          message: `El voto de primera vuelta "${dto.first_round_vote}" no es un candidato válido ni un valor especial (blank, no_vote, na)`,
        });
      }
    }

    const sessionId = randomUUID();

    const { error } = await db.from('sv_sessions').insert({
      id: sessionId,
      age_range: dto.age_range,
      region: dto.region,
      gender: dto.gender ?? 'na',
      estrato: dto.estrato,
      academic_level: dto.academic_level,
      first_round_vote: dto.first_round_vote,
      runoff_intention: dto.runoff_intention,
      status: 'created',
    });

    if (error) throw error;

    return { sessionId };
  }

  async deleteSession(sessionId: string) {
    const db = this.supabaseService.getClient();

    const { data: session } = await db
      .from('sv_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'SESSION_NOT_FOUND',
        message: `Sesión "${sessionId}" no encontrada`,
      });
    }

    const { error } = await db
      .from('sv_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }

  // ---------------------- Preguntas ---------------------

  /**
   * Retorna las preguntas del test de segunda vuelta (1 por eje) asignadas a la
   * sesión. Idempotente: si la sesión ya tiene preguntas asignadas, las repite.
   */
  async getQuestionsForSession(sessionId: string) {
    const db = this.supabaseService.getClient();

    const { data: session, error: sessErr } = await db
      .from('sv_sessions')
      .select('id, status, assigned_questions')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'SESSION_NOT_FOUND',
        message: `Sesión "${sessionId}" no encontrada`,
      });
    }

    if (!['created', 'answering'].includes(session.status)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'SESSION_INVALID_STATUS',
        message: 'La sesión ya fue procesada',
      });
    }

    if (session.assigned_questions && session.assigned_questions.length > 0) {
      return this.fetchQuestionsByIds(session.assigned_questions);
    }

    const { data: allQuestions, error: qErr } = await db
      .from('sv_questions')
      .select('id, text, axis, context, options')
      .eq('active', true);

    if (qErr) throw qErr;

    // Agrupar por eje y elegir 1 pregunta aleatoria por eje.
    const byAxis = new Map<string, typeof allQuestions>();
    for (const q of allQuestions ?? []) {
      const existing = byAxis.get(q.axis) ?? [];
      existing.push(q);
      byAxis.set(q.axis, existing);
    }

    const selected: { id: string; text: string; axis: string; context: string | null }[] =
      [];
    for (const [, questions] of byAxis) {
      const randomIndex = Math.floor(Math.random() * questions.length);
      selected.push(questions[randomIndex]);
    }

    if (selected.length < 10) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'INSUFFICIENT_QUESTIONS',
        message: `Solo hay ${selected.length} ejes con preguntas activas, se necesitan 10`,
      });
    }

    const assignedIds = selected.map((q) => q.id);
    await db
      .from('sv_sessions')
      .update({ assigned_questions: assignedIds, status: 'answering' })
      .eq('id', sessionId);

    return { questions: selected.map((q) => this.mapQuestion(q)) };
  }

  private async fetchQuestionsByIds(ids: string[]) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('sv_questions')
      .select('id, text, axis, context, options')
      .in('id', ids);

    if (error) throw error;

    return { questions: (data ?? []).map((q) => this.mapQuestion(q)) };
  }

  private mapQuestion(q: Record<string, unknown>) {
    return {
      id: q.id as string,
      text: q.text as string,
      axis: q.axis as string,
      context: (q.context as string | null) ?? undefined,
      options:
        (q.options as { label: string; value: number }[] | null) ?? undefined,
    };
  }

  // ------------------------ Match -----------------------

  async submit(dto: SubmitRunoffMatchDto) {
    const db = this.supabaseService.getClient();

    const { data: session, error: sessErr } = await db
      .from('sv_sessions')
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

    const questionIds = dto.answers.map((a) => a.questionId);
    if (new Set(questionIds).size !== questionIds.length) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'DUPLICATE_ANSWERS',
        message: 'No se permiten respuestas duplicadas para la misma pregunta',
      });
    }

    // Validar contra preguntas ASIGNADAS a esta sesión (anti-bot).
    const assignedQuestions: string[] = session.assigned_questions ?? [];

    if (assignedQuestions.length > 0) {
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
      const { data: activeQuestions } = await db
        .from('sv_questions')
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

    const answersToInsert = dto.answers.map((a) => ({
      session_id: dto.sessionId,
      question_id: a.questionId,
      value: a.value,
      weight: a.weight,
    }));

    const { error: insErr } = await db
      .from('sv_answers')
      .insert(answersToInsert);
    if (insErr) throw insErr;

    await db
      .from('sv_sessions')
      .update({ status: 'processing' })
      .eq('id', dto.sessionId);

    await this.runoffQueue.add(
      'calculate',
      { sessionId: dto.sessionId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    return { status: 'processing' };
  }

  async getResult(sessionId: string) {
    const db = this.supabaseService.getClient();

    const { data: session, error: sessErr } = await db
      .from('sv_sessions')
      .select('id, status, runoff_intention, first_round_vote, vote_choice')
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

    const { data: matchResult } = await db
      .from('sv_match_results')
      .select('preference_match, ai_enriched_at')
      .eq('session_id', sessionId)
      .single();

    const { data: candidates } = await db
      .from('sv_match_result_candidates')
      .select('candidate_id, score, rank, summary')
      .eq('session_id', sessionId)
      .order('rank', { ascending: true });

    const { data: axes } = await db
      .from('sv_match_result_axes')
      .select(
        'candidate_id, axis, user_stance, candidate_stance, quote, program_page',
      )
      .eq('session_id', sessionId);

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

    // % de voto en blanco: temas donde eligió la opción neutral (value 4),
    // es decir, "ninguno de los dos planes".
    const { data: answerRows } = await db
      .from('sv_answers')
      .select('value')
      .eq('session_id', sessionId);
    const totalAns = answerRows?.length ?? 0;
    const blankAns = (answerRows ?? []).filter((a) => a.value === 4).length;
    const blankPct = totalAns > 0 ? Math.round((blankAns / totalAns) * 100) : 0;

    // Cada plan reporta su afinidad REAL por distancia (0-100), medida de forma
    // independiente: refleja qué tan alineado estás con CADA plan por separado.
    // El voto en blanco es un dato aparte (% de temas neutrales). Como son
    // medidas distintas, los tres NO se reparten un único 100% — pueden sumar
    // más de 100 (p.ej. afín a ambos planes a la vez). No se normaliza.

    return {
      status: 'done',
      runoff_intention: session.runoff_intention,
      first_round_vote: session.first_round_vote,
      results,
      preference_match: matchResult?.preference_match ?? false,
      ai_enriched: matchResult?.ai_enriched_at != null,
      vote_choice: session.vote_choice ?? null,
      blank_pct: blankPct,
    };
  }

  async calculate(sessionId: string) {
    const db = this.supabaseService.getClient();

    try {
      const { data: answers, error: ansErr } = await db
        .from('sv_answers')
        .select('question_id, value, weight')
        .eq('session_id', sessionId);

      if (ansErr) throw new Error(`Error trayendo answers: ${ansErr.message}`);
      if (!answers || answers.length === 0) {
        throw new Error('No se encontraron respuestas para la sesión');
      }

      const questionIds = answers.map((a) => a.question_id);
      const { data: questions, error: qErr } = await db
        .from('sv_questions')
        .select('id, axis')
        .in('id', questionIds);

      if (qErr) throw new Error(`Error trayendo questions: ${qErr.message}`);

      const questionAxisMap = new Map(
        (questions ?? []).map((q) => [q.id, q.axis as string]),
      );

      const { data: session } = await db
        .from('sv_sessions')
        .select('runoff_intention')
        .eq('id', sessionId)
        .single();

      const { data: positions } = await db
        .from('sv_candidate_positions')
        .select('candidate_id, axis, summary, quote, program_page, stance_score');

      if (!positions || positions.length === 0) {
        throw new Error('No se encontraron posiciones de candidatos');
      }

      const candidatePositions = new Map<string, Map<string, number>>();
      const candidatePositionDetails = new Map<
        string,
        Map<
          string,
          { summary: string; quote: string; programPage?: number; stanceScore: number }
        >
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

      const userAnswers: UserAnswer[] = answers.map((a) => ({
        questionId: a.question_id,
        axis: questionAxisMap.get(a.question_id) ?? '',
        value: a.value,
        weight: a.weight,
      }));

      const scores = this.scoringService.calculate(userAnswers, candidatePositions);

      const preferenceMatch =
        session?.runoff_intention === scores[0]?.candidateId;

      await db.from('sv_match_results').insert({
        session_id: sessionId,
        preference_match: preferenceMatch,
      });

      const candidateRows = scores.map((s) => ({
        session_id: sessionId,
        candidate_id: s.candidateId,
        score: s.score,
        rank: s.rank,
        summary: '',
      }));
      await db.from('sv_match_result_candidates').insert(candidateRows);

      // Solo hay 2 candidatos: se insertan los ejes de ambos.
      const axisRows: {
        session_id: string;
        candidate_id: string;
        axis: string;
        user_stance: string;
        candidate_stance: string;
        quote: string;
        program_page: number | null;
      }[] = [];

      for (const score of scores) {
        const posDetails = candidatePositionDetails.get(score.candidateId);
        if (!posDetails) continue;
        for (const [axis, detail] of posDetails) {
          axisRows.push({
            session_id: sessionId,
            candidate_id: score.candidateId,
            axis,
            user_stance: '',
            candidate_stance: detail.summary,
            quote: detail.quote,
            program_page: detail.programPage ?? null,
          });
        }
      }

      if (axisRows.length > 0) {
        await db.from('sv_match_result_axes').insert(axisRows);
      }

      await db
        .from('sv_sessions')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', sessionId);

      this.logger.log(`Match de segunda vuelta calculado para sesión ${sessionId}`);
    } catch (error) {
      this.logger.error(
        `Error calculando match de segunda vuelta para ${sessionId}: ${error}`,
      );

      // Vuelve a processing para el retry de Bull.
      await db
        .from('sv_sessions')
        .update({ status: 'processing' })
        .eq('id', sessionId);

      throw error;
    }
  }

  // ------------------ Enriquecimiento IA ----------------

  async enrichWithAi(
    sessionId: string,
  ): Promise<{ enriched: boolean; cached?: boolean; reason?: string }> {
    const db = this.supabaseService.getClient();

    const { data: session } = await db
      .from('sv_sessions')
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

    const { data: existing } = await db
      .from('sv_match_results')
      .select('ai_enriched_at')
      .eq('session_id', sessionId)
      .single();
    if (existing?.ai_enriched_at) {
      return { enriched: true, cached: true };
    }

    const useAi = this.configService.get<string>('USE_AI_SUMMARIES', 'true');
    if (useAi === 'false') {
      return { enriched: false, reason: 'disabled' };
    }

    const { data: answers } = await db
      .from('sv_answers')
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
      .from('sv_questions')
      .select('id, axis')
      .in('id', questionIds);
    const qMap = new Map((questions ?? []).map((q) => [q.id, q.axis as string]));

    const userAnswers: UserAnswer[] = answers.map((a) => ({
      questionId: a.question_id,
      axis: qMap.get(a.question_id) ?? '',
      value: a.value,
      weight: a.weight,
    }));

    // Ambos candidatos (la segunda vuelta es solo Cepeda vs Abelardo).
    const { data: resultCandidates } = await db
      .from('sv_match_result_candidates')
      .select('candidate_id, score, rank')
      .eq('session_id', sessionId)
      .order('rank', { ascending: true });

    if (!resultCandidates || resultCandidates.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'NO_RESULTS',
        message: 'No se encontraron resultados para la sesión',
      });
    }

    const { data: positions } = await db
      .from('sv_candidate_positions')
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

    const scores = this.scoringService.calculate(userAnswers, candidatePositions);
    const scoreById = new Map(scores.map((s) => [s.candidateId, s]));

    const candidateIds = resultCandidates.map((c) => c.candidate_id);
    const { data: candidateNames } = await db
      .from('candidates')
      .select('id, name')
      .in('id', candidateIds);
    const nameMap = new Map((candidateNames ?? []).map((c) => [c.id, c.name]));

    const userStancesAi = await this.aiSummarizer.generateUserStances(
      userAnswers.map((a) => ({ axis: a.axis, value: a.value, weight: a.weight })),
    );

    const candidateSummaries = await Promise.all(
      resultCandidates.map(async (c) => {
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

    for (const [axis, stance] of userStancesAi) {
      await db
        .from('sv_match_result_axes')
        .update({ user_stance: stance })
        .eq('session_id', sessionId)
        .eq('axis', axis);
    }

    for (const { candidateId, summary } of candidateSummaries) {
      if (!summary) continue;
      await db
        .from('sv_match_result_candidates')
        .update({ summary })
        .eq('session_id', sessionId)
        .eq('candidate_id', candidateId);
    }

    // UPDATE condicional: solo escribe si sigue NULL (idempotente contra carrera).
    const { data: marked } = await db
      .from('sv_match_results')
      .update({ ai_enriched_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .is('ai_enriched_at', null)
      .select('ai_enriched_at')
      .maybeSingle();

    if (!marked) {
      this.logger.warn(
        `Match de segunda vuelta ${sessionId} ya fue enriquecido por otra request paralela`,
      );
      return { enriched: true, cached: true };
    }

    this.logger.log(
      `Match de segunda vuelta enriquecido con IA para sesión ${sessionId}`,
    );
    return { enriched: true, cached: false };
  }

  // ------------------ Feedback opcional ----------------

  /** Guarda (opcional) si la persona se va por afinidad o por intención de voto. */
  async submitVoteFeedback(
    sessionId: string,
    voteChoice: 'affinity' | 'intention',
  ): Promise<{ saved: boolean }> {
    const db = this.supabaseService.getClient();

    const { data: session } = await db
      .from('sv_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();
    if (!session) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'SESSION_NOT_FOUND',
        message: `Sesión "${sessionId}" no encontrada`,
      });
    }

    const { error } = await db
      .from('sv_sessions')
      .update({ vote_choice: voteChoice })
      .eq('id', sessionId);
    if (error) throw error;

    return { saved: true };
  }
}
