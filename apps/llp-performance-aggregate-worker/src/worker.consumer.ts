import {
  CheckpointCrawlerJob,
  PerSharesCrawlerJob,
  TimeFrameBuildJob,
  TimeFrameNewCronCheckpointJob,
  TimeFrameTriggerJob,
} from 'llp-aggregator-services/dist/type'
import { Processor, Process, OnQueueFailed } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { CheckpointCrawlerProcessor } from './crawler/checkPoint.crawler.processor'
import { PerSharesCrawlerProcessor } from './crawler/perShares.crawler.processor'
import { TimeFrameTriggerProcessor } from './processor/timeFrame.trigger.processor'
import { TimeFrameBuildProcessor } from './processor/timeFrame.build.processor'
import { TimeFrameCronProcessor } from './processor/timeFrame.cron.processor'
import { UtilService } from 'llp-aggregator-services/dist/util'
import { RedisService } from 'llp-aggregator-services/dist/queue'

@Processor()
export class WorkerConsumer {
  private readonly logger = new Logger(WorkerConsumer.name)

  constructor(
    private readonly timeFrameBuildProcessor: TimeFrameBuildProcessor,
    private readonly checkpointCrawlerProcessor: CheckpointCrawlerProcessor,
    private readonly perSharesCrawlerProcessor: PerSharesCrawlerProcessor,
    private readonly timeFrameTriggerProcessor: TimeFrameTriggerProcessor,
    private readonly timeFrameCronProcessor: TimeFrameCronProcessor,
    private readonly utilService: UtilService,
    private readonly redisService: RedisService,
  ) {}

  @Process({
    name: 'crawler.checkPoint',
  })
  onUpdateCheckpoint(job: Job) {
    const crawlerData = job.data as CheckpointCrawlerJob
    return this.checkpointCrawlerProcessor.update(crawlerData)
  }

  @Process({
    name: 'crawler.perShares',
  })
  onUpdateFeePerShares(job: Job) {
    const crawlerData = job.data as PerSharesCrawlerJob
    return this.perSharesCrawlerProcessor.update(crawlerData)
  }

  @Process({
    name: 'timeFrame.trigger',
  })
  onTriggreAggregateProcess(job: Job) {
    const triggerData = job.data as TimeFrameTriggerJob
    return this.timeFrameTriggerProcessor.trigger(triggerData)
  }

  @Process({
    name: 'timeFrame.build',
  })
  onProcessTimeFrame(job: Job) {
    const timeFrame = job.data as TimeFrameBuildJob
    try {
      return this.timeFrameBuildProcessor.update(timeFrame)
    } catch {
      if (job.attemptsMade !== job.opts.attempts) {
        return
      }
      // last try, readd info
      const wallets = timeFrame.items.map((c) => c.wallet)
      this.redisService.client.sadd(
        this.utilService.getPendingWalletsKey(timeFrame.tranche),
        wallets,
      )
    }
  }

  @Process({
    name: 'timeFrame.cron',
  })
  onTimeFrameCronInsert(job: Job) {
    const data = job.data as TimeFrameNewCronCheckpointJob
    return this.timeFrameCronProcessor.insert(data)
  }

  @OnQueueFailed()
  onError(job: Job, err: Error) {
    this.logger.error(
      `[onError][attemptsMade: ${job.attemptsMade}] job id ${job.id} job process ${job.name} failed with error ${err.message}`,
    )
  }
}
