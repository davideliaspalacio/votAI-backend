import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { StatsService } from './stats.service';
import { ElectoralSilenceGuard } from '../../common/guards/electoral-silence.guard';
import { PublicStatsResponseDto } from './dto/public-stats.response.dto';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('public')
  @UseGuards(ElectoralSilenceGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Estadísticas agregadas públicas de afinidad' })
  @ApiResponse({ status: 200, type: PublicStatsResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Datos insuficientes o silencio electoral',
  })
  async getPublicStats() {
    return this.statsService.getPublicStats();
  }

  @Get('count')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Total de sesiones completadas' })
  async getSessionCount() {
    return this.statsService.getSessionCount();
  }
}
