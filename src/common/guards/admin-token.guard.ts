import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-admin-token'] as string;
    const expectedToken = this.configService.get<string>('ADMIN_TOKEN');

    if (!expectedToken) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'ADMIN_NOT_CONFIGURED',
        message: 'El token de administración no está configurado',
      });
    }

    if (token !== expectedToken) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'UNAUTHORIZED',
        message: 'Token de administración inválido',
      });
    }

    return true;
  }
}
