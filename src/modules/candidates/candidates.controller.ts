import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CandidatesService } from './candidates.service';
import { CandidatesListResponseDto } from './dto/candidate.response.dto';
import { CandidateDetailResponseDto } from './dto/candidate-detail.response.dto';

@ApiTags('candidates')
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista de candidatos activos' })
  @ApiResponse({ status: 200, type: CandidatesListResponseDto })
  async findAll(): Promise<CandidatesListResponseDto> {
    return this.candidatesService.findAll();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Perfil completo del candidato con posiciones por eje' })
  @ApiParam({ name: 'slug', example: 'maria-valencia' })
  @ApiResponse({ status: 200, type: CandidateDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Candidato no encontrado' })
  async findBySlug(
    @Param('slug') slug: string,
  ): Promise<CandidateDetailResponseDto> {
    return this.candidatesService.findBySlug(slug);
  }
}
