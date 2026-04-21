import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { SupabaseService } from '../../supabase/supabase.service';
import { PdfParserService, PdfChunk } from './pdf-parser.service';
import { classifyChunkPrompt } from './prompts/classify-chunk.prompt';
import {
  determineStancePrompt,
  AXIS_SPECTRUMS,
} from './prompts/determine-stance.prompt';

const VALID_AXES = Object.keys(AXIS_SPECTRUMS);

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly anthropic: Anthropic;
  private readonly classificationModel: string;
  private readonly stanceModel: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly pdfParser: PdfParserService,
    private readonly configService: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
    this.classificationModel = this.configService.get<string>(
      'CLASSIFICATION_MODEL',
      'claude-haiku-4-5-20251001',
    );
    this.stanceModel = this.configService.get<string>(
      'STANCE_MODEL',
      'claude-sonnet-4-6',
    );
  }

  async ingestCandidate(candidateId: string, pdfPath: string) {
    const db = this.supabaseService.getClient();

    // Verificar candidato
    const { data: candidate } = await db
      .from('candidates')
      .select('id, name')
      .eq('id', candidateId)
      .single();

    if (!candidate) {
      throw new Error(`Candidato "${candidateId}" no encontrado`);
    }

    this.logger.log(
      `Iniciando ingesta para ${candidate.name} (${candidateId})`,
    );

    // Descargar PDF de Supabase Storage
    const bucket = this.configService.get<string>('PROGRAMS_BUCKET', 'programs');
    const { data: fileData, error: downloadError } = await db.storage
      .from(bucket)
      .download(pdfPath);

    if (downloadError || !fileData) {
      throw new Error(
        `Error descargando PDF "${pdfPath}": ${downloadError?.message}`,
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Parsear PDF
    const chunks = await this.pdfParser.parseBuffer(buffer);
    this.logger.log(`${chunks.length} chunks extraídos del PDF`);

    // Paso 1: Clasificar cada chunk por eje
    const chunksByAxis = await this.classifyChunks(chunks);

    // Paso 2: Para cada eje con chunks, determinar stance
    for (const axis of VALID_AXES) {
      const axisChunks = chunksByAxis.get(axis);
      if (!axisChunks || axisChunks.length === 0) {
        this.logger.warn(
          `No se encontraron chunks para eje "${axis}" del candidato ${candidateId}`,
        );
        continue;
      }

      const stance = await this.determineStance(
        candidate.name,
        axis,
        axisChunks,
      );

      // Guardar en draft
      await db.from('candidate_positions_draft').upsert(
        {
          candidate_id: candidateId,
          axis,
          summary: stance.summary,
          quote: stance.quote,
          program_page: stance.page,
          stance_score: stance.stance_score,
          confidence: stance.confidence,
          reviewed: false,
          source_chunks: axisChunks.map((c) => ({
            text: c.text.substring(0, 200),
            page: c.page,
          })),
        },
        { onConflict: 'candidate_id,axis' },
      );

      this.logger.log(
        `Eje "${axis}": stance_score=${stance.stance_score}, confidence=${stance.confidence}`,
      );
    }

    this.logger.log(
      `Ingesta completada para ${candidate.name}. Revise draft positions antes de publicar.`,
    );
  }

  async publishPositions(candidateId: string) {
    const db = this.supabaseService.getClient();

    // Traer todas las posiciones revisadas
    const { data: drafts, error } = await db
      .from('candidate_positions_draft')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('reviewed', true);

    if (error) throw error;

    if (!drafts || drafts.length === 0) {
      throw new Error(
        `No hay posiciones revisadas para candidato "${candidateId}"`,
      );
    }

    if (drafts.length < 10) {
      this.logger.warn(
        `Solo ${drafts.length}/10 ejes revisados para ${candidateId}. Se publicarán los disponibles.`,
      );
    }

    // Upsert en candidate_positions
    for (const draft of drafts) {
      await db.from('candidate_positions').upsert(
        {
          candidate_id: draft.candidate_id,
          axis: draft.axis,
          summary: draft.summary,
          quote: draft.quote,
          program_page: draft.program_page,
          stance_score: draft.stance_score,
        },
        { onConflict: 'candidate_id,axis' },
      );
    }

    this.logger.log(
      `Publicadas ${drafts.length} posiciones para candidato ${candidateId}`,
    );
  }

  async getDraftPositions(candidateId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('candidate_positions_draft')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('axis');

    if (error) throw error;

    return {
      candidateId,
      positions: (data ?? []).map((p) => ({
        axis: p.axis,
        summary: p.summary,
        quote: p.quote,
        programPage: p.program_page,
        stanceScore: p.stance_score,
        confidence: p.confidence,
        reviewed: p.reviewed,
        reviewerNote: p.reviewer_note,
        sourceChunks: p.source_chunks,
      })),
    };
  }

  async updateDraftPosition(
    candidateId: string,
    axis: string,
    updates: {
      stanceScore?: number;
      reviewerNote?: string;
      reviewed?: boolean;
    },
  ) {
    const updateData: Record<string, unknown> = {};
    if (updates.stanceScore !== undefined)
      updateData.stance_score = updates.stanceScore;
    if (updates.reviewerNote !== undefined)
      updateData.reviewer_note = updates.reviewerNote;
    if (updates.reviewed !== undefined) updateData.reviewed = updates.reviewed;

    const { error } = await this.supabaseService
      .getClient()
      .from('candidate_positions_draft')
      .update(updateData)
      .eq('candidate_id', candidateId)
      .eq('axis', axis);

    if (error) throw error;
  }

  private async classifyChunks(
    chunks: PdfChunk[],
  ): Promise<Map<string, PdfChunk[]>> {
    const result = new Map<string, PdfChunk[]>();

    for (const chunk of chunks) {
      try {
        const response = await this.anthropic.messages.create({
          model: this.classificationModel,
          max_tokens: 50,
          messages: [
            {
              role: 'user',
              content: classifyChunkPrompt(chunk.text, chunk.page),
            },
          ],
        });

        const text =
          response.content[0].type === 'text' ? response.content[0].text : '';
        const axes = text
          .toLowerCase()
          .split(',')
          .map((a) => a.trim())
          .filter((a) => VALID_AXES.includes(a));

        for (const axis of axes) {
          const existing = result.get(axis) ?? [];
          existing.push(chunk);
          result.set(axis, existing);
        }
      } catch (error) {
        this.logger.warn(
          `Error clasificando chunk ${chunk.chunkIndex}: ${error}`,
        );
      }
    }

    return result;
  }

  private async determineStance(
    candidateName: string,
    axis: string,
    chunks: PdfChunk[],
  ): Promise<{
    summary: string;
    quote: string;
    page: number;
    stance_score: number;
    confidence: number;
  }> {
    const spectrum = AXIS_SPECTRUMS[axis];
    // Limitar a los 10 chunks más relevantes para no exceder contexto
    const selectedChunks = chunks.slice(0, 10);

    const response = await this.anthropic.messages.create({
      model: this.stanceModel,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: determineStancePrompt(
            candidateName,
            axis,
            spectrum,
            selectedChunks.map((c) => ({ text: c.text, page: c.page })),
          ),
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '{}';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`No se pudo extraer JSON de la respuesta para eje ${axis}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary ?? '',
      quote: parsed.quote ?? '',
      page: parsed.page ?? 0,
      stance_score: Math.max(1, Math.min(5, parseInt(parsed.stance_score, 10) || 3)),
      confidence: parseFloat(parsed.confidence) || 0.5,
    };
  }
}
