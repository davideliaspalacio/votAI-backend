import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { PdfParserService } from './pdf-parser.service';
import { IngestCandidateCommand } from './commands/ingest-candidate.command';
import { PublishPositionsCommand } from './commands/publish-positions.command';

@Module({
  controllers: [IngestionController],
  providers: [
    IngestionService,
    PdfParserService,
    IngestCandidateCommand,
    PublishPositionsCommand,
  ],
})
export class IngestionModule {}
