-- =============================================================
-- EXPANSION DE ESCALA: 1-5 → 1-7
-- 7 opciones = 1 por cada candidato + voto en blanco
-- =============================================================

-- 1. Cambiar restricciones de CHECK en las tablas
ALTER TABLE candidate_positions DROP CONSTRAINT IF EXISTS candidate_positions_stance_score_check;
ALTER TABLE candidate_positions ADD CONSTRAINT candidate_positions_stance_score_check CHECK (stance_score BETWEEN 1 AND 7);

ALTER TABLE candidate_positions_draft DROP CONSTRAINT IF EXISTS candidate_positions_draft_stance_score_check;
ALTER TABLE candidate_positions_draft ADD CONSTRAINT candidate_positions_draft_stance_score_check CHECK (stance_score BETWEEN 1 AND 7);

ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_value_check;
ALTER TABLE answers ADD CONSTRAINT answers_value_check CHECK (value BETWEEN 1 AND 7);

-- 2. Actualizar stance_scores con escala 1-7 para mayor diferenciacion
-- Escala: 1=izquierda radical, 4=centro/esceptico, 7=derecha radical

-- c1 Ivan Cepeda (izquierda)
UPDATE candidate_positions SET stance_score = 1 WHERE candidate_id = 'c1' AND axis = 'economia';
UPDATE candidate_positions SET stance_score = 1 WHERE candidate_id = 'c1' AND axis = 'salud';
UPDATE candidate_positions SET stance_score = 1 WHERE candidate_id = 'c1' AND axis = 'educacion';
UPDATE candidate_positions SET stance_score = 1 WHERE candidate_id = 'c1' AND axis = 'seguridad';
UPDATE candidate_positions SET stance_score = 7 WHERE candidate_id = 'c1' AND axis = 'ambiente';
UPDATE candidate_positions SET stance_score = 7 WHERE candidate_id = 'c1' AND axis = 'politica_social';
UPDATE candidate_positions SET stance_score = 6 WHERE candidate_id = 'c1' AND axis = 'politica_exterior';
UPDATE candidate_positions SET stance_score = 7 WHERE candidate_id = 'c1' AND axis = 'reforma_politica';
UPDATE candidate_positions SET stance_score = 7 WHERE candidate_id = 'c1' AND axis = 'empleo';
UPDATE candidate_positions SET stance_score = 2 WHERE candidate_id = 'c1' AND axis = 'tecnologia';

-- c2 Abelardo de la Espriella (derecha)
UPDATE candidate_positions SET stance_score = 7 WHERE candidate_id = 'c2' AND axis = 'economia';
UPDATE candidate_positions SET stance_score = 6 WHERE candidate_id = 'c2' AND axis = 'salud';
UPDATE candidate_positions SET stance_score = 6 WHERE candidate_id = 'c2' AND axis = 'educacion';
UPDATE candidate_positions SET stance_score = 7 WHERE candidate_id = 'c2' AND axis = 'seguridad';
UPDATE candidate_positions SET stance_score = 1 WHERE candidate_id = 'c2' AND axis = 'ambiente';
UPDATE candidate_positions SET stance_score = 1 WHERE candidate_id = 'c2' AND axis = 'politica_social';
UPDATE candidate_positions SET stance_score = 1 WHERE candidate_id = 'c2' AND axis = 'politica_exterior';
UPDATE candidate_positions SET stance_score = 1 WHERE candidate_id = 'c2' AND axis = 'reforma_politica';
UPDATE candidate_positions SET stance_score = 1 WHERE candidate_id = 'c2' AND axis = 'empleo';
UPDATE candidate_positions SET stance_score = 6 WHERE candidate_id = 'c2' AND axis = 'tecnologia';

