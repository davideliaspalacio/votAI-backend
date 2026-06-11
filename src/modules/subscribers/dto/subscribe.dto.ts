import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsBoolean,
  Equals,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SubscribeDto {
  @ApiProperty({ example: 'usuario@correo.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: true, description: 'Consentimiento explícito Habeas Data' })
  @IsBoolean()
  @Equals(true, {
    message: 'Debes aceptar el consentimiento para suscribirte',
  })
  consent!: boolean;

  @ApiProperty({ required: false, example: 'resultados' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  source?: string;

  // Datos demográficos del test (opt-in), adjuntados desde los resultados.
  // SOLO demográficos: nunca el voto ni las respuestas. Todos opcionales.
  @ApiProperty({ required: false, example: '25-34' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  age_range?: string;

  @ApiProperty({ required: false, example: 'andina' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  region?: string;

  @ApiProperty({ required: false, example: 'f' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  gender?: string;

  @ApiProperty({ required: false, example: '3' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  estrato?: string;

  @ApiProperty({ required: false, example: 'universitario' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  academic_level?: string;

  // Honeypot — humanos lo dejan vacío, bots lo llenan
  @ApiProperty({ required: false, description: 'No completar (honeypot)' })
  @IsOptional()
  @IsString()
  website?: string;
}
