import { NestFactory } from '@nestjs/core'
import { WorkerModule } from './worker.module'
import { ConfigService } from '@nestjs/config'
import { LogLevel } from '@nestjs/common'

async function bootstrap() {
  const logs = process.env.LOGS
  const logger: false | LogLevel[] = logs
    ? logs.split(',').map((c) => c as LogLevel)
    : false
  const app = await NestFactory.create(WorkerModule, {
    logger: logger,
  })

  const configService = app.get(ConfigService)

  const port: number = configService.get<number>('worker.port')

  await app.listen(port, () => {
    console.log(`WORKER is running in port ${port}`)
  })
}
bootstrap()
