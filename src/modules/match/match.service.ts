import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
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
      .select('preference_match')
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

      // Generar stances del usuario (una vez, se reusan para todos los candidatos)
      const userStances = await this.aiSummarizer.generateUserStances(
        userAnswers.map((a) => ({ axis: a.axis, value: a.value, weight: a.weight })),
      );

      // Generar resúmenes para top 3 con IA, template para el resto
      const summaries = new Map<string, string>();

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

      // Top 3: generar resúmenes con IA EN PARALELO
      const top3 = summaryInputs.filter((s) => s.score.rank <= 3);
      const top3Results = await Promise.all(
        top3.map((s) =>
          this.aiSummarizer.generateCandidateSummary({
            candidateName: nameMap.get(s.score.candidateId) ?? s.score.candidateId,
            score: s.score.score,
            answers: userAnswers.map((a) => ({ axis: a.axis, value: a.value, weight: a.weight })),
            positions: s.posArray,
            topAxes: s.topAxes,
            bottomAxes: s.bottomAxes,
          }),
        ),
      );
      top3.forEach((s, i) => summaries.set(s.score.candidateId, top3Results[i]));

      // Rank 4+: templates rápidos sin IA
      for (const s of summaryInputs.filter((s) => s.score.rank > 3)) {
        const name = nameMap.get(s.score.candidateId) ?? s.score.candidateId;
        const topLabel = s.topAxes.join(' y ');
        const bottomLabel = s.bottomAxes.join(' y ');
        let template: string;
        if (s.score.score >= 70) {
          template = `Alta afinidad programática con ${name}. Mayor coincidencia en ${topLabel}.`;
        } else if (s.score.score >= 40) {
          template = `Afinidad moderada con ${name}. Coincidencia parcial en ${topLabel}, diferencias en ${bottomLabel}.`;
        } else {
          template = `Baja afinidad programática con ${name}. Las mayores diferencias están en ${bottomLabel}.`;
        }
        summaries.set(s.score.candidateId, template);
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
}