-- c3 Paloma Valencia (centro-derecha)
UPDATE candidate_positions SET stance_score = 6 WHERE candidate_id = 'c3' AND axis = 'economia';
UPDATE candidate_positions SET stance_score = 5 WHERE candidate_id = 'c3' AND axis = 'salud';
UPDATE candidate_positions SET stance_score = 6 WHERE candidate_id = 'c3' AND axis = 'educacion';
UPDATE candidate_positions SET stance_score = 7 WHERE candidate_id = 'c3' AND axis = 'seguridad';
UPDATE candidate_positions SET stance_score = 2 WHERE candidate_id = 'c3' AND axis = 'ambiente';
UPDATE candidate_positions SET stance_score = 2 WHERE candidate_id = 'c3' AND axis = 'politica_social';
UPDATE candidate_positions SET stance_score = 2 WHERE candidate_id = 'c3' AND axis = 'politica_exterior';
UPDATE candidate_positions SET stance_score = 1 WHERE candidate_id = 'c3' AND axis = 'reforma_politica';
UPDATE candidate_positions SET stance_score = 2 WHERE candidate_id = 'c3' AND axis = 'empleo';
UPDATE candidate_positions SET stance_score = 7 WHERE candidate_id = 'c3' AND axis = 'tecnologia';

-- c4 Claudia Lopez (centro-izquierda)
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c4' AND axis = 'economia';
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c4' AND axis = 'salud';
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c4' AND axis = 'educacion';
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c4' AND axis = 'seguridad';
UPDATE candidate_positions SET stance_score = 5 WHERE candidate_id = 'c4' AND axis = 'ambiente';
UPDATE candidate_positions SET stance_score = 5 WHERE candidate_id = 'c4' AND axis = 'politica_social';
UPDATE candidate_positions SET stance_score = 5 WHERE candidate_id = 'c4' AND axis = 'politica_exterior';
UPDATE candidate_positions SET stance_score = 5 WHERE candidate_id = 'c4' AND axis = 'reforma_politica';
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c4' AND axis = 'empleo';
UPDATE candidate_positions SET stance_score = 5 WHERE candidate_id = 'c4' AND axis = 'tecnologia';

-- c5 Sergio Fajardo (centro)
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c5' AND axis = 'economia';
UPDATE candidate_positions SET stance_score = 2 WHERE candidate_id = 'c5' AND axis = 'salud';
UPDATE candidate_positions SET stance_score = 2 WHERE candidate_id = 'c5' AND axis = 'educacion';
UPDATE candidate_positions SET stance_score = 5 WHERE candidate_id = 'c5' AND axis = 'seguridad';
UPDATE candidate_positions SET stance_score = 6 WHERE candidate_id = 'c5' AND axis = 'ambiente';
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c5' AND axis = 'politica_social';
UPDATE candidate_positions SET stance_score = 6 WHERE candidate_id = 'c5' AND axis = 'politica_exterior';
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c5' AND axis = 'reforma_politica';
UPDATE candidate_positions SET stance_score = 5 WHERE candidate_id = 'c5' AND axis = 'empleo';
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c5' AND axis = 'tecnologia';

-- c6 Roy Barreras (centro-pragmatico)
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c6' AND axis = 'economia';
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c6' AND axis = 'salud';
UPDATE candidate_positions SET stance_score = 5 WHERE candidate_id = 'c6' AND axis = 'educacion';
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c6' AND axis = 'seguridad';
UPDATE candidate_positions SET stance_score = 3 WHERE candidate_id = 'c6' AND axis = 'ambiente';
UPDATE candidate_positions SET stance_score = 6 WHERE candidate_id = 'c6' AND axis = 'politica_social';
UPDATE candidate_positions SET stance_score = 5 WHERE candidate_id = 'c6' AND axis = 'politica_exterior';
UPDATE candidate_positions SET stance_score = 5 WHERE candidate_id = 'c6' AND axis = 'reforma_politica';
UPDATE candidate_positions SET stance_score = 6 WHERE candidate_id = 'c6' AND axis = 'empleo';
UPDATE candidate_positions SET stance_score = 5 WHERE candidate_id = 'c6' AND axis = 'tecnologia';

-- c0 Voto en Blanco (centro esceptico = 4 en todo)
UPDATE candidate_positions SET stance_score = 4 WHERE candidate_id = 'c0';

-- 3. Actualizar opciones de las 30 preguntas con 7 opciones cada una

