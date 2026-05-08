import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { SupabaseService } from '../../supabase/supabase.service';

const STUCK_THRESHOLD_MS = 3 * 60 * 1000;
const GIVE_UP_THRESHOLD_MS = 30 * 60 * 1000;

@Injectable()
export class MatchCleanupCron {
  private readonly logger = new Logger(MatchCleanupCron.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    @InjectQueue('match') private readonly matchQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCleanup() {
    const now = Date.now();
    const stuckCutoff = new Date(now - STUCK_THRESHOLD_MS).toISOString();
    const giveUpCutoff = new Date(now - GIVE_UP_THRESHOLD_MS).toISOString();

    const db = this.supabaseService.getClient();

    const { data: stuck, error } = await db
      .from('sessions')
      .select('id, created_at')
      .eq('status', 'processing')
      .lt('created_at', stuckCutoff)
      .limit(100);

    if (error) {
      this.logger.error(`Error buscando sesiones atascadas: ${error.message}`);
      return;
    }
    if (!stuck || stuck.length === 0) return;

    let requeued = 0;
    let failed = 0;

    for (const session of stuck) {
      if (session.created_at < giveUpCutoff) {
        await db
          .from('sessions')
          .update({ status: 'failed' })
          .eq('id', session.id);
        failed += 1;
      } else {
        await this.matchQueue.add(
          'calculate',
          { sessionId: session.id },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
          },
        );
        requeued += 1;
      }
    }

    if (requeued + failed > 0) {
      this.logger.log(
        `Limpieza: ${requeued} sesiones re-encoladas, ${failed} marcadas como failed (>30min en processing)`,
      );
    }
  }
}
