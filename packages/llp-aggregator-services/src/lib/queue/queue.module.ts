import { UtilModule, UtilService } from "../util";
import { BullModule } from "@nestjs/bull";
import { DynamicModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RedisService } from "./redis.service";

export class QueueModule {
  static register(name?: string): DynamicModule {
    return {
      module: QueueModule,
      imports: [
        BullModule.registerQueueAsync({
          name: name,
          imports: [ConfigModule, UtilModule],
          useFactory: (
            configService: ConfigService,
            utilService: UtilService,
          ) => {
            return {
              name: name,
              redis: {
                host: configService.get<string>("redis.host"),
                port: configService.get<number>("redis.port"),
                username: configService.get<string>("redis.username"),
                password: configService.get<string>("redis.password"),
                enableReadyCheck: false,
              },
              defaultJobOptions: {
                attempts: 3,
                backoff: 3000,
                removeOnComplete: true,
                removeOnFail: false,
                delay: 1500,
              },
              prefix: `${utilService.app}:${utilService.chainId}:${utilService.version}:${utilService.env}:queue`,
            };
          },
          inject: [ConfigService, UtilService],
        }),
      ],
      providers: [RedisService],
      exports: [BullModule, RedisService],
    };
  }
}
