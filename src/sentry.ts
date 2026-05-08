import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.RAILWAY_DEPLOYMENT_ID ?? undefined,
    tracesSampleRate:
      process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
    beforeSend(event) {
      const req = event.request;
      if (req?.headers) {
        delete req.headers['authorization'];
        delete req.headers['cookie'];
      }
      if (req?.data && typeof req.data === 'object') {
        const data = req.data as Record<string, unknown>;
        if ('initial_preference' in data) data.initial_preference = '[scrubbed]';
        if ('region' in data) data.region = '[scrubbed]';
        if ('age_range' in data) data.age_range = '[scrubbed]';
        if ('gender' in data) data.gender = '[scrubbed]';
      }
      return event;
    },
    ignoreErrors: [
      'BadRequestException',
      'NotFoundException',
      'ThrottlerException',
      'ECONNRESET',
    ],
  });
}
