import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class UpdateDraftPositionDto {
  @ApiProperty({ required: false, example: 2, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  stanceScore?: number;

  @ApiProperty({ required: false, example: 'Verificado contra PDF página 23' })
  @IsOptional()
  @IsString()
  reviewerNote?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  reviewed?: boolean;
}
