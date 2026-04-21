import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElectoralSilenceGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    const silence = this.configService.get<boolean>('ELECTORAL_SILENCE');
    if (silence) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'electoral_silence',
        message:
          'Estadísticas no disponibles durante el período de silencio electoral.',
      });
    }
    return true;
  }
}
