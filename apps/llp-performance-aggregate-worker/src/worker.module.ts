import { Module } from '@nestjs/common'
import { WorkerService } from './worker.service'
import { ConfigModule } from '@nestjs/config'
import config from 'llp-aggregator-services/dist/config'
import { EsModule } from 'llp-aggregator-services/dist/es'
import { QueueModule } from 'llp-aggregator-services/dist/queue'
import { UtilModule } from 'llp-aggregator-services/dist/util'
import { WorkerConsumer } from './worker.consumer'
import { TimeFrameBuildProcessor } from './processor/timeFrame.build.processor'
import { CheckpointCrawlerProcessor } from './crawler/checkPoint.crawler.processor'
import { PerSharesCrawlerProcessor } from './crawler/perShares.crawler.processor'
import { TimeFrameTriggerProcessor } from './processor/timeFrame.trigger.processor'
import { TimeFrameCronProcessor } from './processor/timeFrame.cron.processor'
import { TimeframeModule } from 'llp-aggregator-services/dist/timeFrame'
import { TrancheModule } from 'llp-aggregator-services/dist/tranche'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    EsModule,
    QueueModule.register(),
    UtilModule,
    TimeframeModule,
    TrancheModule,
  ],
  providers: [
    WorkerService,
    WorkerConsumer,
    CheckpointCrawlerProcessor,
    PerSharesCrawlerProcessor,
    TimeFrameTriggerProcessor,
    TimeFrameBuildProcessor,
    TimeFrameCronProcessor,
  ],
})
export class WorkerModule {}
