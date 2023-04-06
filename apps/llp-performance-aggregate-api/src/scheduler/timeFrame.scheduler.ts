import { RedisService } from 'llp-aggregator-services/dist/queue'
import { TimeframeService } from 'llp-aggregator-services/dist/timeFrame'
import { TimeFrameTriggerJob } from 'llp-aggregator-services/dist/type'
import { UtilService } from 'llp-aggregator-services/dist/util'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SchedulerRegistry } from '@nestjs/schedule'
import { Queue } from 'bull'
import { CronJob } from 'cron'

@Injectable()
export class TimeFrameScheduler {
  private readonly logger = new Logger(TimeFrameScheduler.name)

  constructor(
    private readonly config: ConfigService,
    @InjectQueue() private readonly queue: Queue,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly utilService: UtilService,
    private readonly timeFrameService: TimeframeService,
    private readonly redisService: RedisService,
  ) {}

  get expression() {
    return this.config.get<string>('scheduler.timeFrame')
  }

  get maxWalletsLength() {
    return this.config.get<number>('scheduler.timeFrameMaxWalletsLength')
  }

  onModuleInit() {
    if (!this.expression) {
      return
    }
    const register = new CronJob(this.expression, this.createJob.bind(this))
    this.schedulerRegistry.addCronJob('createJob', register)
    register.start()
  }

  onModuleDestroy() {
    if (!this.expression) {
      return
    }
    this.schedulerRegistry.deleteCronJob('createJob')
  }

  async createJob() {
    const data: TimeFrameTriggerJob[] = []
    await Promise.all(
      this.utilService.tranches.map(async (tranche) => {
        const isReady = await this.timeFrameService.isReadyForAggreate(tranche)
        if (!isReady) {
          this.logger.debug(`[createJob] ${tranche} is not ready for build`)
          return
        }
        const key = this.utilService.getPendingWalletsKey(tranche)
        const wallets = await this.redisService.client.smembers(key)
        if (!wallets.length) {
          return
        }
        this.logger.debug(`[createJob] ${tranche} is ready for build`)
        while (wallets.length) {
          data.push({
            tranche: tranche,
            wallets: wallets.splice(0, this.maxWalletsLength),
          })
        }
        await this.redisService.client.del(key)
      }),
    )
    if (!data.length) {
      return
    }
    await this.queue.addBulk(
      data.map((c) => ({
        name: 'timeFrame.trigger',
        data: c,
        opts: {
          priority: 1,
        },
      })),
    )
  }
}
