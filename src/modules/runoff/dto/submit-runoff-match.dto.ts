import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnswerDto } from '../../match/dto/submit-match.dto';

export class SubmitRunoffMatchDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({ type: [AnswerDto] })
  @ValidateNested({ each: true })
  @ArrayMinSize(10)
  @ArrayMaxSize(10)
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
