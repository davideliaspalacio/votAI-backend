import { ConfigService } from '@nestjs/config';
import { BullModuleOptions, SharedBullConfigurationFactory } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisConfigService implements SharedBullConfigurationFactory {
  constructor(private readonly configService: ConfigService) {}

  createSharedConfiguration(): BullModuleOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL')!;
    const url = new URL(redisUrl);
    return {
      redis: {
        host: url.hostname,
        port: parseInt(url.port, 10) || 6379,
        password: url.password || undefined,
      },
    };
  }
}
