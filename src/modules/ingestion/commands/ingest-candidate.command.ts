import { Command, CommandRunner, Option } from 'nest-commander';
import { IngestionService } from '../ingestion.service';

interface IngestOptions {
  id: string;
  pdf: string;
}

@Command({
  name: 'ingest:candidate',
  description: 'Ingesta el programa de gobierno de un candidato desde un PDF',
})
export class IngestCandidateCommand extends CommandRunner {
  constructor(private readonly ingestionService: IngestionService) {
    super();
  }

  async run(_passedParams: string[], options: IngestOptions): Promise<void> {
    if (!options.id || !options.pdf) {
      console.error('Uso: pnpm run ingest:candidate -- --id=c1 --pdf=programs/c1.pdf');
      return;
    }

    console.log(`Ingiriendo programa de candidato ${options.id} desde ${options.pdf}`);
    await this.ingestionService.ingestCandidate(options.id, options.pdf);
    console.log('Ingesta completada. Revise las posiciones draft antes de publicar.');
  }

  @Option({
    flags: '--id <id>',
    description: 'ID del candidato (e.g., c1)',
    required: true,
  })
  parseId(val: string): string {
    return val;
  }

  @Option({
    flags: '--pdf <pdf>',
    description: 'Ruta del PDF en Supabase Storage (e.g., programs/c1.pdf)',
    required: true,
  })
  parsePdf(val: string): string {
    return val;
  }
}
