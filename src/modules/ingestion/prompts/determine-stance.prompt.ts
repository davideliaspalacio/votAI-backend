export interface AxisSpectrum {
  low: string;
  high: string;
}

export const determineStancePrompt = (
  candidateName: string,
  axis: string,
  axisSpectrum: AxisSpectrum,
  chunks: { text: string; page: number }[],
) => `
Eres un analista político NEUTRAL. Analiza la posición del candidato
${candidateName} sobre el eje de "${axis}" basándote en los siguientes
fragmentos de su programa oficial.

Espectro del eje:
  1 = ${axisSpectrum.low}
  5 = ${axisSpectrum.high}
  (3 = posición intermedia)

Fragmentos del programa:
${chunks.map((c, i) => `
--- Fragmento ${i + 1} (página ${c.page}) ---
${c.text}
`).join('\n')}

Genera una respuesta en JSON ESTRICTO con esta estructura:

{
  "summary": "Resumen de 2 oraciones de la posición del candidato sobre este eje.",
  "quote": "Cita textual de máximo 20 palabras extraída LITERALMENTE de los fragmentos. Debe ser representativa de su posición.",
  "page": <número de página de donde proviene la cita>,
  "stance_score": <número entero del 1 al 5>,
  "confidence": <número decimal entre 0.0 y 1.0 indicando qué tan segura estás de la clasificación>
}

REGLAS:
- La cita DEBE aparecer textualmente en los fragmentos. No inventes.
- Si los fragmentos son insuficientes o contradictorios, usa confidence < 0.5.
- NO uses las palabras "encuesta", "intención de voto", "favorito", "ganador" ni "más popular".
- Responde SOLO con el JSON, sin markdown, sin texto adicional.
`;

export const AXIS_SPECTRUMS: Record<string, AxisSpectrum> = {
  economia: {
    low: 'Estado interventor, control de precios, sector público fuerte',
    high: 'Libre mercado, apertura económica, mínima intervención estatal',
  },
  salud: {
    low: 'Sistema público universal, eliminación de EPS privadas',
    high: 'Sistema mixto con predominio privado, libre elección',
  },
  educacion: {
    low: 'Educación pública gratuita y universal, prohibir ánimo de lucro',
    high: 'Vouchers, libre mercado educativo, autonomía total de privados',
  },
  seguridad: {
    low: 'Diálogo, inversión social, enfoque de paz total',
    high: 'Mano dura, militarización, endurecimiento de penas',
  },
  ambiente: {
    low: 'Extractivismo como motor económico (petróleo, minería, fracking)',
    high: 'Transición verde radical, prohibición de hidrocarburos',
  },
  politica_social: {
    low: 'Meritocracia estricta, reducción de subsidios',
    high: 'Renta básica universal, expansión masiva de subsidios',
  },
  politica_exterior: {
    low: 'Aislacionismo, prioridad nacional, cierre de fronteras',
    high: 'Integración regional profunda, apertura migratoria, multilateralismo',
  },
  reforma_politica: {
    low: 'Mantener sistema actual, cambios menores',
    high: 'Asamblea Constituyente, refundación institucional',
  },
  empleo: {
    low: 'Flexibilización laboral, reducción de costos al empleador',
    high: 'Garantías laborales máximas, salario mínimo alto, semana de 4 días',
  },
  tecnologia: {
    low: 'Enfoque tradicional, mínima digitalización estatal',
    high: 'Transformación digital radical, IA en servicios públicos, cripto',
  },
} as const;
