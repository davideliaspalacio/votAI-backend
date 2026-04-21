import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { MatchScoringService } from './match-scoring.service';
import { AiSummarizerService } from './ai-summarizer.service';
import { MatchProcessor } from './match.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'match' })],
  controllers: [MatchController],
  providers: [
    MatchService,
    MatchScoringService,
    AiSummarizerService,
    MatchProcessor,
  ],
  exports: [MatchService],
})
export class MatchModule {}
