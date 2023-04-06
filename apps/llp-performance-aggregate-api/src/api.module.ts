import { Module } from '@nestjs/common'
import { ApiController } from './api.controller'
import { ApiService } from './api.service'
import { ConfigModule } from '@nestjs/config'
import config from 'llp-aggregator-services/dist/config'
import { EsModule } from 'llp-aggregator-services/dist/es'
import { QueueModule } from 'llp-aggregator-services/dist/queue'
import { ScheduleModule } from '@nestjs/schedule'
import { UtilModule } from 'llp-aggregator-services/dist/util'
import { CheckpointCrawler } from './crawler/checkPoint.crawler'
import { PerSharesCrawler } from './crawler/perShares.crawler'
import { TimeFrameScheduler } from './scheduler/timeFrame.scheduler'
import { TimeframeModule } from 'llp-aggregator-services/dist/timeFrame'
import { CheckpointScheduler } from './scheduler/checkPoint.scheduler'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    EsModule,
    QueueModule.register(),
    UtilModule,
    TimeframeModule,
  ],
  controllers: [ApiController],
  providers: [
    ApiService,
    CheckpointCrawler,
    PerSharesCrawler,
    TimeFrameScheduler,
    CheckpointScheduler,
  ],
})
export class ApiModule {}
