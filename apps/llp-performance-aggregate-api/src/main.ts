import { NestFactory } from '@nestjs/core'
import { ApiModule } from './api.module'
import { ConfigService } from '@nestjs/config'
import { LogLevel, ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const logs = process.env.LOGS
  const logger: false | LogLevel[] = logs
    ? logs.split(',').map((c) => c as LogLevel)
    : false
  const app = await NestFactory.create(ApiModule, {
    logger: logger,
  })

  const configService = app.get(ConfigService)
  const port: number = configService.get<number>('app.port')
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  app.enableCors({
    origin: true,
    methods: '*',
    credentials: true,
  })
  await app.listen(port, () => {
    console.log(`API is running in port ${port}`)
  })
}
bootstrap()
