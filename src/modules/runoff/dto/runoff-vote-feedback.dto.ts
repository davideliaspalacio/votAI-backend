import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum VoteChoice {
  // Se va por el plan con el que más coincide (afinidad programática).
  affinity = 'affinity',
  // Mantiene su intención de voto original.
  intention = 'intention',
}

export class RunoffVoteFeedbackDto {
  @ApiProperty({
    enum: VoteChoice,
    example: 'affinity',
    description:
      'A la hora de votar, ¿sigue su afinidad programática o su intención de voto?',
  })
  @IsEnum(VoteChoice)
  voteChoice!: VoteChoice;
}
