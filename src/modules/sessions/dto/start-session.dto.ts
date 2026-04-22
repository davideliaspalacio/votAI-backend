import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export enum AgeRange {
  '18-24' = '18-24',
  '25-34' = '25-34',
  '35-49' = '35-49',
  '50-64' = '50-64',
  '65+' = '65+',
}

export enum Region {
  caribe = 'caribe',
  andina = 'andina',
  pacifica = 'pacifica',
  orinoquia = 'orinoquia',
  amazonia = 'amazonia',
  insular = 'insular',
}

export enum Gender {
  m = 'm',
  f = 'f',
  nb = 'nb',
  na = 'na',
}

export class StartSessionDto {
  @ApiProperty({ enum: AgeRange, example: '25-34' })
  @IsEnum(AgeRange)
  age_range!: AgeRange;

  @ApiProperty({ enum: Region, example: 'andina' })
  @IsEnum(Region)
  region!: Region;

  @ApiProperty({ enum: Gender, required: false, example: 'f' })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({
    example: 'c1',
    description: 'candidateId | "undecided" | "blank" | "na"',
  })
  @IsString()
  @IsNotEmpty()
  initial_preference!: string;
}
