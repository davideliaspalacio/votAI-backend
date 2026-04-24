import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { envValidationSchema } from './config/env.config';
import { SupabaseModule } from './supabase/supabase.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { MatchModule } from './modules/match/match.module';
import { StatsModule } from './modules/stats/stats.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL')!;
        const url = new URL(redisUrl);
        return {
          redis: {
            host: url.hostname,
            port: parseInt(url.port, 10) || 6379,
            password: url.password || undefined,
          },
        };
      },
    }),
    SupabaseModule,
    CandidatesModule,
    QuestionsModule,
    SessionsModule,
    MatchModule,
    StatsModule,
    IngestionModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
