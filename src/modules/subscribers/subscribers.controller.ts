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
import { UpdateDetailsDto } from './dto/update-details.dto';

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

  @Post('details')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Actualiza datos opcionales del suscriptor (paso 2)',
  })
  @ApiResponse({ status: 200, description: 'Datos actualizados' })
  @ApiResponse({ status: 404, description: 'Email no suscrito' })
  async updateDetails(
    @Body() dto: UpdateDetailsDto,
  ): Promise<{ updated: boolean }> {
    return this.subscribersService.updateDetails(dto);
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
