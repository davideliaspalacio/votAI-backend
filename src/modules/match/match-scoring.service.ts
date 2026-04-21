import { Injectable } from '@nestjs/common';

export interface UserAnswer {
  questionId: string;
  axis: string;
  value: number;
  weight: number;
}

export interface CandidateScore {
  candidateId: string;
  score: number;
  rank: number;
  axisDistances: {
    axis: string;
    distance: number;
    similarity: number;
  }[];
}

@Injectable()
export class MatchScoringService {
  calculate(
    answers: UserAnswer[],
    candidatePositions: Map<string, Map<string, number>>,
  ): CandidateScore[] {
    const scores: CandidateScore[] = [];

    for (const [candidateId, positions] of candidatePositions) {
      let totalWeighted = 0;
      let maxPossible = 0;
      const axisDistances: CandidateScore['axisDistances'] = [];

      for (const answer of answers) {
        const stance = positions.get(answer.axis);
        if (stance === undefined) continue;

        const distance = Math.abs(answer.value - stance); // 0-4
        const similarity = 1 - distance / 4; // 0-1
        const weighted = similarity * answer.weight;

        totalWeighted += weighted;
        maxPossible += answer.weight;
        axisDistances.push({ axis: answer.axis, distance, similarity });
      }

      const score =
        maxPossible > 0
          ? Math.round((totalWeighted / maxPossible) * 100)
          : 0;

      scores.push({ candidateId, score, rank: 0, axisDistances });
    }

    // Ordenar por score descendente y asignar ranking
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((s, i) => {
      s.rank = i + 1;
    });

    return scores;
  }
}