-- q1: Economia - Control de precios
UPDATE questions SET options = '[
  {"label": "El Estado debe fijar los precios de la canasta básica directamente", "value": 1},
  {"label": "Fortalecimiento de la banca pública y soberanía alimentaria", "value": 2},
  {"label": "Subsidios focalizados para familias vulnerables", "value": 3},
  {"label": "No confío en ninguna propuesta económica actual", "value": 4},
  {"label": "Reactivación con vivienda e infraestructura como motor económico", "value": 5},
  {"label": "Incentivos tributarios al sector privado para bajar costos", "value": 6},
  {"label": "El mercado debe regular los precios sin intervención estatal", "value": 7}
]'::jsonb WHERE id = 'q1';

-- q2: Salud
UPDATE questions SET options = '[
  {"label": "Eliminar las EPS y crear un sistema 100% público universal", "value": 1},
  {"label": "Puesto de mando de salud desde el día uno y acceso a medicamentos", "value": 2},
  {"label": "Recuperar el sistema de salud con red pública fuerte y privados complementarios", "value": 3},
  {"label": "Ninguna propuesta de salud actual es viable ni financiable", "value": 4},
  {"label": "Modelo mixto con sostenibilidad financiera y acceso efectivo", "value": 5},
  {"label": "Estabilizar las EPS con tecnología e IA para diagnóstico", "value": 6},
  {"label": "Plan de emergencia de 90 días manteniendo EPS con regulación estricta", "value": 7}
]'::jsonb WHERE id = 'q2';

-- q3: Educacion
UPDATE questions SET options = '[
  {"label": "Universidad pública gratuita para todos sin importar estrato", "value": 1},
  {"label": "Docentes como profesionales de élite y jóvenes en el centro", "value": 2},
  {"label": "Jornada única, alimentación escolar y acceso a educación superior", "value": 3},
  {"label": "Las promesas educativas son eslóganes sin sustento fiscal", "value": 4},
  {"label": "Escuela Virtual y un millón de computadores con conectividad", "value": 5},
  {"label": "Educación técnica, acceso a IA y alianzas público-privadas", "value": 6},
  {"label": "Becas por mérito, educación bilingüe e incentivos al sector privado", "value": 7}
]'::jsonb WHERE id = 'q3';

-- q4: Seguridad
UPDATE questions SET options = '[
  {"label": "Paz total: diálogo con todos los actores armados e inversión social", "value": 1},
  {"label": "Desmilitarización progresiva y presencia integral del Estado", "value": 2},
  {"label": "Seguridad inteligente con policía comunitaria y combate a extorsión", "value": 3},
  {"label": "Nada de lo que se ha intentado funciona", "value": 4},
  {"label": "Recuperar seguridad con enfoque integral: fuerza más inversión social", "value": 5},
  {"label": "Inteligencia, tecnología y ciberseguridad sobre fuerza bruta", "value": 6},
  {"label": "Mano dura, aumento del pie de fuerza y erradicación total", "value": 7}
]'::jsonb WHERE id = 'q4';

-- q5: Ambiente
UPDATE questions SET options = '[
  {"label": "Fracking y minería como motores de desarrollo económico", "value": 1},
  {"label": "Transición energética gradual sin sacrificar la economía", "value": 2},
  {"label": "Renovables combinadas con minería regulada y sostenible", "value": 3},
  {"label": "Las promesas ambientales no sobreviven el primer año de gobierno", "value": 4},
  {"label": "Transición energética justa protegiendo páramos y fuentes hídricas", "value": 5},
  {"label": "Colombia potencia de biodiversidad con financiación verde", "value": 6},
  {"label": "Prohibir toda minería en páramos y transición energética ya", "value": 7}
]'::jsonb WHERE id = 'q5';

-- q6: Politica social
UPDATE questions SET options = '[
  {"label": "Reducir subsidios, el empleo es la mejor política social", "value": 1},
  {"label": "Programas sociales focalizados con graduación de beneficiarios", "value": 2},
  {"label": "Programas basados en evidencia con evaluación de impacto", "value": 3},
  {"label": "Los subsidios no resuelven la pobreza estructural", "value": 4},
  {"label": "Centros de emprendimiento comunitario especialmente para mujeres", "value": 5},
  {"label": "Política social con resultados medibles, sin clientelismo", "value": 6},
  {"label": "Renta básica universal y reparación para comunidades excluidas", "value": 7}
]'::jsonb WHERE id = 'q6';

