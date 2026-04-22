-- Agregar opciones de respuesta a las preguntas
-- Cada pregunta tendra 5 opciones concretas en vez de escala Likert abstracta
ALTER TABLE questions ADD COLUMN options JSONB;

-- Actualizar las 10 preguntas originales con opciones concretas
-- Cada opcion tiene: label (texto), value (1-5), description (contexto opcional)

-- q1: Economia - Control de precios
UPDATE questions SET options = '[
  {"label": "El Estado debe fijar precios de la canasta básica directamente", "value": 1},
  {"label": "Subsidios focalizados a familias vulnerables para que compren más barato", "value": 2},
  {"label": "No estoy seguro, depende de cómo se implemente", "value": 3},
  {"label": "Incentivos al agro y la producción para que los precios bajen naturalmente", "value": 4},
  {"label": "El mercado debe regular los precios sin intervención del Estado", "value": 5}
]'::jsonb WHERE id = 'q1';

-- q2: Salud - Sistema de salud
UPDATE questions SET options = '[
  {"label": "Eliminar las EPS y crear un sistema 100% público", "value": 1},
  {"label": "Fortalecer la red pública pero mantener opción privada complementaria", "value": 2},
  {"label": "No tengo claro cuál modelo funcionaría mejor", "value": 3},
  {"label": "Regular las EPS con más exigencia pero mantenerlas", "value": 4},
  {"label": "Que las EPS compitan libremente y el usuario elija", "value": 5}
]'::jsonb WHERE id = 'q2';

-- q3: Educacion - Gratuidad universitaria
UPDATE questions SET options = '[
  {"label": "Universidad pública gratuita para todos, sin importar el estrato", "value": 1},
  {"label": "Gratuidad solo para estratos bajos, becas por mérito para los demás", "value": 2},
  {"label": "No estoy seguro de cuál es la mejor fórmula", "value": 3},
  {"label": "Alianzas público-privadas y educación técnica como prioridad", "value": 4},
  {"label": "Vouchers para que las familias elijan dónde estudiar", "value": 5}
]'::jsonb WHERE id = 'q3';

-- q4: Seguridad - Presencia militar
UPDATE questions SET options = '[
  {"label": "Diálogo con todos los actores armados e inversión social en territorios", "value": 1},
  {"label": "Presencia integral del Estado: no solo militar sino también jueces, escuelas, hospitales", "value": 2},
  {"label": "Ninguna estrategia actual me convence", "value": 3},
  {"label": "Inteligencia y tecnología más que fuerza bruta", "value": 4},
  {"label": "Aumentar el pie de fuerza militar y mano dura contra el crimen", "value": 5}
]'::jsonb WHERE id = 'q4';

-- q5: Ambiente - Mineria en paramos
UPDATE questions SET options = '[
  {"label": "Prohibir toda minería y acelerar la transición a energías limpias ya", "value": 1},
  {"label": "Proteger páramos pero permitir transición energética gradual", "value": 2},
  {"label": "No tengo una posición clara sobre esto", "value": 3},
  {"label": "Minería regulada con compensación ambiental", "value": 4},
  {"label": "La minería responsable es necesaria para el desarrollo del país", "value": 5}
]'::jsonb WHERE id = 'q5';

-- q6: Politica social - Transferencias
UPDATE questions SET options = '[
  {"label": "Renta básica universal para todos los colombianos vulnerables", "value": 1},
  {"label": "Programas sociales basados en evidencia con evaluación de impacto", "value": 2},
  {"label": "No me convence ningún modelo actual de subsidios", "value": 3},
  {"label": "Subsidios condicionados a que la gente trabaje o estudie", "value": 4},
  {"label": "Reducir subsidios y que el empleo sea la mejor política social", "value": 5}
]'::jsonb WHERE id = 'q6';

-- q7: Politica exterior - Integracion latinoamericana
UPDATE questions SET options = '[
  {"label": "Integración profunda con Latinoamérica y el Sur Global", "value": 1},
  {"label": "Multilateralismo activo y relaciones diversificadas", "value": 2},
  {"label": "No tengo posición clara sobre política exterior", "value": 3},
  {"label": "Relaciones pragmáticas priorizando comercio e inversión", "value": 4},
  {"label": "Alianza firme con EE.UU. y las democracias de Occidente", "value": 5}
]'::jsonb WHERE id = 'q7';

