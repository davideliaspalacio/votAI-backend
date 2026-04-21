import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class QuestionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Retorna 10 preguntas aleatorias (1 por eje) asignadas a una sesión.
   * Si la sesión ya tiene preguntas asignadas, retorna las mismas (idempotente).
   */
  async getQuestionsForSession(sessionId: string) {
    const db = this.supabaseService.getClient();

    // Verificar sesión
    const { data: session, error: sessErr } = await db
      .from('sessions')
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

    // Si ya tiene preguntas asignadas, retornar esas (idempotente)
    if (session.assigned_questions && session.assigned_questions.length > 0) {
      return this.fetchQuestionsByIds(session.assigned_questions);
    }

    // Traer todas las preguntas activas
    const { data: allQuestions, error: qErr } = await db
      .from('questions')
      .select('id, text, axis, context')
      .eq('active', true);

    if (qErr) throw qErr;

    // Agrupar por eje
    const byAxis = new Map<string, typeof allQuestions>();
    for (const q of allQuestions ?? []) {
      const existing = byAxis.get(q.axis) ?? [];
      existing.push(q);
      byAxis.set(q.axis, existing);
    }

    // Elegir 1 pregunta aleatoria por eje
    const selected: { id: string; text: string; axis: string; context: string | null }[] = [];
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

    // Guardar IDs asignados en la sesión
    const assignedIds = selected.map((q) => q.id);
    await db
      .from('sessions')
      .update({
        assigned_questions: assignedIds,
        status: 'answering',
      })
      .eq('id', sessionId);

    return {
      questions: selected.map((q) => ({
        id: q.id,
        text: q.text,
        axis: q.axis,
        context: q.context ?? undefined,
      })),
    };
  }

  private async fetchQuestionsByIds(ids: string[]) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('questions')
      .select('id, text, axis, context')
      .in('id', ids);

    if (error) throw error;

    return {
      questions: (data ?? []).map((q) => ({
        id: q.id,
        text: q.text,
        axis: q.axis,
        context: q.context ?? undefined,
      })),
    };
  }

  /** Retorna todas las preguntas activas (uso interno / admin) */
  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('questions')
      .select('id, text, axis, context')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return {
      questions: (data ?? []).map((q) => ({
        id: q.id,
        text: q.text,
        axis: q.axis,
        context: q.context ?? undefined,
      })),
    };
  }
}
