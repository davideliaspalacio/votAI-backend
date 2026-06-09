import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum WouldChangeVote {
  yes = 'yes',
  no = 'no',
}

export class RunoffVoteFeedbackDto {
  @ApiProperty({
    enum: WouldChangeVote,
    example: 'yes',
    description:
      'Si reconsideraría su voto tras ver que su afinidad no coincide con su intención',
  })
  @IsEnum(WouldChangeVote)
  wouldChange!: WouldChangeVote;
}