-- q7: Politica exterior
UPDATE questions SET options = '[
  {"label": "Alianza firme con EE.UU., línea dura con Venezuela", "value": 1},
  {"label": "Alianza estratégica con EE.UU. y Europa, ingreso a OCDE", "value": 2},
  {"label": "Relaciones pragmáticas con remesas como motor de desarrollo", "value": 3},
  {"label": "La política exterior no puede cambiar cada cuatro años", "value": 4},
  {"label": "Multilateralismo pragmático y relaciones diversificadas", "value": 5},
  {"label": "Diplomacia democrática y cooperación internacional activa", "value": 6},
  {"label": "Integración profunda con Latinoamérica y el Sur Global", "value": 7}
]'::jsonb WHERE id = 'q7';

-- q8: Reforma politica
UPDATE questions SET options = '[
  {"label": "Mantener el marco actual y fortalecer instituciones existentes", "value": 1},
  {"label": "Reformas graduales anticorrupción con IA y blockchain", "value": 2},
  {"label": "Reformas profundas sin constituyente: financiación pública de campañas", "value": 3},
  {"label": "Ninguna reforma funciona si la hacen los mismos políticos", "value": 4},
  {"label": "Reformas graduales con diálogo desde el centro político", "value": 5},
  {"label": "Fiscalía antimafia y tribunal de aforados", "value": 6},
  {"label": "Asamblea constituyente para refundar las instituciones", "value": 7}
]'::jsonb WHERE id = 'q8';

-- q9: Empleo
UPDATE questions SET options = '[
  {"label": "Flexibilizar contratación y reducir costos laborales al empleador", "value": 1},
  {"label": "Formalización laboral con zonas francas de empleo en regiones", "value": 2},
  {"label": "Emprendimiento, economía naranja y empleo femenino", "value": 3},
  {"label": "Las promesas de empleo nunca se cumplen y no tienen respaldo fiscal", "value": 4},
  {"label": "Infraestructura y proyectos públicos como motor de empleo masivo", "value": 5},
  {"label": "Empleo masivo vía vivienda, un millón de casas", "value": 6},
  {"label": "Economía del cuidado remunerada y cooperativismo comunitario", "value": 7}
]'::jsonb WHERE id = 'q9';

-- q10: Tecnologia
UPDATE questions SET options = '[
  {"label": "Soberanía digital y tecnología al servicio de lo público", "value": 1},
  {"label": "Modernización del Estado con gobierno abierto y transparencia", "value": 2},
  {"label": "Gobierno digital anticorrupción con datos abiertos", "value": 3},
  {"label": "Las propuestas tecnológicas de campaña son puro marketing", "value": 4},
  {"label": "Blockchain en salud y digitalización de trámites", "value": 5},
  {"label": "Colombia referente en IA, modernización digital del Estado", "value": 6},
  {"label": "Colombia hub gamer y tech de Latam con exenciones fiscales", "value": 7}
]'::jsonb WHERE id = 'q10';

-- q11-q30: Actualizar las preguntas adicionales con 7 opciones

UPDATE questions SET options = '[
  {"label": "Nacionalizar completamente energía y telecomunicaciones", "value": 1},
  {"label": "Mayor participación estatal en sectores estratégicos", "value": 2},
  {"label": "Economía mixta con Estado inteligente regulador", "value": 3},
  {"label": "No confío en ningún modelo económico propuesto", "value": 4},
  {"label": "Reactivación con vivienda masiva y reforma agraria", "value": 5},
  {"label": "Incentivos tributarios y atracción de inversión privada", "value": 6},
  {"label": "Estado mínimo, reducción drástica de impuestos", "value": 7}
]'::jsonb WHERE id = 'q11';

UPDATE questions SET options = '[
  {"label": "Impuestos altos a grandes fortunas para redistribuir riqueza", "value": 1},
  {"label": "Reforma tributaria progresiva moderada con enfoque social", "value": 2},
  {"label": "Lucha contra la evasión antes de subir impuestos", "value": 3},
  {"label": "No confío en que los impuestos se usen bien", "value": 4},
  {"label": "Equilibrio fiscal con inversión en lo que genere empleo", "value": 5},
  {"label": "Reducción de impuestos para incentivar inversión productiva", "value": 6},
  {"label": "Cero impuestos nuevos, reducir el Estado al mínimo", "value": 7}
]'::jsonb WHERE id = 'q12';

