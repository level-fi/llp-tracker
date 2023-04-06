import { CheckpointCrawlerJob } from 'llp-aggregator-services/dist/type'
import { UtilService } from 'llp-aggregator-services/dist/util'
import { InjectQueue } from '@nestjs/bull'
import { OnModuleInit } from '@nestjs/common'
import { OnModuleDestroy } from '@nestjs/common'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SchedulerRegistry } from '@nestjs/schedule'
import { Queue } from 'bull'
import { CronJob } from 'cron'

@Injectable()
export class CheckpointCrawler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CheckpointCrawler.name)

  constructor(
    private readonly config: ConfigService,
    @InjectQueue() private readonly queue: Queue,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly utilService: UtilService,
  ) {}

  get expression() {
    return this.config.get<string>('crawler.checkPoint')
  }

  onModuleInit() {
    if (!this.expression) {
      return
    }
    const register = new CronJob(this.expression, this.register.bind(this))
    this.schedulerRegistry.addCronJob('checkPoint', register)
    register.start()
  }

  onModuleDestroy() {
    if (!this.expression) {
      return
    }
    this.schedulerRegistry.deleteCronJob('checkPoint')
  }

  async register() {
    const data: CheckpointCrawlerJob[] = this.utilService.tranches.map(
      (tranche) => {
        this.logger.debug(
          `[register] generate new job for crawl checkPoint ${tranche}`,
        )
        return {
          tranche: tranche,
        }
      },
    )
    if (!data.length) {
      return
    }
    await this.queue.addBulk(
      data.map((c) => ({
        name: 'crawler.checkPoint',
        data: c,
      })),
    )
  }
}
