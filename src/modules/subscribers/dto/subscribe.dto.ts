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
}
