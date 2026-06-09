import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { RunoffService } from './runoff.service';

@Processor('runoff-match')
export class RunoffProcessor {
  private readonly logger = new Logger(RunoffProcessor.name);

  constructor(private readonly runoffService: RunoffService) {}

  @Process({ name: 'calculate', concurrency: 75 })
  async handleCalculation(job: Job<{ sessionId: string }>) {
    this.logger.log(
      `Procesando match de segunda vuelta para sesión ${job.data.sessionId}`,
    );
    await this.runoffService.calculate(job.data.sessionId);
    this.logger.log(
      `Match de segunda vuelta completado para sesión ${job.data.sessionId}`,
    );
  }
}
