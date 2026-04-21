import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('VotoLoco API')
  .setDescription(
    'API del test de afinidad programática para las elecciones presidenciales de Colombia 2026. ' +
      'NOTA LEGAL: VotoLoco NO es una encuesta electoral. Mide afinidad programática.',
  )
  .setVersion('1.0.0')
  .addTag('candidates', 'Candidatos presidenciales')
  .addTag('questions', 'Preguntas del cuestionario')
  .addTag('sessions', 'Sesiones anónimas de usuario')
  .addTag('match', 'Cálculo de afinidad programática')
  .addTag('stats', 'Estadísticas agregadas públicas')
  .addTag('admin', 'Endpoints administrativos (uso interno)')
  .addServer('http://localhost:4000', 'Local')
  .addServer('https://api.votoloco.com', 'Producción')
  .build();
