import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { StartSessionDto } from './dto/start-session.dto';
import { randomUUID } from 'crypto';

const SPECIAL_PREFERENCES = ['undecided', 'blank', 'na'];
const MAX_TESTS_PER_WINDOW = 2;
const WINDOW_HOURS = 12;

@Injectable()
export class SessionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async startSession(dto: StartSessionDto) {
    const db = this.supabaseService.getClient();

    // Rate limit por dispositivo: máximo 2 tests cada 12 horas
    if (dto.device_hash) {
      const windowStart = new Date(
        Date.now() - WINDOW_HOURS * 60 * 60 * 1000,
      ).toISOString();

      const { count } = await db
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('device_hash', dto.device_hash)
        .eq('status', 'done')
        .gte('created_at', windowStart);

      if (count !== null && count >= MAX_TESTS_PER_WINDOW) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Ya realizaste ${MAX_TESTS_PER_WINDOW} tests en las últimas ${WINDOW_HOURS} horas. Puedes intentar de nuevo más tarde.`,
          retryAfterHours: WINDOW_HOURS,
        });
      }
    }

    // Validar initial_preference
    if (!SPECIAL_PREFERENCES.includes(dto.initial_preference)) {
      const { data: candidate } = await db
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

    const { error } = await db.from('sessions').insert({
      id: sessionId,
      age_range: dto.age_range,
      region: dto.region,
      gender: dto.gender ?? 'na',
      initial_preference: dto.initial_preference,
      device_hash: dto.device_hash ?? null,
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
