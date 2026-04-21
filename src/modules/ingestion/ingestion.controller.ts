import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { IngestionService } from './ingestion.service';
import { AdminTokenGuard } from '../../common/guards/admin-token.guard';
import { UpdateDraftPositionDto } from './dto/ingest-program.dto';

@ApiTags('admin')
@Controller('admin/draft-positions')
@UseGuards(AdminTokenGuard)
@ApiHeader({
  name: 'X-Admin-Token',
  description: 'Token de administración',
  required: true,
})
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Get(':candidateId')
  @ApiOperation({ summary: 'Ver posiciones draft de un candidato (admin)' })
  @ApiResponse({ status: 200, description: 'Posiciones draft del candidato' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getDraftPositions(@Param('candidateId') candidateId: string) {
    return this.ingestionService.getDraftPositions(candidateId);
  }

  @Patch(':candidateId/:axis')
  @ApiOperation({ summary: 'Actualizar/aprobar posición draft (admin)' })
  @ApiResponse({ status: 200, description: 'Posición actualizada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updateDraftPosition(
    @Param('candidateId') candidateId: string,
    @Param('axis') axis: string,
    @Body() dto: UpdateDraftPositionDto,
  ) {
    await this.ingestionService.updateDraftPosition(candidateId, axis, dto);
    return { success: true };
  }
}