UPDATE questions SET options = '[
  {"label": "Solo hospitales públicos, eliminar ánimo de lucro en salud", "value": 1},
  {"label": "Red pública fuerte como prioridad con telemedicina rural", "value": 2},
  {"label": "Modelo mixto con red pública fortalecida y privados regulados", "value": 3},
  {"label": "Ningún modelo actual garantiza buena atención", "value": 4},
  {"label": "Competencia regulada con sostenibilidad financiera", "value": 5},
  {"label": "IA para diagnóstico, historia clínica digital universal", "value": 6},
  {"label": "Libre competencia donde hospitales privados lideren", "value": 7}
]'::jsonb WHERE id = 'q13';

UPDATE questions SET options = '[
  {"label": "Medicamentos gratuitos para todas las enfermedades sin excepción", "value": 1},
  {"label": "Acceso universal a medicamentos con puesto de mando presidencial", "value": 2},
  {"label": "Gratuitos para enfermedades graves, copago módico para el resto", "value": 3},
  {"label": "El acceso a medicamentos es un desastre sin solución a la vista", "value": 4},
  {"label": "Titularización de deuda para financiar acceso a medicamentos", "value": 5},
  {"label": "Subsidios focalizados con tecnología para distribución eficiente", "value": 6},
  {"label": "Medicamentos a domicilio con plan de emergencia de 90 días", "value": 7}
]'::jsonb WHERE id = 'q14';

UPDATE questions SET options = '[
  {"label": "Todo el dinero público debe ir a universidades públicas gratuitas", "value": 1},
  {"label": "Becas masivas y docentes bien pagados como profesionales de élite", "value": 2},
  {"label": "Becas públicas utilizables en cualquier universidad", "value": 3},
  {"label": "No confío en cómo se manejan los recursos educativos", "value": 4},
  {"label": "Computadores con conectividad para todos y escuela virtual", "value": 5},
  {"label": "Alianzas público-privadas con resultados medibles", "value": 6},
  {"label": "Las universidades privadas no necesitan subsidios, necesitan libertad", "value": 7}
]'::jsonb WHERE id = 'q15';

UPDATE questions SET options = '[
  {"label": "Educación técnica gratuita con el mismo prestigio que la universitaria", "value": 1},
  {"label": "Fortalecer formación técnica vinculada al empleo real en regiones", "value": 2},
  {"label": "Jornada única con énfasis en formación para el trabajo", "value": 3},
  {"label": "El sistema educativo completo necesita rehacerse", "value": 4},
  {"label": "Educación para el trabajo con conectividad y emprendimiento", "value": 5},
  {"label": "Educación STEM, programación desde primaria", "value": 6},
  {"label": "Que cada quien elija libremente sin intervención estatal", "value": 7}
]'::jsonb WHERE id = 'q16';

UPDATE questions SET options = '[
  {"label": "Dialogar con todos los grupos armados incluyendo bandas criminales", "value": 1},
  {"label": "Diálogo con guerrillas políticas, presencia integral en territorios", "value": 2},
  {"label": "Seguridad ciudadana inteligente, combate a microtráfico y extorsión", "value": 3},
  {"label": "Nada de lo que se ha intentado funciona", "value": 4},
  {"label": "Enfoque integral: fuerza pública más inversión social", "value": 5},
  {"label": "Inteligencia y desmantelamiento financiero del crimen", "value": 6},
  {"label": "Cero negociación, solo captura y judicialización", "value": 7}
]'::jsonb WHERE id = 'q17';

UPDATE questions SET options = '[
  {"label": "Reducir lo militar e invertir en desarrollo social de territorios", "value": 1},
  {"label": "Presencia integral del Estado con inteligencia sobre fuerza", "value": 2},
  {"label": "Policía comunitaria y prevención sobre represión", "value": 3},
  {"label": "Ni más soldados ni más tecnología resuelven el problema de fondo", "value": 4},
  {"label": "Equilibrio entre seguridad y recuperación de la esperanza", "value": 5},
  {"label": "Ciberseguridad, drones e inteligencia artificial para seguridad", "value": 6},
  {"label": "Más soldados y aumento significativo del presupuesto de defensa", "value": 7}
]'::jsonb WHERE id = 'q18';

