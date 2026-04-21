import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MatchService } from './match.service';

@Processor('match')
export class MatchProcessor {
  private readonly logger = new Logger(MatchProcessor.name);

  constructor(private readonly matchService: MatchService) {}

  @Process('calculate')
  async handleCalculation(job: Job<{ sessionId: string }>) {
    this.logger.log(`Procesando match para sesión ${job.data.sessionId}`);
    await this.matchService.calculate(job.data.sessionId);
    this.logger.log(`Match completado para sesión ${job.data.sessionId}`);
  }
}
