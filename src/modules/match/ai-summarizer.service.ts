import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface SummaryInput {
  candidateName: string;
  score: number;
  answers: { axis: string; value: number; weight: number }[];
  positions: { axis: string; stanceScore: number; summary: string }[];
  topAxes: string[];
  bottomAxes: string[];
}

export interface StanceInput {
  axis: string;
  value: number;
  weight: number;
}

// Nombres legibles de los ejes
const AXIS_LABELS: Record<string, string> = {
  economia: 'Economía',
  salud: 'Salud',
  educacion: 'Educación',
  seguridad: 'Seguridad',
  ambiente: 'Ambiente',
  politica_social: 'Política social',
  politica_exterior: 'Política exterior',
  reforma_politica: 'Reforma política',
  empleo: 'Empleo',
  tecnologia: 'Tecnología',
};

@Injectable()
export class AiSummarizerService {
  private readonly logger = new Logger(AiSummarizerService.name);
  private readonly client: Anthropic | null;
  private readonly useAi: boolean;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.useAi = this.configService.get<boolean>('USE_AI_SUMMARIES', true);
    this.model = this.configService.get<string>('AI_MODEL', 'claude-sonnet-4-6');

    if (this.useAi) {
      this.client = new Anthropic({
        apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
      });
    } else {
      this.client = null;
    }
  }

  async generateCandidateSummary(input: SummaryInput): Promise<string> {
    if (!this.useAi || !this.client) {
      return this.templateSummary(input);
    }

    try {
      const prompt = `Eres un analista político NEUTRAL. El usuario respondió un test de afinidad programática.

Respuestas del usuario (eje → valor 1-5 → importancia 1-3):
${JSON.stringify(input.answers, null, 2)}

Posiciones del candidato ${input.candidateName} (eje → stance 1-5):
${JSON.stringify(input.positions, null, 2)}

Score de afinidad: ${input.score}%

Genera un resumen de 1-2 oraciones explicando POR QUÉ hay afinidad o distancia. Menciona los ejes de mayor coincidencia y mayor diferencia.

REGLAS ESTRICTAS:
- No uses las palabras "encuesta", "intención de voto", "favorito", "ganador" ni "más popular"
- Usa "afinidad programática"
- Sé neutral: no recomiendes ni critiques al candidato
- Máximo 2 oraciones`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';
      return text.trim();
    } catch (error) {
      this.logger.warn(
        `Error al generar resumen con IA, usando template: ${error}`,
      );
      return this.templateSummary(input);
    }
  }

  async generateUserStances(
    stances: StanceInput[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    if (!this.useAi || !this.client) {
      for (const s of stances) {
        result.set(s.axis, this.templateStance(s.axis, s.value));
      }
      return result;
    }

    try {
      const prompt = `Eres un analista político NEUTRAL. Un usuario respondió un test de afinidad programática con estas respuestas:

${stances.map((s) => `- ${AXIS_LABELS[s.axis] || s.axis}: valor ${s.value}/5 (importancia ${s.weight}/3)`).join('\n')}

Para CADA eje, genera una frase corta (máximo 10 palabras) describiendo la postura del usuario.

REGLAS:
- No uses "encuesta", "intención de voto", "favorito", "ganador" ni "más popular"
- Sé neutral y descriptivo
- Responde en formato JSON: { "eje": "frase" }
- Usa los nombres de eje exactos: ${stances.map((s) => s.axis).join(', ')}`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '{}';

      // Extraer JSON del texto (puede venir envuelto en markdown)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
        for (const [axis, stance] of Object.entries(parsed)) {
          result.set(axis, stance);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Error al generar stances con IA, usando templates: ${error}`,
      );
    }

    // Rellenar los que falten con template
    for (const s of stances) {
      if (!result.has(s.axis)) {
        result.set(s.axis, this.templateStance(s.axis, s.value));
      }
    }

    return result;
  }

  private templateSummary(input: SummaryInput): string {
    const topLabels = input.topAxes
      .map((a) => AXIS_LABELS[a] || a)
      .join(' y ');
    const bottomLabels = input.bottomAxes
      .map((a) => AXIS_LABELS[a] || a)
      .join(' y ');

    if (input.score >= 70) {
      return `Alta afinidad programática con ${input.candidateName}. Mayor coincidencia en ${topLabels}, distancia en ${bottomLabels}.`;
    } else if (input.score >= 40) {
      return `Afinidad moderada con ${input.candidateName}. Coincidencia parcial en ${topLabels}, diferencias en ${bottomLabels}.`;
    } else {
      return `Baja afinidad programática con ${input.candidateName}. Las mayores diferencias están en ${bottomLabels}.`;
    }
  }

  private templateStance(axis: string, value: number): string {
    const label = AXIS_LABELS[axis] || axis;
    if (value <= 2) return `Posición progresista en ${label}`;
    if (value === 3) return `Posición moderada en ${label}`;
    return `Posición conservadora en ${label}`;
  }
}
