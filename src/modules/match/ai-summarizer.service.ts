import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
  private readonly client: Anthropic | null;
  private readonly useAi: boolean;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.useAi = this.configService.get<boolean>('USE_AI_SUMMARIES', true);
    this.model = this.configService.get<string>(
      'AI_MODEL',
      'claude-sonnet-4-6',
    );

    if (this.useAi) {
      this.client = new Anthropic({
        apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
      });
    } else {
      this.client = null;
    }
  }

  get isEnabled(): boolean {
    return this.useAi && this.client !== null;
  }

  async generateCandidateSummary(input: SummaryInput): Promise<string> {
    if (!this.isEnabled || !this.client) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'AI_DISABLED',
        message: 'La generación con IA está deshabilitada',
      });
    }

    const prompt = `Eres un analista político NEUTRAL. El usuario respondió un test de afinidad programática.

Respuestas del usuario (eje → valor 1-7 → importancia 1-3):
${JSON.stringify(input.answers, null, 2)}

Posiciones del candidato ${input.candidateName} (eje → stance 1-7):
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
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Respuesta vacía del modelo');
    }
    return trimmed;
  }

  async generateUserStances(
    stances: StanceInput[],
  ): Promise<Map<string, string>> {
    if (!this.isEnabled || !this.client) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'AI_DISABLED',
        message: 'La generación con IA está deshabilitada',
      });
    }

    const prompt = `Eres un analista político NEUTRAL. Un usuario respondió un test de afinidad programática con estas respuestas:

${stances.map((s) => `- ${AXIS_LABELS[s.axis] || s.axis}: valor ${s.value}/7 (importancia ${s.weight}/3)`).join('\n')}

Para CADA eje, genera una frase corta (máximo 10 palabras) describiendo la postura del usuario.

REGLAS:
- No uses "encuesta", "intención de voto", "favorito", "ganador" ni "más popular"
- Sé neutral y descriptivo
- Responde en formato JSON: { "eje": "frase" }
- Usa los nombres de eje exactos: ${stances.map((s) => s.axis).join(', ')}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '{}';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Respuesta sin JSON parseable del modelo');
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
    const result = new Map<string, string>();
    for (const [axis, stance] of Object.entries(parsed)) {
      if (typeof stance === 'string' && stance.trim()) {
        result.set(axis, stance.trim());
      }
    }
    return result;
  }
}
