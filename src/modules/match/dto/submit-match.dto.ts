import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @ApiProperty({ example: 'q1' })
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(7)
  value!: number;

  @ApiProperty({ example: 3, minimum: 1, maximum: 3 })
  @IsInt()
  @Min(1)
  @Max(3)
  weight!: number;
}

export class SubmitMatchDto {
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
