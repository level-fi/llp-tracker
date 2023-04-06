import { RedisService } from 'llp-aggregator-services/dist/queue'
import { TimeframeService } from 'llp-aggregator-services/dist/timeFrame'
import { TimeFrameNewCronCheckpointJob } from 'llp-aggregator-services/dist/type'
import { UtilService } from 'llp-aggregator-services/dist/util'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SchedulerRegistry } from '@nestjs/schedule'
import { Queue } from 'bull'
import { CronJob } from 'cron'

@Injectable()
export class CheckpointScheduler {
  private readonly logger = new Logger(CheckpointScheduler.name)

  constructor(
    private readonly config: ConfigService,
    @InjectQueue() private readonly queue: Queue,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly utilService: UtilService,
    private readonly timeFrameService: TimeframeService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    if (!this.timeFrameService.expression) {
      return
    }
    const startDate = this.config.get<number>('cronStartDate')
    if (!startDate) {
      return
    }
    // init checkPoint from begin
    this.redisService.client.del(this.utilService.getCronCheckpointKey())
    const passedCronTimeseries = this.timeFrameService.generateCronCheckpoints([
      startDate,
      Math.floor(Date.now() / 1000),
    ])
    this.logger.log(
      `[onModuleInit] generate cron timeseries from ${startDate} with expression ${this.timeFrameService.expression}`,
    )
    await this.redisService.client.zadd(
      this.utilService.getCronCheckpointKey(),
      ...passedCronTimeseries.flatMap((c) => [c, c]),
    )
    //
    const register = new CronJob(
      this.timeFrameService.expression,
      this.create.bind(this),
    )
    this.schedulerRegistry.addCronJob('createCheckpoint', register)
    register.start()
  }

  onModuleDestroy() {
    if (!this.timeFrameService.expression) {
      return
    }
    this.schedulerRegistry.deleteCronJob('createCheckpoint')
  }

  async create() {
    const checkPoint = Math.floor(Date.now() / 1000)
    this.logger.debug(`[create] insert new checkPoint ${checkPoint}`)
    this.redisService.client.zadd(
      this.utilService.getCronCheckpointKey(),
      checkPoint,
      checkPoint,
    )
    // raise the job
    const jobSize = 50
    const jobs = await Promise.all(
      this.utilService.tranches.map(async (tranche) => {
        const wallets = await this.redisService.client.smembers(
          this.utilService.getWalletsKey(tranche),
        )
        const jobs: TimeFrameNewCronCheckpointJob[] = []
        while (wallets.length) {
          jobs.push({
            timestamp: checkPoint,
            tranche: tranche,
            wallets: wallets.splice(0, jobSize),
          })
        }
        return jobs
      }),
    )
    await this.queue.addBulk(
      jobs.flat().map((c) => ({
        name: 'timeFrame.cron',
        data: c,
      })),
    )
  }
}
