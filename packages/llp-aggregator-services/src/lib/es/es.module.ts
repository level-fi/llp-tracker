import { Module } from '@nestjs/common'
import { ElasticsearchModule } from '@nestjs/elasticsearch'
import { ConfigModule, ConfigService } from '@nestjs/config'

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const cloudId = config.get<string>('es.cloud')
        if (cloudId) {
          return {
            cloud: {
              id: config.get<string>('es.cloud'),
            },
            auth: {
              apiKey: config.get<string>('es.apiKey'),
            },
          }
        }
        return {
          node: config.get<string>('es.node'),
          auth: {
            username: config.get<string>('es.username'),
            password: config.get<string>('es.password'),
          },
          tls: {
            rejectUnauthorized: false,
          },
        }
      },
      inject: [ConfigService],
    }),
  ],
  exports: [ElasticsearchModule],
})
export class EsModule {}
