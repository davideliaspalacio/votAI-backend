import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { StatsService } from './stats.service';
import { AdminTokenGuard } from '../../common/guards/admin-token.guard';
import { PublicStatsResponseDto } from './dto/public-stats.response.dto';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // Único endpoint público: total agregado de sesiones completadas.
  // Sin desagregación demográfica ni electoral.
  @Get('count')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Total de sesiones completadas (público)' })
  async getSessionCount() {
    return this.statsService.getSessionCount();
  }

  // El resto son endpoints internos protegidos por AdminTokenGuard.
  // Requieren header X-Admin-Token. Razones para no exponerlos:
  // - Contienen información sensible electoralmente (flujo de preferencia,
  //   voto en blanco, afinidad agregada por candidato).
  // - Cruces demográficos finos pueden permitir re-identificación.
  // - Resolución 2/2023 CNE y Ley 996/2005 regulan publicación de datos
  //   con apariencia de encuesta electoral.

  @Get('public')
  @UseGuards(AdminTokenGuard)
  @ApiSecurity('admin-token')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Estadísticas agregadas de afinidad (admin)' })
  @ApiResponse({ status: 200, type: PublicStatsResponseDto })
  @ApiResponse({ status: 401, description: 'Token de admin inválido' })
  async getPublicStats() {
    return this.statsService.getPublicStats();
  }

  @Get('engagement')
  @UseGuards(AdminTokenGuard)
  @ApiSecurity('admin-token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Métricas de engagement (admin)' })
  async getEngagement() {
    return this.statsService.getEngagementMetrics();
  }

  @Get('affinity-deep')
  @UseGuards(AdminTokenGuard)
  @ApiSecurity('admin-token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Métricas profundas de afinidad (admin)' })
  async getAffinityDeep() {
    return this.statsService.getAffinityDeepMetrics();
  }

  @Get('axes-analysis')
  @UseGuards(AdminTokenGuard)
  @ApiSecurity('admin-token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Análisis por eje temático (admin)' })
  async getAxesAnalysis() {
    return this.statsService.getAxesAnalysis();
  }

  @Get('demographics')
  @UseGuards(AdminTokenGuard)
  @ApiSecurity('admin-token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Métricas demográficas cruzadas (admin)' })
  async getDemographics() {
    return this.statsService.getDemographicsCrossed();
  }

  @Get('blank-vote')
  @UseGuards(AdminTokenGuard)
  @ApiSecurity('admin-token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Análisis del voto en blanco (admin)' })
  async getBlankVote() {
    return this.statsService.getBlankVoteAnalysis();
  }

  @Get('preference-flow')
  @UseGuards(AdminTokenGuard)
  @ApiSecurity('admin-token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Flujo preferencia vs resultado (admin)' })
  async getPreferenceFlow() {
    return this.statsService.getPreferenceFlowDetailed();
  }
}
