# VotoLoco.com — Especificación Completa del Backend

## CONTEXTO GENERAL

VotoLoco es una plataforma cívica colombiana que mide afinidad programática
entre votantes y candidatos presidenciales de Colombia 2026. El frontend ya
está construido (Next.js 16, TypeScript, Tailwind, shadcn/ui) y consume una
API REST. Este documento describe TODO lo que el backend debe implementar
para que el frontend funcione al 100%.

**Importante:** VotoLoco NO es una encuesta electoral. NO mide intención de
voto. Mide afinidad programática entre las respuestas del usuario y las
propuestas oficiales publicadas por cada candidato. Esta distinción es
LEGAL y debe reflejarse en toda la lógica, los nombres de campos, y las
respuestas de la API.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STACK RECOMENDADO (flexible)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Runtime: Node.js 20+ / Python 3.12+ / lo que prefieras
- Base de datos: PostgreSQL (Supabase) o equivalente relacional
- Cache: Redis para stats agregadas y rate limiting
- Cola: Bull/BullMQ o similar para procesamiento async del match
- IA: Claude API (Anthropic) o GPT-4 para análisis de propuestas
- Storage: S3/Supabase Storage para PDFs de programas de gobierno
- Hosting: Vercel Edge Functions, Railway, Fly.io, o similar
- Analytics: Plausible/Umami (privacy-first, sin cookies)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODELO DE DATOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### candidates
```sql
CREATE TABLE candidates (
  id            TEXT PRIMARY KEY,        -- ej: "c1"
  slug          TEXT UNIQUE NOT NULL,    -- ej: "maria-valencia"
  name          TEXT NOT NULL,           -- "María Valencia"
  party         TEXT NOT NULL,           -- "Alianza Verde Esperanza"
  color         TEXT NOT NULL,           -- "#22C55E"
  bio           TEXT NOT NULL,           -- Biografía corta
  program_pdf   TEXT,                    -- URL al PDF del programa oficial
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### candidate_positions
Posiciones de cada candidato en cada eje temático. Generadas por IA a
partir del programa de gobierno, pero revisadas/curadas manualmente.
```sql
CREATE TABLE candidate_positions (
  id              SERIAL PRIMARY KEY,
  candidate_id    TEXT REFERENCES candidates(id),
  axis            TEXT NOT NULL,          -- ej: "economia", "salud", etc.
  summary         TEXT NOT NULL,          -- Resumen de ~2 oraciones
  quote           TEXT NOT NULL,          -- Cita textual <20 palabras del programa
  program_page    INT,                    -- Número de página en el PDF
  stance_score    INT NOT NULL,           -- 1-5 (posición en el espectro del eje)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, axis)
);
```

### questions
Las 10 preguntas del quiz. Una por eje temático.
```sql
CREATE TABLE questions (
  id          TEXT PRIMARY KEY,          -- ej: "q1"
  text        TEXT NOT NULL,             -- La pregunta/afirmación
  axis        TEXT NOT NULL,             -- "economia", "salud", etc.
  context     TEXT,                      -- Texto neutral de "¿Por qué es importante?"
  sort_order  INT NOT NULL,              -- Orden de presentación (1-10)
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### sessions
Cada usuario que inicia el test genera una sesión anónima.
```sql
CREATE TABLE sessions (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  age_range             TEXT NOT NULL,     -- "18-24","25-34","35-49","50-64","65+"
  region                TEXT NOT NULL,     -- "caribe","andina","pacifica","orinoquia","amazonia","insular"
  gender                TEXT,              -- "m","f","nb","na" (opcional)
  initial_preference    TEXT NOT NULL,     -- candidate_id | "undecided" | "blank" | "na"
  status                TEXT DEFAULT 'created', -- "created","answering","processing","done"
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  completed_at          TIMESTAMPTZ
);
-- NO almacenar IP, user agent, ni datos identificables.
-- El session ID es un UUID opaco, no vinculable a una persona.
```

### answers
Respuestas del usuario a cada pregunta.
```sql
CREATE TABLE answers (
  id            SERIAL PRIMARY KEY,
  session_id    TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  question_id   TEXT REFERENCES questions(id),
  value         INT NOT NULL,             -- 1-5 (escala Likert)
  weight        INT NOT NULL DEFAULT 2,   -- 1-3 (importancia asignada por el usuario)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);
```

### match_results
Resultado calculado del match por sesión.
```sql
CREATE TABLE match_results (
  id                SERIAL PRIMARY KEY,
  session_id        TEXT UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  preference_match  BOOLEAN NOT NULL,      -- ¿coincide initial_preference con top1?
  calculated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### match_result_candidates
Score de afinidad por candidato por sesión.
```sql
CREATE TABLE match_result_candidates (
  id              SERIAL PRIMARY KEY,
  session_id      TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  candidate_id    TEXT REFERENCES candidates(id),
  score           INT NOT NULL,            -- 0-100
  rank            INT NOT NULL,            -- 1 = mayor afinidad
  summary         TEXT NOT NULL,           -- Resumen generado por IA
  UNIQUE(session_id, candidate_id)
);
```

### match_result_axes
Detalle del match por eje temático por candidato por sesión.
```sql
CREATE TABLE match_result_axes (
  id                  SERIAL PRIMARY KEY,
  session_id          TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  candidate_id        TEXT REFERENCES candidates(id),
  axis                TEXT NOT NULL,
  user_stance         TEXT NOT NULL,         -- Interpretación de la respuesta del usuario
  candidate_stance    TEXT NOT NULL,         -- Posición del candidato en este eje
  quote               TEXT NOT NULL,         -- Cita del programa (<20 palabras)
  program_page        INT,
  UNIQUE(session_id, candidate_id, axis)
);
```

### stats_cache (materializada o Redis)
Para el dashboard público. Se recalcula periódicamente.
```sql
CREATE TABLE stats_cache (
  key         TEXT PRIMARY KEY,            -- ej: "public_stats"
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOS 10 EJES TEMÁTICOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Valores válidos para el campo `axis` en toda la base de datos:

  1. economia
  2. salud
  3. educacion
  4. seguridad
  5. ambiente
  6. politica_social
  7. politica_exterior
  8. reforma_politica
  9. empleo
  10. tecnologia

Cada eje tiene un espectro. Por ejemplo:
- economia: 1=Estado interventor ← → 5=Libre mercado total
- seguridad: 1=Diálogo/inversión social ← → 5=Mano dura militar
- ambiente: 1=Extractivismo ← → 5=Transición verde radical

El `stance_score` de cada candidato y el `value` de cada respuesta del
usuario operan en la misma escala 1-5 para hacer la comparación.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API ENDPOINTS (REST)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Base URL: https://api.votoloco.com (o el dominio que se configure)
Content-Type: application/json en todo.
CORS: permitir https://votoloco.com y http://localhost:3000 (dev)

----------------------------------------------
GET /api/candidates
----------------------------------------------
Devuelve la lista de candidatos activos.
No requiere autenticación.

Response 200:
```json
{
  "candidates": [
    {
      "id": "c1",
      "slug": "maria-valencia",
      "name": "María Valencia",
      "party": "Alianza Verde Esperanza",
      "color": "#22C55E",
      "bio": "Economista con maestría...",
      "programPdfUrl": "https://storage.votoloco.com/programs/maria-valencia.pdf"
    }
  ]
}
```

Notas:
- Orden: alfabético por apellido, o aleatorio en cada request.
  NUNCA ordenar por popularidad ni afinidad agregada.
- Incluir solo candidatos con active=true.

----------------------------------------------
GET /api/candidates/:slug
----------------------------------------------
Devuelve el perfil completo de un candidato con sus posiciones por eje.

Response 200:
```json
{
  "candidate": {
    "id": "c1",
    "slug": "maria-valencia",
    "name": "María Valencia",
    "party": "Alianza Verde Esperanza",
    "color": "#22C55E",
    "bio": "...",
    "programPdfUrl": "https://...",
    "positions": {
      "economia": {
        "summary": "Propone intervención estatal en precios de canasta básica...",
        "quote": "Regularemos precios de canasta básica para proteger...",
        "programPage": 23
      },
      "salud": { ... },
      "educacion": { ... },
      "seguridad": { ... },
      "ambiente": { ... },
      "politica_social": { ... },
      "politica_exterior": { ... },
      "reforma_politica": { ... },
      "empleo": { ... },
      "tecnologia": { ... }
    }
  }
}
```

----------------------------------------------
GET /api/quiz/questions
----------------------------------------------
Devuelve las 10 preguntas del quiz en orden.

Response 200:
```json
{
  "questions": [
    {
      "id": "q1",
      "text": "El Estado debería controlar los precios de los alimentos básicos de la canasta familiar.",
      "axis": "economia",
      "context": "Colombia enfrenta una inflación acumulada que afecta..."
    }
  ]
}
```

Notas:
- Siempre devolver en sort_order ascendente.
- Solo preguntas con active=true.
- El campo `context` es el texto que aparece cuando el usuario
  hace clic en "¿Por qué es importante?" — debe ser neutral,
  sin sesgo hacia ninguna posición.

----------------------------------------------
POST /api/session/start
----------------------------------------------
Crea una sesión anónima de quiz.

Request body:
```json
{
  "age_range": "25-34",
  "region": "andina",
  "gender": "f",                              // opcional
  "initial_preference": "c1"                  // o "undecided", "blank", "na"
}
```

Validaciones:
- age_range: ENUM("18-24","25-34","35-49","50-64","65+") — requerido
- region: ENUM("caribe","andina","pacifica","orinoquia","amazonia","insular") — requerido
- gender: ENUM("m","f","nb","na") — opcional, default "na"
- initial_preference: STRING — requerido. Debe ser un candidate_id válido,
  "undecided", "blank", o "na"

Response 201:
```json
{
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

Notas:
- NO almacenar IP ni headers identificables.
- El sessionId es un UUID v4 opaco.
- Status de la sesión se pone en "created".

----------------------------------------------
POST /api/match
----------------------------------------------
Envía las respuestas del quiz y dispara el cálculo del match.
Este endpoint debe ser ASÍNCRONO — encola el cálculo y responde
inmediatamente.

Request body:
```json
{
  "sessionId": "a1b2c3d4-...",
  "answers": [
    { "questionId": "q1", "value": 4, "weight": 3 },
    { "questionId": "q2", "value": 2, "weight": 1 },
    { "questionId": "q3", "value": 5, "weight": 2 },
    ...
  ]
}
```

Validaciones:
- sessionId debe existir y tener status "created" o "answering"
- answers debe contener exactamente 10 respuestas (una por pregunta activa)
- value: INT 1-5 (escala Likert)
- weight: INT 1-3 (importancia del eje para el usuario)
- No se permiten duplicados de questionId

Response 202:
```json
{
  "status": "processing"
}
```

Comportamiento interno:
1. Guardar las 10 respuestas en la tabla `answers`
2. Cambiar session.status a "processing"
3. Encolar job de cálculo del match (ver LÓGICA DEL MATCH abajo)
4. Responder 202 inmediatamente

----------------------------------------------
GET /api/match/:sessionId
----------------------------------------------
Consulta el estado/resultado del match. El frontend hace polling
a este endpoint cada ~1 segundo desde /analyzing hasta que el
status sea "done".

Response 200 (procesando):
```json
{
  "status": "processing"
}
```

Response 200 (listo):
```json
{
  "status": "done",
  "initial_preference": "c3",
  "results": [
    {
      "candidateId": "c1",
      "score": 82,
      "summary": "Alta afinidad en ambiente, política social y economía...",
      "byAxis": [
        {
          "axis": "Economía",
          "userStance": "Favorece intervención estatal moderada",
          "candidateStance": "Propone control de precios y reforma tributaria progresiva",
          "quote": "Regularemos precios de canasta básica para proteger a los más vulnerables",
          "programPage": 23
        },
        ... // 10 ejes por candidato (al menos para el top 3)
      ]
    },
    ... // 8 candidatos ordenados por score descendente
  ],
  "preference_match": false
}
```

Notas:
- `results` debe estar ordenado por score DESC (mayor afinidad primero)
- `byAxis` debe incluir los 10 ejes para el candidato #1, y al menos
  los ejes más relevantes para los candidatos #2 y #3
- `preference_match` es true si initial_preference === results[0].candidateId
- `quote` debe tener máximo 20 palabras, extraída del programa oficial
- `programPage` es el número de página del PDF oficial

----------------------------------------------
GET /api/stats/public
----------------------------------------------
Devuelve estadísticas agregadas para el dashboard público.
GATEADO por configuración del servidor (no exponer si N < 1000).

Response 200:
```json
{
  "total_sessions": 2547,
  "last_updated": "2026-04-21T14:30:00Z",

  "aggregate_affinity": [
    { "candidateId": "c1", "pct": 22.4 },
    { "candidateId": "c2", "pct": 18.1 },
    ...
  ],

  "by_region": [
    {
      "region": "andina",
      "top3": [
        { "candidateId": "c1", "pct": 24.1 },
        { "candidateId": "c2", "pct": 19.5 },
        { "candidateId": "c5", "pct": 16.2 }
      ]
    },
    ...
  ],

  "by_age": [
    {
      "range": "18-24",
      "distribution": [
        { "candidateId": "c1", "pct": 28.3 },
        { "candidateId": "c4", "pct": 19.2 },
        ...
      ]
    },
    ...
  ],

  "preference_vs_match": [
    {
      "fromCandidateId": "c1",
      "to": [
        { "candidateId": "c1", "pct": 68 },
        { "candidateId": "c4", "pct": 15 },
        { "candidateId": "c5", "pct": 10 },
        { "candidateId": "c2", "pct": 7 }
      ]
    },
    ...
  ],

  "gap_national_pct": 43.2,

  "decisive_axes": [
    { "axis": "economia", "avgWeight": 2.7 },
    { "axis": "seguridad", "avgWeight": 2.5 },
    ...
  ],

  "polarization_by_axis": [
    { "axis": "seguridad", "polarizationScore": 0.85 },
    { "axis": "economia", "polarizationScore": 0.78 },
    ...
  ],

  "undecided_pct": 18.5
}
```

Notas sobre cada campo:

**total_sessions**: COUNT de sessions con status="done"

**aggregate_affinity**: Para cada candidato, qué % de sesiones completadas
lo tienen como candidato #1 (rank=1 en match_result_candidates). Ordenar
por pct DESC. Solo publicar si total_sessions >= 1000.

**by_region**: Agrupar por session.region. Para cada región, calcular el
top 3 de candidatos con rank=1. Misma lógica que aggregate_affinity pero
filtrada por región.

**by_age**: Agrupar por session.age_range. Para cada rango, calcular la
distribución completa de candidatos con rank=1.

**preference_vs_match**: Tabla cruzada entre initial_preference y el
candidato con rank=1. Muestra para cada candidato declarado como
preferencia inicial, qué % de esos usuarios terminó con cada candidato
como mayor afinidad. Esto mide el "gap" entre percepción y realidad.

**gap_national_pct**: % de sesiones donde initial_preference ≠ candidato
con rank=1. Excluir sesiones con initial_preference="undecided"|"blank"|"na".

**decisive_axes**: Promedio del campo `weight` de la tabla answers agrupado
por el eje (via question.axis). Ordenar por avgWeight DESC.

**polarization_by_axis**: Para cada eje, calcular la desviación estándar
de answers.value. Normalizar a 0-1 donde 1 = máxima polarización.
Fórmula: stddev(value) / 2 (ya que max stddev de una escala 1-5 es ~2).

**undecided_pct**: % de sesiones donde la diferencia entre el score del
candidato rank=1 y el candidato rank=2 es < 5 puntos.

**last_updated**: Timestamp de la última vez que se recalcularon las stats.

IMPORTANTE: Estas estadísticas deben recalcularse periódicamente (cron cada
5-15 minutos) y cachearse, NO calcularlas en cada request.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LÓGICA DEL MATCH (el corazón del sistema)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando se recibe un POST /api/match, se encola un job que hace:

### Paso 1: Recoger datos
- Las 10 respuestas del usuario (value + weight por eje)
- Las posiciones de TODOS los candidatos activos (stance_score por eje)

### Paso 2: Calcular distancia por eje por candidato
Para cada candidato y cada eje:
```
distance = |user_value - candidate_stance_score|    // 0-4
similarity = 1 - (distance / 4)                     // 0-1 (1 = idéntico)
weighted_similarity = similarity * user_weight       // 0-3
```

### Paso 3: Calcular score total por candidato
```
total_weighted_similarity = SUM(weighted_similarity para los 10 ejes)
max_possible = SUM(user_weight para los 10 ejes) * 1  // = SUM(weights)
score = ROUND((total_weighted_similarity / max_possible) * 100)  // 0-100
```

### Paso 4: Generar resúmenes con IA (opcional pero recomendado)
Para los top 3 candidatos, usar Claude/GPT para generar:

**Prompt para el summary del candidato:**
```
Eres un analista político neutral. El usuario respondió un test de
afinidad programática con los siguientes resultados:

Respuestas del usuario: [lista de eje → valor → importancia]
Posiciones del candidato [nombre]: [lista de eje → stance_score]
Score de afinidad: X%

Genera un resumen de 1-2 oraciones explicando POR QUÉ hay afinidad
o distancia. Menciona los ejes donde hay mayor coincidencia y mayor
diferencia. Sé neutral, no recomiendes ni critiques.
```

**Prompt para el user_stance / candidate_stance por eje:**
```
El usuario respondió [valor] (en escala 1-5 donde 1=[polo izq] y
5=[polo der]) a la pregunta sobre [eje].
Genera una frase corta (<10 palabras) describiendo su postura.
Ejemplo: "Favorece intervención estatal moderada"
```

Si no se usa IA para generar resúmenes, usar templates predefinidos
basados en los rangos de valor (1-2: posición A, 3: neutral, 4-5: posición B).

### Paso 5: Guardar resultados
1. Insertar en match_results (session_id, preference_match)
2. Insertar en match_result_candidates (session_id, candidate_id, score, rank, summary)
3. Insertar en match_result_axes (session_id, candidate_id, axis, user_stance, candidate_stance, quote, program_page)
4. Actualizar session.status = "done" y session.completed_at = NOW()

### Paso 6: Actualizar cache de stats (async)
Invalidar el cache de stats_cache para que el próximo cron lo recalcule.

Tiempo esperado: 2-5 segundos si se usa IA, <1 segundo sin IA.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INGESTA DE PROGRAMAS DE GOBIERNO (pipeline de IA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proceso offline para cargar las posiciones de cada candidato:

### Paso 1: Obtener PDF
- Descargar programa de gobierno oficial del candidato (registrado ante
  autoridades electorales)
- Almacenar en S3/Storage

### Paso 2: Extraer texto
- PDF → texto plano (usar pdf-parse, PyMuPDF, o similar)
- Dividir en chunks de ~500 tokens con overlap de 50 tokens
- Preservar metadato de número de página por chunk

### Paso 3: Clasificar por eje con IA
Para cada chunk, enviar a Claude/GPT:
```
Clasifica el siguiente fragmento del programa de gobierno del candidato
[nombre] en uno o más de estos ejes temáticos:
economia, salud, educacion, seguridad, ambiente, politica_social,
politica_exterior, reforma_politica, empleo, tecnologia

Si no corresponde a ninguno, responde "ninguno".

Fragmento (página [N]):
"[texto del chunk]"

Responde SOLO con los ejes aplicables, separados por coma.
```

### Paso 4: Determinar posición (stance_score)
Para cada eje, agrupar todos los chunks clasificados y enviar:
```
Basado en los siguientes fragmentos del programa de gobierno de [nombre]
sobre [eje temático]:

[fragmentos concatenados]

1. Genera un resumen de 2 oraciones de su posición.
2. Extrae una cita textual representativa de máximo 20 palabras.
   Indica el número de página.
3. En una escala de 1 a 5 donde:
   1 = [polo izquierdo del eje]
   5 = [polo derecho del eje]
   ¿Dónde ubicarías la posición del candidato?

Responde en JSON: { "summary": "...", "quote": "...", "page": N, "score": N }
```

### Paso 5: Revisión manual
- Un humano revisa las posiciones generadas por IA
- Verifica que las citas sean reales y correspondan al texto
- Ajusta stance_score si la IA erró
- Aprueba o rechaza antes de publicar

### Paso 6: Insertar en BD
- Guardar en candidate_positions

Este proceso se ejecuta UNA VEZ por candidato cuando se registra
oficialmente y publica su programa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JOBS PERIÓDICOS (CRON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1. Recalcular stats públicas
Frecuencia: Cada 5-15 minutos
Acción: Ejecutar todas las queries de agregación para GET /api/stats/public
y guardar el resultado en stats_cache (o Redis).

Query principal de aggregate_affinity:
```sql
SELECT
  mrc.candidate_id,
  ROUND(COUNT(*)::numeric / total.cnt * 100, 1) as pct
FROM match_result_candidates mrc
JOIN sessions s ON s.id = mrc.session_id
CROSS JOIN (
  SELECT COUNT(DISTINCT session_id) as cnt
  FROM match_result_candidates WHERE rank = 1
) total
WHERE mrc.rank = 1 AND s.status = 'done'
GROUP BY mrc.candidate_id, total.cnt
ORDER BY pct DESC;
```

Query de gap_national_pct:
```sql
SELECT
  ROUND(
    COUNT(*) FILTER (
      WHERE s.initial_preference != mrc.candidate_id
    )::numeric /
    COUNT(*)::numeric * 100, 1
  ) as gap_pct
FROM sessions s
JOIN match_result_candidates mrc ON s.id = mrc.session_id AND mrc.rank = 1
WHERE s.status = 'done'
  AND s.initial_preference NOT IN ('undecided', 'blank', 'na');
```

Query de polarization_by_axis:
```sql
SELECT
  q.axis,
  ROUND(STDDEV(a.value)::numeric / 2, 2) as polarization_score
FROM answers a
JOIN questions q ON q.id = a.question_id
GROUP BY q.axis
ORDER BY polarization_score DESC;
```

Query de undecided_pct:
```sql
WITH ranked AS (
  SELECT
    session_id,
    score,
    rank,
    LEAD(score) OVER (PARTITION BY session_id ORDER BY rank) as next_score
  FROM match_result_candidates
  WHERE rank <= 2
)
SELECT
  ROUND(
    COUNT(*) FILTER (WHERE score - next_score < 5)::numeric /
    COUNT(*)::numeric * 100, 1
  ) as undecided_pct
FROM ranked
WHERE rank = 1;
```

### 2. Limpiar sesiones abandonadas
Frecuencia: Cada hora
Acción: Eliminar sesiones con status "created" o "answering" que tengan
más de 24 horas de antigüedad.
```sql
DELETE FROM sessions
WHERE status IN ('created', 'answering')
  AND created_at < NOW() - INTERVAL '24 hours';
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEATURE FLAGS (configuración del servidor)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Estas variables de entorno controlan el comportamiento:

```env
# Mínimo de sesiones para publicar estadísticas
STATS_MIN_SESSIONS=1000

# Habilitar/deshabilitar endpoint de stats
ENABLE_PUBLIC_STATS=true

# Modo silencio electoral (deshabilita stats y resultados individuales)
ELECTORAL_SILENCE=false

# Usar IA para generar resúmenes del match (vs templates)
USE_AI_SUMMARIES=true

# API key de Anthropic/OpenAI para resúmenes
ANTHROPIC_API_KEY=sk-ant-...

# Base de datos
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# CORS origins permitidos
CORS_ORIGINS=https://votoloco.com,http://localhost:3000
```

El frontend también tiene sus propios feature flags que el backend
debe conocer:
- NEXT_PUBLIC_SHOW_PUBLIC_STATS: controla si el frontend muestra /estadisticas
- NEXT_PUBLIC_USE_MOCKS: cuando es true, el frontend NO llama al backend
- NEXT_PUBLIC_ELECTORAL_SILENCE: banner en frontend

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEGURIDAD Y RATE LIMITING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Rate Limits (por IP)
- GET endpoints: 100 req/min
- POST /api/session/start: 10 req/min (evitar spam de sesiones)
- POST /api/match: 5 req/min (evitar abuso del cálculo)
- GET /api/stats/public: 30 req/min

### Validación de entrada
- Todos los inputs deben validarse con schema (Zod, Joi, etc.)
- Sanitizar strings contra XSS
- UUIDs validados con regex
- No aceptar campos extra no definidos en el schema

### Headers de seguridad
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### No almacenar
- NO almacenar IP del usuario
- NO almacenar User-Agent
- NO almacenar cookies de sesión (la sesión es por UUID en URL)
- NO logs con datos cruzables a persona
- SÍ logear métricas agregadas (total requests, errores, latencia)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS LEGALES INNEGOCIABLES (TAMBIÉN APLICAN AL BACKEND)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Estas reglas aplican a TODA respuesta de la API, logs, documentación
interna, y cualquier texto generado por IA:

- NUNCA usar "encuesta" → usar "test de afinidad" o "cuestionario"
- NUNCA usar "intención de voto" → usar "preferencia inicial declarada"
- NUNCA usar "candidato más popular/más votado/ganador" → usar
  "candidato con mayor afinidad programática agregada"
- NUNCA decir "el X% votará por Y" → decir "el X% muestra mayor
  afinidad programática con Y"
- En los prompts de IA, incluir instrucción explícita:
  "No uses las palabras 'encuesta', 'intención de voto', 'favorito',
   'ganador', ni 'más popular'. Usa 'afinidad programática'."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLIANCE: LEY 1581 DE 2012 (HABEAS DATA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- No se recolectan datos personales identificables (nombre, cédula, email)
- Los datos demográficos (edad, región, género) son rangos genéricos,
  no datos precisos, y son voluntarios
- El session ID es un UUID aleatorio no vinculable a persona
- Los datos se almacenan en Colombia o en jurisdicción compatible
- Se debe poder eliminar una sesión completa dado su UUID
  (para cumplir derecho de supresión si alguien conserva su URL)
- Implementar endpoint DELETE /api/session/:sessionId (soft delete)
- Retención: Las sesiones individuales pueden eliminarse después de
  6 meses. Los datos agregados se conservan indefinidamente.
- NO cruzar edad + región + género + candidato porque la intersección
  podría ser deanonimizable en muestras pequeñas.
  Las stats públicas SOLO cruzan UNA dimensión a la vez con candidato.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODO SILENCIO ELECTORAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando ELECTORAL_SILENCE=true (los 8 días antes de elecciones):

- GET /api/stats/public → 403 con body:
  { "error": "electoral_silence", "message": "Estadísticas no disponibles durante el período de silencio electoral." }
- POST /api/match y GET /api/match/:sessionId siguen funcionando
  (el usuario puede hacer el test, pero el frontend decide qué mostrar)
- Los jobs de recálculo de stats se pausan

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEEDS / DATOS INICIALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para desarrollo, el backend debe proveer un script de seed que cargue:

1. 8 candidatos de prueba (ver frontend/src/lib/mock/candidates.ts
   para los datos exactos que el frontend espera)
2. 10 preguntas (ver frontend/src/lib/mock/questions.ts)
3. Posiciones de los 8 candidatos en los 10 ejes
   (ver candidates.ts → campo positions)
4. Opcionalmente: 100-500 sesiones simuladas para probar las stats

Los IDs de candidatos deben coincidir: "c1", "c2", ..., "c8"
Los IDs de preguntas deben coincidir: "q1", "q2", ..., "q10"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRUCTURA DE CARPETAS SUGERIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
backend/
  src/
    routes/
      candidates.ts
      questions.ts
      sessions.ts
      match.ts
      stats.ts
    services/
      matchCalculator.ts      # Lógica core del score
      aiSummarizer.ts         # Generación de resúmenes con IA
      statsAggregator.ts      # Queries de agregación
      programIngester.ts      # Pipeline de ingesta de PDFs
    models/
      candidate.ts
      question.ts
      session.ts
      answer.ts
      matchResult.ts
    middleware/
      rateLimiter.ts
      cors.ts
      validation.ts
    jobs/
      calculateMatch.ts       # Worker del job de match
      refreshStats.ts         # Cron de recálculo de stats
      cleanupSessions.ts      # Cron de limpieza
    db/
      schema.sql              # DDL completo
      seed.sql                # Datos de desarrollo
      migrations/
    config/
      env.ts                  # Parseo de env vars
      flags.ts                # Feature flags
    types/
      index.ts                # Tipos compartidos
  package.json
  tsconfig.json
  .env.example
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECKLIST DE IMPLEMENTACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Orden recomendado:

1. [ ] Setup proyecto + base de datos + migraciones
2. [ ] GET /api/candidates + GET /api/candidates/:slug
3. [ ] GET /api/quiz/questions
4. [ ] POST /api/session/start
5. [ ] POST /api/match (guardar answers + encolar)
6. [ ] Lógica del match calculator (sin IA primero, con templates)
7. [ ] GET /api/match/:sessionId
8. [ ] Probar flujo completo con el frontend (cambiar USE_MOCKS=false)
9. [ ] GET /api/stats/public + cron de recálculo
10. [ ] Agregar IA para resúmenes del match
11. [ ] Pipeline de ingesta de programas de gobierno
12. [ ] Rate limiting + headers de seguridad
13. [ ] DELETE /api/session/:sessionId
14. [ ] Modo silencio electoral
15. [ ] Script de seed con datos realistas
16. [ ] Tests de integración

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CÓMO PROBAR CON EL FRONTEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. En el frontend, cambiar .env.local:
   ```
   NEXT_PUBLIC_USE_MOCKS=false
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000  (o tu puerto)
   ```

2. Reiniciar el frontend: `npm run dev`

3. El frontend hará requests reales a tu API en lugar de usar mocks.

4. El flujo completo es:
   Landing → Onboarding (POST /api/session/start) → Quiz
   (GET /api/quiz/questions) → Submit (POST /api/match) →
   Analyzing (GET /api/match/:sessionId polling) → Results

5. Para stats: habilitar NEXT_PUBLIC_SHOW_PUBLIC_STATS=true en el frontend
   y que el backend tenga ENABLE_PUBLIC_STATS=true con al menos 1000
   sesiones (o bajar STATS_MIN_SESSIONS para desarrollo).
