import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class CandidatesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('candidates')
      .select('id, slug, name, party, color, bio, program_pdf')
      .eq('active', true)
      .order('name');

    if (error) throw error;

    return {
      candidates: (data ?? []).map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        party: c.party,
        color: c.color,
        bio: c.bio,
        programPdfUrl: c.program_pdf ?? undefined,
      })),
    };
  }

  async findBySlug(slug: string) {
    const { data: candidate, error } = await this.supabaseService
      .getClient()
      .from('candidates')
      .select('id, slug, name, party, color, bio, program_pdf')
      .eq('slug', slug)
      .eq('active', true)
      .single();

    if (error || !candidate) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'CANDIDATE_NOT_FOUND',
        message: `No se encontró un candidato con slug "${slug}"`,
      });
    }

    const { data: positions, error: posError } = await this.supabaseService
      .getClient()
      .from('candidate_positions')
      .select('axis, summary, quote, program_page')
      .eq('candidate_id', candidate.id);

    if (posError) throw posError;

    const positionsMap: Record<
      string,
      { summary: string; quote: string; programPage?: number }
    > = {};

    for (const pos of positions ?? []) {
      positionsMap[pos.axis] = {
        summary: pos.summary,
        quote: pos.quote,
        programPage: pos.program_page ?? undefined,
      };
    }

    return {
      candidate: {
        id: candidate.id,
        slug: candidate.slug,
        name: candidate.name,
        party: candidate.party,
        color: candidate.color,
        bio: candidate.bio,
        programPdfUrl: candidate.program_pdf ?? undefined,
        positions: positionsMap,
      },
    };
  }
}
