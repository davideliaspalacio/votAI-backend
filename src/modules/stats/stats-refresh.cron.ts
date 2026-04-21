import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { StatsService } from './stats.service';

@Injectable()
export class StatsRefreshCron {
  private readonly logger = new Logger(StatsRefreshCron.name);

  constructor(
    private readonly statsService: StatsService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    const silence = this.configService.get<boolean>('ELECTORAL_SILENCE', false);
    if (silence) {
      this.logger.log('Silencio electoral activo, omitiendo recálculo de stats');
      return;
    }

    await this.statsService.refreshStats();
  }
}
