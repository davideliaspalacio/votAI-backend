import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { StartSessionDto } from './dto/start-session.dto';
import { randomUUID } from 'crypto';

const SPECIAL_PREFERENCES = ['undecided', 'blank', 'na'];

@Injectable()
export class SessionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async startSession(dto: StartSessionDto) {
    // Validar initial_preference
    if (!SPECIAL_PREFERENCES.includes(dto.initial_preference)) {
      const { data: candidate } = await this.supabaseService
        .getClient()
        .from('candidates')
        .select('id')
        .eq('id', dto.initial_preference)
        .eq('active', true)
        .single();

      if (!candidate) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'INVALID_PREFERENCE',
          message: `Preferencia inicial "${dto.initial_preference}" no es un candidato válido ni un valor especial (undecided, blank, na)`,
        });
      }
    }

    const sessionId = randomUUID();

    const { error } = await this.supabaseService
      .getClient()
      .from('sessions')
      .insert({
        id: sessionId,
        age_range: dto.age_range,
        region: dto.region,
        gender: dto.gender ?? 'na',
        initial_preference: dto.initial_preference,
        status: 'created',
      });

    if (error) throw error;

    return { sessionId };
  }

  async deleteSession(sessionId: string) {
    const { data: session } = await this.supabaseService
      .getClient()
      .from('sessions')
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

    const { error } = await this.supabaseService
      .getClient()
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }
}
