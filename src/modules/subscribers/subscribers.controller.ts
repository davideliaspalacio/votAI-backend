import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubscribersService } from './subscribers.service';
import { SubscribeDto } from './dto/subscribe.dto';

@ApiTags('subscribers')
@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Suscribir email a notificaciones de nuevos tests' })
  @ApiResponse({ status: 201, description: 'Suscripción guardada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async subscribe(
    @Body() dto: SubscribeDto,
  ): Promise<{ subscribed: boolean }> {
    return this.subscribersService.subscribe(dto);
  }

  @Get('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Baja de notificaciones vía token' })
  async unsubscribe(
    @Query('token') token: string,
  ): Promise<{ unsubscribed: boolean }> {
    return this.subscribersService.unsubscribe(token);
  }
}
