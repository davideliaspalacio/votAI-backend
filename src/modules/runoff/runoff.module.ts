import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RunoffController } from './runoff.controller';
import { RunoffService } from './runoff.service';
import { RunoffProcessor } from './runoff.processor';
import { RunoffCleanupCron } from './runoff-cleanup.cron';
import { MatchScoringService } from '../match/match-scoring.service';
import { AiSummarizerService } from '../match/ai-summarizer.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'runoff-match' })],
  controllers: [RunoffController],
  providers: [
    RunoffService,
    RunoffProcessor,
    RunoffCleanupCron,
    // Servicios puros reutilizados del test de primera vuelta.
    MatchScoringService,
    AiSummarizerService,
  ],
  exports: [RunoffService],
})
export class RunoffModule {}