UPDATE questions SET options = '[
  {"label": "El petróleo y el carbón son esenciales para la economía", "value": 1},
  {"label": "Seguir con hidrocarburos mientras se desarrollan alternativas", "value": 2},
  {"label": "Energías renovables combinadas con minería regulada", "value": 3},
  {"label": "Las promesas de transición energética nunca se cumplen", "value": 4},
  {"label": "Transición energética justa protegiendo el agua", "value": 5},
  {"label": "Colombia potencia de biodiversidad con mercados de carbono", "value": 6},
  {"label": "Dejar de explotar petróleo y carbón lo antes posible", "value": 7}
]'::jsonb WHERE id = 'q19';

UPDATE questions SET options = '[
  {"label": "Los recursos del subsuelo son de la nación, no de las comunidades", "value": 1},
  {"label": "Consultas informativas pero la decisión final es del gobierno", "value": 2},
  {"label": "Consulta previa con compensaciones justas", "value": 3},
  {"label": "No confío en ningún mecanismo de consulta actual", "value": 4},
  {"label": "Las comunidades deben participar activamente en las decisiones", "value": 5},
  {"label": "Comunidades como guardianes ambientales remunerados", "value": 6},
  {"label": "Las comunidades deben tener poder absoluto de veto", "value": 7}
]'::jsonb WHERE id = 'q20';

UPDATE questions SET options = '[
  {"label": "Eliminar subsidios y enfocarse en generar empleo formal", "value": 1},
  {"label": "Programas focalizados con graduación de beneficiarios", "value": 2},
  {"label": "Política social basada en evidencia y evaluación de impacto", "value": 3},
  {"label": "Los subsidios como están no funcionan y no confío en reformas", "value": 4},
  {"label": "Centros de emprendimiento donde mujeres estudien y trabajen", "value": 5},
  {"label": "Transferencias condicionadas a educación y capacitación", "value": 6},
  {"label": "Renta básica universal sin condiciones para toda familia vulnerable", "value": 7}
]'::jsonb WHERE id = 'q21';

UPDATE questions SET options = '[
  {"label": "Eliminar la mayoría de subsidios porque generan dependencia", "value": 1},
  {"label": "Obligar a trabajar o estudiar a cambio del subsidio", "value": 2},
  {"label": "Condiciones flexibles: estudiar, capacitarse o servir a la comunidad", "value": 3},
  {"label": "Ningún programa social actual saca a la gente de la pobreza", "value": 4},
  {"label": "Vivienda y emprendimiento como puerta de salida de la pobreza", "value": 5},
  {"label": "Inversión en primera infancia y sistema de cuidado", "value": 6},
  {"label": "Los subsidios deben ser un derecho sin condiciones", "value": 7}
]'::jsonb WHERE id = 'q22';

UPDATE questions SET options = '[
  {"label": "Cerco diplomático total hasta que haya democracia en Venezuela", "value": 1},
  {"label": "Relaciones condicionadas a garantías democráticas verificables", "value": 2},
  {"label": "Política exterior independiente y pragmática", "value": 3},
  {"label": "La relación con Venezuela es un desastre sin importar quién gobierne", "value": 4},
  {"label": "Diálogo diplomático usando remesas como palanca", "value": 5},
  {"label": "Cooperación regional buscando transición democrática pacífica", "value": 6},
  {"label": "Restablecer relaciones plenas con Venezuela sin condiciones", "value": 7}
]'::jsonb WHERE id = 'q23';

UPDATE questions SET options = '[
  {"label": "EE.UU. es nuestro aliado natural, no buscar sustitutos", "value": 1},
  {"label": "Fortalecer TLC con EE.UU. y abrir mercados pragmáticamente", "value": 2},
  {"label": "Diversificar hacia Asia sin debilitar relación con EE.UU.", "value": 3},
  {"label": "La política exterior colombiana es irrelevante para la vida diaria", "value": 4},
  {"label": "Relaciones diversificadas con liderazgo climático regional", "value": 5},
  {"label": "Multilateralismo activo con ingreso a OCDE como prioridad", "value": 6},
  {"label": "Priorizar relaciones con Latinoamérica y el Sur Global", "value": 7}
]'::jsonb WHERE id = 'q24';

