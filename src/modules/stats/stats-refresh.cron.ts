import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { StatsService } from './stats.service';

@Injectable()
export class StatsRefreshCron implements OnModuleInit {
  private readonly logger = new Logger(StatsRefreshCron.name);

  constructor(
    private readonly statsService: StatsService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const silence = this.configService.get<boolean>('ELECTORAL_SILENCE', false);
    if (silence) return;

    setTimeout(() => {
      this.statsService
        .refreshStats()
        .catch((err) =>
          this.logger.error(`Error en refresh inicial de stats: ${err}`),
        );
    }, 5000);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    const silence = this.configService.get<boolean>('ELECTORAL_SILENCE', false);
    if (silence) {
      this.logger.log('Silencio electoral activo, omitiendo recálculo de stats');
      return;
    }

    await this.statsService.refreshStats();
  }
}