-- q8: Reforma politica - Constituyente
UPDATE questions SET options = '[
  {"label": "Asamblea constituyente para refundar las instituciones del país", "value": 1},
  {"label": "Reformas profundas sin constituyente: financiación pública de campañas, revocatoria", "value": 2},
  {"label": "Ninguna reforma funciona si la hacen los mismos políticos", "value": 3},
  {"label": "Reformas graduales anticorrupción con tecnología", "value": 4},
  {"label": "Mantener el marco actual y fortalecer las instituciones existentes", "value": 5}
]'::jsonb WHERE id = 'q8';

-- q9: Empleo - Incentivos fiscales
UPDATE questions SET options = '[
  {"label": "El gobierno debe crear empleo público masivo en las regiones", "value": 1},
  {"label": "Inversión en infraestructura y proyectos públicos como motor de empleo", "value": 2},
  {"label": "Las promesas de empleo nunca se cumplen, no confío en ninguna", "value": 3},
  {"label": "Incentivos fiscales para que las empresas contraten más", "value": 4},
  {"label": "Flexibilizar la contratación y reducir costos laborales", "value": 5}
]'::jsonb WHERE id = 'q9';

-- q10: Tecnologia - IA y automatizacion
UPDATE questions SET options = '[
  {"label": "Regular la IA para proteger empleos y garantizar soberanía digital", "value": 1},
  {"label": "Digitalización del Estado con enfoque de equidad y acceso universal", "value": 2},
  {"label": "Las propuestas tecnológicas de los candidatos son puro marketing", "value": 3},
  {"label": "Gobierno digital, datos abiertos y regulación inteligente de IA", "value": 4},
  {"label": "Inversión agresiva en IA, startups y Colombia como hub tech de Latam", "value": 5}
]'::jsonb WHERE id = 'q10';

-- Actualizar las 20 preguntas adicionales (q11-q30)

-- q11: Economia - Nacionalizacion
UPDATE questions SET options = '[
  {"label": "Nacionalizar sectores estratégicos como energía y telecomunicaciones", "value": 1},
  {"label": "Mayor participación estatal pero sin nacionalizar completamente", "value": 2},
  {"label": "No estoy seguro sobre la nacionalización", "value": 3},
  {"label": "Asociaciones público-privadas con regulación fuerte", "value": 4},
  {"label": "Los sectores estratégicos funcionan mejor en manos privadas", "value": 5}
]'::jsonb WHERE id = 'q11';

-- q12: Economia - Impuestos a grandes fortunas
UPDATE questions SET options = '[
  {"label": "Impuestos altos a las grandes fortunas para redistribuir riqueza", "value": 1},
  {"label": "Reforma tributaria progresiva moderada", "value": 2},
  {"label": "No confío en que los impuestos se usen bien", "value": 3},
  {"label": "Impuestos bajos con incentivos para la inversión productiva", "value": 4},
  {"label": "Reducir impuestos para que los ricos inviertan y generen empleo", "value": 5}
]'::jsonb WHERE id = 'q12';

-- q13: Salud - Hospitales publicos vs privados
UPDATE questions SET options = '[
  {"label": "Solo hospitales públicos de excelencia, eliminar el ánimo de lucro en salud", "value": 1},
  {"label": "Red pública fuerte con privados como complemento regulado", "value": 2},
  {"label": "Ningún modelo actual garantiza buena atención", "value": 3},
  {"label": "Competencia regulada entre públicos y privados", "value": 4},
  {"label": "Libre competencia donde los hospitales privados lideren", "value": 5}
]'::jsonb WHERE id = 'q13';

-- q14: Salud - Medicamentos gratuitos
UPDATE questions SET options = '[
  {"label": "Medicamentos gratuitos para todas las enfermedades, sin excepción", "value": 1},
  {"label": "Gratuitos para enfermedades crónicas y graves, copago para lo demás", "value": 2},
  {"label": "El acceso a medicamentos es un desastre y ningún plan lo resuelve", "value": 3},
  {"label": "Subsidios focalizados a quien no pueda pagar", "value": 4},
  {"label": "Cada quien paga sus medicamentos según su capacidad", "value": 5}
]'::jsonb WHERE id = 'q14';

-- q15: Educacion - Subsidios a universidades privadas
UPDATE questions SET options = '[
  {"label": "Todo el dinero público debe ir a universidades públicas gratuitas", "value": 1},
  {"label": "Becas públicas que se puedan usar en cualquier universidad", "value": 2},
  {"label": "No confío en cómo se manejan los recursos educativos", "value": 3},
  {"label": "Subsidios a privadas que demuestren calidad y resultados", "value": 4},
  {"label": "Las universidades privadas no necesitan subsidios, necesitan libertad", "value": 5}
]'::jsonb WHERE id = 'q15';

