import { PerSharesCrawlerJob, PERSHARES_TYPE } from 'llp-aggregator-services/dist/type'
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
export class PerSharesCrawler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PerSharesCrawler.name)

  constructor(
    private readonly config: ConfigService,
    @InjectQueue() private readonly queue: Queue,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly utilService: UtilService,
  ) {}

  get expression() {
    return this.config.get<string>('crawler.perShares')
  }

  onModuleInit() {
    if (!this.expression) {
      return
    }
    const register = new CronJob(this.expression, this.register.bind(this))
    this.schedulerRegistry.addCronJob('perShares', register)
    register.start()
  }

  onModuleDestroy() {
    if (!this.expression) {
      return
    }
    this.schedulerRegistry.deleteCronJob('perShares')
  }

  async register() {
    const data: PerSharesCrawlerJob[] = this.utilService.tranches.flatMap(
      (tranche) =>
        [
          {
            tableName: 'feePerShares',
            type: PERSHARES_TYPE.FEE,
            decimals: this.utilService.feePerSharesDecimals,
            key: this.utilService.getFeePerSharesLastSyncedKey(tranche),
          },
          {
            tableName: 'pnlPerShares',
            type: PERSHARES_TYPE.PNL,
            decimals: this.utilService.pnlPerSharesDecimals,
            key: this.utilService.getPnLPerSharesLastSyncedKey(tranche),
          },
        ].map(({ tableName, type, decimals, key }) => {
          this.logger.debug(
            `[register] generate new job for crawl ${tableName} ${tranche}`,
          )
          return {
            tranche: tranche,
            tableName: tableName,
            type: type,
            redisKey: key,
            decimals: decimals,
          } as PerSharesCrawlerJob
        }),
    )
    if (!data.length) {
      return
    }
    await this.queue.addBulk(
      data.map((c) => ({
        name: 'crawler.perShares',
        data: c,
      })),
    )
  }
}
