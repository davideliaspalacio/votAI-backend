import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from './../src/common/filters/http-exception.filter';

/**
 * E2E tests para los endpoints principales de VotoLoco.
 *
 * NOTA: Requiere Supabase y Redis corriendo con datos del seed.
 * Ejecutar: supabase start && supabase migration up
 *           docker run -d -p 6379:6379 redis:7-alpine
 */
describe('VotoLoco API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/candidates', () => {
    it('debe retornar lista de candidatos activos', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/candidates')
        .expect(200);

      expect(res.body.candidates).toBeDefined();
      expect(Array.isArray(res.body.candidates)).toBe(true);
      if (res.body.candidates.length > 0) {
        const candidate = res.body.candidates[0];
        expect(candidate).toHaveProperty('id');
        expect(candidate).toHaveProperty('slug');
        expect(candidate).toHaveProperty('name');
        expect(candidate).toHaveProperty('party');
        expect(candidate).toHaveProperty('color');
        expect(candidate).toHaveProperty('bio');
      }
    });
  });

  describe('GET /api/candidates/:slug', () => {
    it('debe retornar 404 para slug inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/candidates/candidato-inexistente')
        .expect(404);
    });
  });

  describe('GET /api/quiz/questions', () => {
    it('debe retornar las preguntas activas', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/quiz/questions')
        .expect(200);

      expect(res.body.questions).toBeDefined();
      expect(Array.isArray(res.body.questions)).toBe(true);
      if (res.body.questions.length > 0) {
        const question = res.body.questions[0];
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('text');
        expect(question).toHaveProperty('axis');
      }
    });
  });

  describe('POST /api/session/start', () => {
    it('debe crear una sesión anónima', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/session/start')
        .send({
          age_range: '25-34',
          region: 'andina',
          gender: 'f',
          initial_preference: 'undecided',
        })
        .expect(201);

      expect(res.body.sessionId).toBeDefined();
      expect(typeof res.body.sessionId).toBe('string');
    });

    it('debe rechazar datos inválidos', async () => {
      await request(app.getHttpServer())
        .post('/api/session/start')
        .send({
          age_range: 'invalid',
          region: 'andina',
          initial_preference: 'undecided',
        })
        .expect(400);
    });
  });

  describe('POST /api/match', () => {
    it('debe rechazar si la sesión no existe', async () => {
      await request(app.getHttpServer())
        .post('/api/match')
        .send({
          sessionId: 'no-existe-uuid',
          answers: Array.from({ length: 10 }, (_, i) => ({
            questionId: `q${i + 1}`,
            value: 3,
            weight: 2,
          })),
        })
        .expect(404);
    });

    it('debe rechazar si faltan respuestas', async () => {
      // Crear sesión primero
      const sessionRes = await request(app.getHttpServer())
        .post('/api/session/start')
        .send({
          age_range: '18-24',
          region: 'caribe',
          initial_preference: 'na',
        });

      await request(app.getHttpServer())
        .post('/api/match')
        .send({
          sessionId: sessionRes.body.sessionId,
          answers: [{ questionId: 'q1', value: 3, weight: 2 }],
        })
        .expect(400);
    });
  });

  describe('DELETE /api/session/:sessionId', () => {
    it('debe eliminar una sesión existente', async () => {
      const sessionRes = await request(app.getHttpServer())
        .post('/api/session/start')
        .send({
          age_range: '35-49',
          region: 'pacifica',
          initial_preference: 'blank',
        });

      await request(app.getHttpServer())
        .delete(`/api/session/${sessionRes.body.sessionId}`)
        .expect(204);
    });

    it('debe retornar 404 para sesión inexistente', async () => {
      await request(app.getHttpServer())
        .delete('/api/session/no-existe-uuid')
        .expect(404);
    });
  });

  describe('GET /api/match/:sessionId', () => {
    it('debe retornar 404 para sesión inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/match/no-existe-uuid')
        .expect(404);
    });
  });
});
