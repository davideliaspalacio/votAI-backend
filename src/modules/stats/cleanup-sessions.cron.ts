import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class CleanupSessionsCron {
  private readonly logger = new Logger(CleanupSessionsCron.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    const cutoff = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();

    const { count, error } = await this.supabaseService
      .getClient()
      .from('sessions')
      .delete({ count: 'exact' })
      .in('status', ['created', 'answering'])
      .lt('created_at', cutoff);

    if (error) {
      this.logger.error(`Error limpiando sesiones: ${error.message}`);
      return;
    }

    if (count && count > 0) {
      this.logger.log(`Sesiones abandonadas eliminadas: ${count}`);
    }
  }
}
