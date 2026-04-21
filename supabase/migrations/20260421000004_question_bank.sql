-- Agregar columna para preguntas asignadas por sesion
ALTER TABLE sessions ADD COLUMN assigned_questions TEXT[];

-- 20 preguntas nuevas (3 por eje × 10 ejes = 30 total)
-- Las existentes (q1-q10) se mantienen

-- Economia (q11, q12) — complementan q1
INSERT INTO questions (id, text, axis, context, sort_order) VALUES
('q11',
 'El gobierno debería nacionalizar sectores estratégicos como la energía y las telecomunicaciones.',
 'economia',
 'En Colombia, sectores como la energía y las telecomunicaciones tienen participación mixta. Algunos proponen mayor control estatal, otros defienden la privatización como motor de eficiencia.',
 11),
('q12',
 'Los impuestos a las grandes fortunas son necesarios para reducir la desigualdad en Colombia.',
 'economia',
 'Colombia es uno de los países más desiguales de América Latina. El debate fiscal oscila entre gravar más a los ricos o reducir impuestos para incentivar la inversión.',
 12),

-- Salud (q13, q14) — complementan q2
('q13',
 'Los hospitales públicos deberían competir en igualdad de condiciones con las clínicas privadas.',
 'salud',
 'El sistema de salud colombiano tiene un componente público y uno privado. La discusión es si fortalecer la red pública, incentivar la competencia, o crear un sistema único.',
 13),
('q14',
 'El gobierno debe garantizar medicamentos gratuitos para todas las enfermedades crónicas.',
 'salud',
 'Miles de colombianos enfrentan barreras para acceder a medicamentos esenciales. Las propuestas van desde subsidios focalizados hasta cobertura universal de medicamentos.',
 14),

-- Educacion (q15, q16) — complementan q3
('q15',
 'Las universidades privadas deberían recibir subsidios del Estado para reducir el costo de las matrículas.',
 'educacion',
 'La educación superior en Colombia es costosa en el sector privado. Algunos proponen subsidiar la demanda (becas), otros fortalecer exclusivamente la oferta pública.',
 15),
('q16',
 'La educación técnica y tecnológica debería tener el mismo prestigio y financiación que la universitaria.',
 'educacion',
 'La informalidad laboral supera el 55% y muchos empleos requieren formación técnica. Sin embargo, la educación técnica históricamente ha tenido menor reconocimiento social.',
 16),

-- Seguridad (q17, q18) — complementan q4
('q17',
 'Colombia debería negociar con todos los grupos armados ilegales, incluyendo bandas criminales.',
 'seguridad',
 'La política de "paz total" propone diálogo con todos los actores armados. Los críticos argumentan que negociar con bandas criminales legitima el crimen organizado.',
 17),
('q18',
 'Las fuerzas armadas necesitan más recursos tecnológicos y de inteligencia, no más soldados.',
 'seguridad',
 'El debate sobre modernización militar oscila entre aumentar el pie de fuerza tradicional o invertir en inteligencia, drones y ciberseguridad.',
 18),

-- Ambiente (q19, q20) — complementan q5
('q19',
 'Colombia debería dejar de exportar petróleo y carbón antes de 2035 para cumplir metas climáticas.',
 'ambiente',
 'Colombia depende significativamente de las exportaciones de hidrocarburos. La transición energética implica costos económicos a corto plazo pero beneficios ambientales a largo plazo.',
 19),
('q20',
 'Las comunidades locales deberían tener poder de veto sobre proyectos mineros y energéticos en su territorio.',
 'ambiente',
 'Las consultas populares sobre minería han generado debate jurídico. Algunos defienden la autonomía territorial, otros argumentan que los recursos del subsuelo son de la nación.',
 20),

-- Politica social (q21, q22) — complementan q6
('q21',
 'Una renta básica universal sería más efectiva que los programas sociales focalizados que existen hoy.',
 'politica_social',
 'Colombia tiene múltiples programas sociales (Familias en Acción, Renta Ciudadana). El debate es si unificarlos en una renta universal o mantener la focalización.',
 21),
('q22',
 'Los subsidios del gobierno deberían estar condicionados a que los beneficiarios trabajen o estudien.',
 'politica_social',
 'Los programas de transferencias condicionadas han mostrado resultados mixtos. Algunos argumentan que las condiciones excluyen a los más vulnerables.',
 22),

-- Politica exterior (q23, q24) — complementan q7
('q23',
 'Colombia debería restablecer relaciones diplomáticas plenas con Venezuela sin condiciones previas.',
 'politica_exterior',
 'Las relaciones con Venezuela han sido un tema divisivo. Algunos abogan por el diálogo sin condiciones, otros exigen garantías democráticas como requisito.',
 23),
('q24',
 'El país debería reducir su dependencia comercial de Estados Unidos diversificando hacia Asia y el Pacífico.',
 'politica_exterior',
 'EE.UU. es el principal socio comercial de Colombia. La diversificación hacia Asia ofrece oportunidades pero requiere inversión en infraestructura y diplomacia.',
 24),

-- Reforma politica (q25, q26) — complementan q8
('q25',
 'Los congresistas deberían poder ser revocados por voto popular antes de terminar su periodo.',
 'reforma_politica',
 'La revocatoria del mandato existe para alcaldes y gobernadores pero no para congresistas. Ampliarla podría aumentar la rendición de cuentas o generar inestabilidad.',
 25),
('q26',
 'El financiamiento de las campañas políticas debería ser exclusivamente público, sin aportes privados.',
 'reforma_politica',
 'La influencia del dinero privado en las campañas es un tema recurrente. La financiación pública total podría reducir la corrupción pero limitar la participación.',
 26),

-- Empleo (q27, q28) — complementan q9
('q27',
 'El salario mínimo debería aumentar significativamente aunque esto encarezca la contratación formal.',
 'empleo',
 'El salario mínimo en Colombia es tema de debate anual. Un aumento significativo mejoraría el ingreso de los trabajadores pero podría aumentar la informalidad.',
 27),
('q28',
 'El gobierno debería crear un programa masivo de empleo público en las zonas con mayor informalidad.',
 'empleo',
 'La informalidad se concentra en zonas rurales y periferias urbanas. Los programas de empleo público pueden ser efectivos pero costosos fiscalmente.',
 28),

-- Tecnologia (q29, q30) — complementan q10
('q29',
 'El gobierno debería regular estrictamente el uso de inteligencia artificial para proteger empleos tradicionales.',
 'tecnologia',
 'La IA está transformando sectores como manufactura, servicios y agricultura. El debate es entre regular para proteger empleos o incentivar la adopción para ganar competitividad.',
 29),
('q30',
 'Colombia necesita una agencia nacional de ciberseguridad con capacidad de vigilancia digital amplia.',
 'tecnologia',
 'Los ciberataques a entidades públicas han aumentado. Una agencia fuerte mejoraría la seguridad pero genera preocupaciones sobre privacidad y vigilancia estatal.',
 30);
