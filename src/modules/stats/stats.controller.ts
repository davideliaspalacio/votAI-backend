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

  @Get('engagement')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Métricas de engagement (solo desarrollo)' })
  async getEngagement() {
    return this.statsService.getEngagementMetrics();
  }

  @Get('affinity-deep')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Métricas profundas de afinidad (solo desarrollo)' })
  async getAffinityDeep() {
    return this.statsService.getAffinityDeepMetrics();
  }

  @Get('axes-analysis')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Análisis por eje temático (solo desarrollo)' })
  async getAxesAnalysis() {
    return this.statsService.getAxesAnalysis();
  }

  @Get('demographics')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Métricas demográficas cruzadas (solo desarrollo)' })
  async getDemographics() {
    return this.statsService.getDemographicsCrossed();
  }

  @Get('blank-vote')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Análisis del voto en blanco (solo desarrollo)' })
  async getBlankVote() {
    return this.statsService.getBlankVoteAnalysis();
  }

  @Get('preference-flow')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Flujo preferencia vs resultado (solo desarrollo)' })
  async getPreferenceFlow() {
    return this.statsService.getPreferenceFlowDetailed();
  }

  @Get('debug-sentry')
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @ApiOperation({ summary: 'Lanza un error de prueba para verificar Sentry' })
  debugSentry() {
    throw new Error('Sentry test: verificación de captura de errores');
  }
}