-- q16: Educacion - Tecnica vs universitaria
UPDATE questions SET options = '[
  {"label": "La educación técnica debe ser gratuita y con el mismo prestigio que la universitaria", "value": 1},
  {"label": "Fortalecer ambas con énfasis en formación para el empleo real", "value": 2},
  {"label": "El sistema educativo completo necesita rehacerse", "value": 3},
  {"label": "La educación técnica debe ser liderada por el sector privado", "value": 4},
  {"label": "Que cada quien elija libremente su camino educativo sin intervención estatal", "value": 5}
]'::jsonb WHERE id = 'q16';

-- q17: Seguridad - Negociar con bandas
UPDATE questions SET options = '[
  {"label": "Dialogar con todos los grupos armados incluyendo bandas criminales", "value": 1},
  {"label": "Diálogo solo con guerrillas políticas, mano firme con bandas", "value": 2},
  {"label": "Nada de lo que se ha intentado funciona", "value": 3},
  {"label": "Inteligencia y desmantelamiento financiero, no negociación", "value": 4},
  {"label": "Cero negociación, solo captura y judicialización", "value": 5}
]'::jsonb WHERE id = 'q17';

-- q18: Seguridad - Tecnologia vs pie de fuerza
UPDATE questions SET options = '[
  {"label": "Reducir lo militar e invertir en desarrollo social de los territorios", "value": 1},
  {"label": "Presencia integral del Estado con inteligencia sobre fuerza bruta", "value": 2},
  {"label": "Ni más soldados ni más tecnología resuelven el problema de fondo", "value": 3},
  {"label": "Ciberseguridad, drones e inteligencia artificial para seguridad", "value": 4},
  {"label": "Más soldados en la calle y aumento del presupuesto de defensa", "value": 5}
]'::jsonb WHERE id = 'q18';

-- q19: Ambiente - Dejar de exportar petroleo
UPDATE questions SET options = '[
  {"label": "Dejar de explotar petróleo y carbón lo antes posible", "value": 1},
  {"label": "Transición gradual a renovables con plazo definido", "value": 2},
  {"label": "Las promesas de transición energética nunca se cumplen", "value": 3},
  {"label": "Seguir con hidrocarburos mientras se desarrollan alternativas", "value": 4},
  {"label": "El petróleo y el carbón son esenciales para la economía colombiana", "value": 5}
]'::jsonb WHERE id = 'q19';

-- q20: Ambiente - Veto comunitario a mineria
UPDATE questions SET options = '[
  {"label": "Las comunidades deben tener poder absoluto de veto sobre proyectos en su territorio", "value": 1},
  {"label": "Consulta previa vinculante con compensaciones justas", "value": 2},
  {"label": "No confío en ningún mecanismo de consulta actual", "value": 3},
  {"label": "Consultas informativas pero la decisión final es del gobierno nacional", "value": 4},
  {"label": "Los recursos del subsuelo son de la nación, no de las comunidades locales", "value": 5}
]'::jsonb WHERE id = 'q20';

-- q21: Politica social - Renta basica universal
UPDATE questions SET options = '[
  {"label": "Renta básica universal sin condiciones para toda familia vulnerable", "value": 1},
  {"label": "Transferencias con evaluación de impacto y graduación de beneficiarios", "value": 2},
  {"label": "Los subsidios como están no funcionan y no confío en reformas", "value": 3},
  {"label": "Subsidios solo a cambio de trabajo o estudio", "value": 4},
  {"label": "Eliminar subsidios y enfocarse en generar empleo formal", "value": 5}
]'::jsonb WHERE id = 'q21';

-- q22: Politica social - Subsidios condicionados
UPDATE questions SET options = '[
  {"label": "Los subsidios deben ser un derecho, sin condiciones", "value": 1},
  {"label": "Condiciones flexibles: estudiar, capacitarse o participar en comunidad", "value": 2},
  {"label": "Ningún programa social actual saca a la gente de la pobreza", "value": 3},
  {"label": "Obligar a trabajar o estudiar a cambio del subsidio", "value": 4},
  {"label": "Eliminar la mayoría de subsidios porque generan dependencia", "value": 5}
]'::jsonb WHERE id = 'q22';

-- q23: Politica exterior - Venezuela
UPDATE questions SET options = '[
  {"label": "Restablecer relaciones plenas con Venezuela sin condiciones", "value": 1},
  {"label": "Diálogo diplomático buscando una transición democrática", "value": 2},
  {"label": "La relación con Venezuela es un desastre sin importar quién gobierne", "value": 3},
  {"label": "Relaciones condicionadas a garantías democráticas verificables", "value": 4},
  {"label": "Cerco diplomático total hasta que haya democracia en Venezuela", "value": 5}
]'::jsonb WHERE id = 'q23';

