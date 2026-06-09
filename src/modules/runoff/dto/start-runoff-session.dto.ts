import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { AgeRange, Region, Gender } from '../../sessions/dto/start-session.dto';

// Estrato socioeconómico colombiano (1-6) + 'na' (prefiero no decir).
// Los nombres de miembro son e1..e6 (TS no admite nombres puramente numéricos),
// pero los VALORES son '1'..'6','na', que es lo que se valida y persiste.
export enum Estrato {
  e1 = '1',
  e2 = '2',
  e3 = '3',
  e4 = '4',
  e5 = '5',
  e6 = '6',
  na = 'na',
}

export enum AcademicLevel {
  primaria = 'primaria',
  bachillerato = 'bachillerato',
  tecnico = 'tecnico',
  pregrado = 'pregrado',
  posgrado = 'posgrado',
  na = 'na',
}

export class StartRunoffSessionDto {
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

  @ApiProperty({ enum: Estrato, example: '3' })
  @IsEnum(Estrato)
  estrato!: Estrato;

  @ApiProperty({ enum: AcademicLevel, example: 'pregrado' })
  @IsEnum(AcademicLevel)
  academic_level!: AcademicLevel;

  @ApiProperty({
    example: 'c3',
    description:
      'Voto en primera vuelta: candidateId (c1..c6) | "blank" | "no_vote" | "na"',
  })
  @IsString()
  @IsNotEmpty()
  first_round_vote!: string;

  @ApiProperty({
    example: 'c1',
    description:
      'Intención en segunda vuelta: "c1" | "c2" | "blank" | "undecided" | "na"',
  })
  @IsString()
  @IsNotEmpty()
  runoff_intention!: string;
}
