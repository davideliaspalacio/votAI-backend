import { ApiProperty } from '@nestjs/swagger';

export class MatchStatusResponseDto {
  @ApiProperty({ example: 'processing', enum: ['processing', 'done'] })
  status!: string;
}