-- q24: Politica exterior - Diversificar de EEUU a Asia
UPDATE questions SET options = '[
  {"label": "Priorizar relaciones con Latinoamérica y el Sur Global sobre EE.UU.", "value": 1},
  {"label": "Diversificar hacia Asia sin debilitar la relación con EE.UU.", "value": 2},
  {"label": "La política exterior colombiana es irrelevante para la vida diaria", "value": 3},
  {"label": "Fortalecer el TLC con EE.UU. y abrir nuevos mercados pragmáticamente", "value": 4},
  {"label": "EE.UU. es nuestro aliado natural y no debemos buscar sustitutos", "value": 5}
]'::jsonb WHERE id = 'q24';

-- q25: Reforma politica - Revocatoria de congresistas
UPDATE questions SET options = '[
  {"label": "Revocatoria popular para todos los cargos electos incluyendo congresistas", "value": 1},
  {"label": "Revocatoria con umbrales altos para evitar inestabilidad", "value": 2},
  {"label": "La revocatoria suena bien pero se presta para manipulación", "value": 3},
  {"label": "Mejor fortalecer los mecanismos de control existentes", "value": 4},
  {"label": "Los congresistas deben terminar su periodo para dar estabilidad", "value": 5}
]'::jsonb WHERE id = 'q25';

-- q26: Reforma politica - Financiacion publica de campañas
UPDATE questions SET options = '[
  {"label": "100% financiación pública, prohibir completamente aportes privados", "value": 1},
  {"label": "Financiación mayoritariamente pública con topes estrictos a aportes privados", "value": 2},
  {"label": "Da igual quién financie, la corrupción se mete por cualquier lado", "value": 3},
  {"label": "Aportes privados transparentes con rendición de cuentas pública", "value": 4},
  {"label": "Libertad total de financiación con transparencia", "value": 5}
]'::jsonb WHERE id = 'q26';

-- q27: Empleo - Salario minimo
UPDATE questions SET options = '[
  {"label": "Subir significativamente el salario mínimo aunque suba la inflación", "value": 1},
  {"label": "Aumento gradual vinculado a productividad e inflación", "value": 2},
  {"label": "El salario mínimo no alcanza pero subirlo no resuelve nada", "value": 3},
  {"label": "Salario mínimo diferenciado por región y sector", "value": 4},
  {"label": "Congelar el mínimo y dejar que el mercado fije salarios", "value": 5}
]'::jsonb WHERE id = 'q27';

-- q28: Empleo - Empleo publico masivo
UPDATE questions SET options = '[
  {"label": "Programa masivo de empleo público en zonas con alta pobreza", "value": 1},
  {"label": "Empleo público focalizado en infraestructura y servicios esenciales", "value": 2},
  {"label": "El empleo público solo crea burocracia, pero el privado no llega a todas partes", "value": 3},
  {"label": "Incentivos al sector privado para que contrate en regiones apartadas", "value": 4},
  {"label": "El Estado no debe crear empleo, solo facilitar las condiciones para el sector privado", "value": 5}
]'::jsonb WHERE id = 'q28';

-- q29: Tecnologia - Regular IA
UPDATE questions SET options = '[
  {"label": "Regular estrictamente la IA para proteger empleos colombianos", "value": 1},
  {"label": "Regulación inteligente que proteja derechos sin frenar la innovación", "value": 2},
  {"label": "Ningún político entiende la tecnología lo suficiente para regularla bien", "value": 3},
  {"label": "Sandbox regulatorio: probar primero, regular después", "value": 4},
  {"label": "Cero regulación, Colombia debe ser el hub de IA más libre de Latam", "value": 5}
]'::jsonb WHERE id = 'q29';

-- q30: Tecnologia - Agencia de ciberseguridad
UPDATE questions SET options = '[
  {"label": "Soberanía digital: los datos de los colombianos deben quedarse en Colombia", "value": 1},
  {"label": "Agencia de ciberseguridad con controles ciudadanos contra el abuso", "value": 2},
  {"label": "Una agencia de vigilancia digital me preocupa más de lo que me protege", "value": 3},
  {"label": "Ciberseguridad enfocada en proteger infraestructura crítica, no en vigilar ciudadanos", "value": 4},
  {"label": "Agencia fuerte con capacidad amplia de vigilancia para combatir el crimen", "value": 5}
]'::jsonb WHERE id = 'q30';
