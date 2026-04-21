import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MatchService } from './match.service';
import { SubmitMatchDto } from './dto/submit-match.dto';
import { MatchStatusResponseDto } from './dto/match-status.response.dto';
import { MatchResultResponseDto } from './dto/match-result.response.dto';

@ApiTags('match')
@Controller('match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Envía respuestas y dispara cálculo de afinidad' })
  @ApiResponse({ status: 202, type: MatchStatusResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  async submit(
    @Body() dto: SubmitMatchDto,
  ): Promise<MatchStatusResponseDto> {
    return this.matchService.submit(dto);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Consulta estado/resultado del match' })
  @ApiParam({ name: 'sessionId' })
  @ApiResponse({ status: 200, type: MatchResultResponseDto })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  async getResult(
    @Param('sessionId') sessionId: string,
  ): Promise<MatchStatusResponseDto | MatchResultResponseDto> {
    return this.matchService.getResult(sessionId);
  }
}
