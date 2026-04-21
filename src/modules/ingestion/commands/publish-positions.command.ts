import { Command, CommandRunner, Option } from 'nest-commander';
import { IngestionService } from '../ingestion.service';

interface PublishOptions {
  id: string;
}

@Command({
  name: 'publish:positions',
  description: 'Publica posiciones revisadas de candidate_positions_draft a candidate_positions',
})
export class PublishPositionsCommand extends CommandRunner {
  constructor(private readonly ingestionService: IngestionService) {
    super();
  }

  async run(_passedParams: string[], options: PublishOptions): Promise<void> {
    if (!options.id) {
      console.error('Uso: pnpm run publish:positions -- --id=c1');
      return;
    }

    console.log(`Publicando posiciones revisadas para candidato ${options.id}`);
    await this.ingestionService.publishPositions(options.id);
    console.log('Posiciones publicadas exitosamente.');
  }

  @Option({
    flags: '--id <id>',
    description: 'ID del candidato (e.g., c1)',
    required: true,
  })
  parseId(val: string): string {
    return val;
  }
}
