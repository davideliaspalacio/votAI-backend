import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { StatsRefreshCron } from './stats-refresh.cron';
import { CleanupSessionsCron } from './cleanup-sessions.cron';

@Module({
  controllers: [StatsController],
  providers: [StatsService, StatsRefreshCron, CleanupSessionsCron],
})
export class StatsModule {}
