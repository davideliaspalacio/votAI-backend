export const classifyChunkPrompt = (chunkText: string, page: number) => `
Eres un analista político neutral. Clasifica el siguiente fragmento del
programa de gobierno de un candidato presidencial colombiano en uno o
más de estos ejes temáticos:

- economia: política fiscal, impuestos, intervención del Estado en la economía
- salud: sistema de salud, EPS, cobertura, prevención
- educacion: calidad educativa, cobertura, educación superior
- seguridad: orden público, fuerza pública, conflicto armado, política de drogas
- ambiente: extractivismo, transición energética, deforestación
- politica_social: pobreza, desigualdad, grupos vulnerables, subsidios
- politica_exterior: relaciones internacionales, comercio exterior, migración
- reforma_politica: partidos, sistema electoral, anticorrupción, justicia
- empleo: mercado laboral, reforma laboral, informalidad
- tecnologia: innovación, digitalización, ciberseguridad, investigación

Si el fragmento no pertenece a ninguno, responde "ninguno".
Si pertenece a varios, sepáralos por coma.

NO uses las palabras "encuesta", "intención de voto", "favorito", "ganador" ni "más popular".

Fragmento (página ${page}):
"""
${chunkText}
"""

Responde SOLO con los ejes aplicables separados por coma, sin explicación.
Ejemplo de respuesta válida: economia, empleo
`;
