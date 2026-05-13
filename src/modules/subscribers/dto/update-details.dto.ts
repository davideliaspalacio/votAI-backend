import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsIn,
  MaxLength,
} from 'class-validator';

const AGE_RANGES = ['18-24', '25-34', '35-49', '50-64', '65+'] as const;
const OCCUPATIONS = [
  'estudiante',
  'profesional',
  'independiente',
  'empleado_publico',
  'empleado_privado',
  'pensionado',
  'otro',
] as const;
const HEARD_FROM = [
  'instagram',
  'twitter',
  'whatsapp',
  'tiktok',
  'radio',
  'amigo',
  'google',
  'otro',
] as const;

export class UpdateDetailsDto {
  @ApiProperty({ example: 'usuario@correo.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ required: false, example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiProperty({ required: false, enum: AGE_RANGES })
  @IsOptional()
  @IsIn(AGE_RANGES as unknown as string[])
  age_range?: string;

  @ApiProperty({ required: false, example: 'Bogotá' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiProperty({ required: false, enum: OCCUPATIONS })
  @IsOptional()
  @IsIn(OCCUPATIONS as unknown as string[])
  occupation?: string;

  @ApiProperty({ required: false, enum: HEARD_FROM })
  @IsOptional()
  @IsIn(HEARD_FROM as unknown as string[])
  heard_from?: string;
}