UPDATE questions SET options = '[
  {"label": "Los congresistas deben terminar su periodo para dar estabilidad", "value": 1},
  {"label": "Reformas anticorrupción con tecnología sin tocar el marco actual", "value": 2},
  {"label": "Reforma electoral profunda sin constituyente", "value": 3},
  {"label": "La revocatoria se presta para manipulación política", "value": 4},
  {"label": "Reformas graduales con diálogo y centro político", "value": 5},
  {"label": "Fiscalía antimafia y tribunal especial para aforados", "value": 6},
  {"label": "Revocatoria popular para todos los cargos electos", "value": 7}
]'::jsonb WHERE id = 'q25';

UPDATE questions SET options = '[
  {"label": "Libertad total de financiación con transparencia", "value": 1},
  {"label": "Aportes privados transparentes con auditorías automatizadas", "value": 2},
  {"label": "Financiación mayoritariamente pública con topes a aportes privados", "value": 3},
  {"label": "Da igual quién financie, la corrupción se mete por cualquier lado", "value": 4},
  {"label": "Control ciudadano del dinero en campañas con tecnología", "value": 5},
  {"label": "Crear fiscalía especializada contra la corrupción en campañas", "value": 6},
  {"label": "100% financiación pública, prohibir completamente aportes privados", "value": 7}
]'::jsonb WHERE id = 'q26';

UPDATE questions SET options = '[
  {"label": "Congelar el mínimo y dejar que el mercado fije salarios", "value": 1},
  {"label": "Salario mínimo diferenciado por región y sector", "value": 2},
  {"label": "Aumento gradual vinculado a productividad e inflación", "value": 3},
  {"label": "El salario mínimo no alcanza pero subirlo no resuelve nada", "value": 4},
  {"label": "Empleo masivo vía infraestructura con salarios dignos", "value": 5},
  {"label": "Formalización laboral con incentivos para que empresas paguen mejor", "value": 6},
  {"label": "Subir significativamente el salario mínimo como prioridad", "value": 7}
]'::jsonb WHERE id = 'q27';

UPDATE questions SET options = '[
  {"label": "El Estado no debe crear empleo, solo facilitar condiciones al privado", "value": 1},
  {"label": "Zonas francas de empleo con incentivos tributarios regionales", "value": 2},
  {"label": "Emprendimiento y economía creativa como generadores de empleo", "value": 3},
  {"label": "El empleo público crea burocracia pero el privado no llega a todas partes", "value": 4},
  {"label": "440 mil empleos con proyectos de infraestructura pública", "value": 5},
  {"label": "Un millón de viviendas como motor de empleo masivo", "value": 6},
  {"label": "Programa masivo de empleo público en zonas con alta pobreza", "value": 7}
]'::jsonb WHERE id = 'q28';

UPDATE questions SET options = '[
  {"label": "Regular la IA estrictamente para proteger empleos colombianos", "value": 1},
  {"label": "Tecnología al servicio de los ciudadanos con gobierno abierto", "value": 2},
  {"label": "Regulación inteligente que proteja derechos sin frenar innovación", "value": 3},
  {"label": "Ningún político entiende la tecnología para regularla bien", "value": 4},
  {"label": "Blockchain para transparencia en salud y servicios públicos", "value": 5},
  {"label": "Sandbox regulatorio: probar primero, regular después", "value": 6},
  {"label": "Cero regulación, Colombia hub de IA más libre de Latam", "value": 7}
]'::jsonb WHERE id = 'q29';

UPDATE questions SET options = '[
  {"label": "Soberanía digital: los datos de colombianos deben quedarse en Colombia", "value": 1},
  {"label": "Digitalización del Estado con enfoque de equidad y acceso universal", "value": 2},
  {"label": "Gobierno digital anticorrupción con trámites 100% en línea", "value": 3},
  {"label": "Una agencia de vigilancia digital me preocupa más de lo que me protege", "value": 4},
  {"label": "Digitalización de trámites con transparencia algorítmica", "value": 5},
  {"label": "Colombia referente en IA con datos abiertos como estándar", "value": 6},
  {"label": "Agencia fuerte con capacidad amplia de vigilancia contra el crimen", "value": 7}
]'::jsonb WHERE id = 'q30';
