import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UpdateDetailsDto } from './dto/update-details.dto';
import { isDisposableEmail } from './disposable-domains';

@Injectable()
export class SubscribersService {
  private readonly logger = new Logger(SubscribersService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async subscribe(dto: SubscribeDto): Promise<{ subscribed: boolean }> {
    // Honeypot: humanos lo dejan vacío. Si llega con valor, descartamos silenciosamente
    // (devolvemos OK para no dar pistas al bot).
    if (dto.website && dto.website.trim().length > 0) {
      this.logger.warn(`Honeypot disparado para ${dto.email}`);
      return { subscribed: true };
    }

    if (!dto.consent) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'CONSENT_REQUIRED',
        message: 'Se requiere consentimiento para suscribirse',
      });
    }

    const email = dto.email.trim().toLowerCase();

    if (isDisposableEmail(email)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'DISPOSABLE_EMAIL',
        message: 'Por favor usa un email permanente, no desechable',
      });
    }

    const db = this.supabaseService.getClient();

    const { data: existing } = await db
      .from('subscribers')
      .select('id, unsubscribed_at')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      if (existing.unsubscribed_at) {
        await db
          .from('subscribers')
          .update({
            unsubscribed_at: null,
            subscribed_at: new Date().toISOString(),
            source: dto.source ?? null,
          })
          .eq('id', existing.id);
        this.logger.log(`Resuscripción de ${email}`);
      }
      return { subscribed: true };
    }

    const { error } = await db.from('subscribers').insert({
      email,
      source: dto.source ?? null,
    });

    if (error) {
      this.logger.error(`Error guardando suscriptor: ${error.message}`);
      throw new BadRequestException({
        statusCode: 400,
        error: 'SUBSCRIBE_FAILED',
        message: 'No se pudo guardar la suscripción',
      });
    }

    return { subscribed: true };
  }

  async updateDetails(
    dto: UpdateDetailsDto,
  ): Promise<{ updated: boolean }> {
    const db = this.supabaseService.getClient();
    const email = dto.email.trim().toLowerCase();

    const { data: existing } = await db
      .from('subscribers')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'EMAIL_NOT_FOUND',
        message: 'Email no encontrado. Primero suscríbete.',
      });
    }

    const updates: Record<string, string | null> = {
      details_updated_at: new Date().toISOString(),
    };
    if (dto.name !== undefined) updates.name = dto.name.trim() || null;
    if (dto.age_range !== undefined) updates.age_range = dto.age_range;
    if (dto.city !== undefined) updates.city = dto.city.trim() || null;
    if (dto.occupation !== undefined) updates.occupation = dto.occupation;
    if (dto.heard_from !== undefined) updates.heard_from = dto.heard_from;

    const { error } = await db
      .from('subscribers')
      .update(updates)
      .eq('id', existing.id);

    if (error) {
      this.logger.error(`Error actualizando detalles: ${error.message}`);
      throw new BadRequestException({
        statusCode: 400,
        error: 'UPDATE_FAILED',
        message: 'No se pudieron guardar los datos',
      });
    }

    return { updated: true };
  }

  async unsubscribe(token: string): Promise<{ unsubscribed: boolean }> {
    const db = this.supabaseService.getClient();

    const { data: existing } = await db
      .from('subscribers')
      .select('id')
      .eq('unsubscribe_token', token)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'TOKEN_NOT_FOUND',
        message: 'Token de baja inválido',
      });
    }

    await db
      .from('subscribers')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('id', existing.id);

    return { unsubscribed: true };
  }
}
