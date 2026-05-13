import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class SubscribersService {
  private readonly logger = new Logger(SubscribersService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async subscribe(dto: SubscribeDto): Promise<{ subscribed: boolean }> {
    if (!dto.consent) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'CONSENT_REQUIRED',
        message: 'Se requiere consentimiento para suscribirse',
      });
    }

    const db = this.supabaseService.getClient();
    const email = dto.email.trim().toLowerCase();

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
