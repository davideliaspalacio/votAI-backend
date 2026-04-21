# VotoLoco Backend

Backend de **VotoLoco.com**, plataforma cívica colombiana que mide afinidad programática entre votantes y candidatos presidenciales de Colombia 2026.

> **NOTA LEGAL:** VotoLoco NO es una encuesta electoral. Mide afinidad programática entre las respuestas del usuario y las propuestas oficiales de cada candidato, en cumplimiento de la Resolución 2 de 2023 del CNE y la Ley 130 de 1994.

## Stack

- **NestJS 10+** con TypeScript estricto
- **Supabase** (Postgres + Storage) — sin ORM, Supabase-native
- **Bull** + Redis para jobs asíncronos (cálculo de match)
- **Anthropic Claude** para resúmenes de afinidad y pipeline de ingesta
- **Swagger/OpenAPI** en `/docs`

## Requisitos

- Node.js 20+
- pnpm
- Docker (para Redis y Supabase local)
- Cuenta de Supabase (o Supabase CLI local)

## Setup

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Completar credenciales de Supabase, Anthropic, Redis

# 3. Iniciar servicios locales
supabase start
docker run -d -p 6379:6379 redis:7-alpine

# 4. Ejecutar migraciones
supabase migration up

# 5. Iniciar servidor en modo desarrollo
pnpm run start:dev
```

El servidor arranca en `http://localhost:4000`. Swagger en `http://localhost:4000/docs`.

## Comandos

| Comando | Descripcion |
|---------|-------------|
| `pnpm run start:dev` | Servidor con hot reload |
| `pnpm run build` | Compilar a JavaScript |
| `pnpm run start:prod` | Ejecutar build compilado |
| `pnpm test` | Tests unitarios |
| `pnpm run test:e2e` | Tests end-to-end |
| `pnpm run test:cov` | Cobertura de tests |

## Pipeline de ingesta de PDFs

Para procesar el programa de gobierno de un candidato:

```bash
# 1. Subir PDF a Supabase Storage (bucket "programs")
# 2. Ejecutar ingesta (5-15 min por candidato)
npx nest start -- ingest:candidate --id=c1 --pdf=programs/c1-maria-valencia.pdf

# 3. Revisar posiciones draft en /api/admin/draft-positions/c1
# 4. Publicar posiciones revisadas
npx nest start -- publish:positions --id=c1
```

## Estructura

```
src/
  common/          Filtros, interceptores, guards, pipes
  config/          Configuracion de entorno, Swagger, Redis
  supabase/        Modulo global de Supabase
  modules/
    candidates/    GET /api/candidates, GET /api/candidates/:slug
    questions/     GET /api/quiz/questions
    sessions/      POST /api/session/start, DELETE /api/session/:id
    match/         POST /api/match, GET /api/match/:sessionId
    stats/         GET /api/stats/public + crons
    ingestion/     Pipeline offline de PDFs + admin endpoints
supabase/
  migrations/      Schema SQL, RLS policies, seed data
```

## Endpoints principales

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/candidates` | Lista de candidatos activos |
| GET | `/api/candidates/:slug` | Perfil con posiciones por eje |
| GET | `/api/quiz/questions` | 10 preguntas del test |
| POST | `/api/session/start` | Crear sesion anonima |
| POST | `/api/match` | Enviar respuestas, inicia calculo |
| GET | `/api/match/:sessionId` | Polling del resultado |
| DELETE | `/api/session/:sessionId` | Derecho de supresion (Ley 1581) |
| GET | `/api/stats/public` | Estadisticas agregadas |

## Conexion con el frontend

En el frontend (Next.js), configurar:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_USE_MOCKS=false
```

## Deploy

Recomendado: **Railway** o **Fly.io** con Redis addon.

Variables de entorno requeridas en produccion:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `REDIS_URL`
- `CORS_ORIGINS=https://votoloco.com`
- `ADMIN_TOKEN`

## Compliance

- No se almacenan datos personales identificables (nombre, cedula, email)
- Datos demograficos son rangos genericos voluntarios
- `session_id` es UUID aleatorio, no vinculable a persona
- Endpoint DELETE para derecho de supresion (Ley 1581 de 2012)
- Nunca se cruza edad + region + genero + candidato en estadisticas publicas
- Modo silencio electoral (`ELECTORAL_SILENCE=true`) bloquea estadisticas
