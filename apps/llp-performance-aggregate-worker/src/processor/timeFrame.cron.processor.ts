import { RedisService } from 'llp-aggregator-services/dist/queue'
import { TimeframeService } from 'llp-aggregator-services/dist/timeFrame'
import { TimeFrameNewCronCheckpointJob } from 'llp-aggregator-services/dist/type'
import { UtilService } from 'llp-aggregator-services/dist/util'
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class TimeFrameCronProcessor {
  private readonly logger = new Logger(TimeFrameCronProcessor.name)

  constructor(
    private readonly utilService: UtilService,
    private readonly timeFrameService: TimeframeService,
    private readonly redisService: RedisService,
  ) {}

  async insert(job: TimeFrameNewCronCheckpointJob) {
    this.logger.debug(
      `[insert] cron job for insert new checkPoint ${job.timestamp}, tranche ${job.tranche}, wallets ${job.wallets.length}`,
    )
    if (!job.wallets.length) {
      return
    }
    const wallets: string[] = []
    await Promise.all(
      job.wallets.map(async (wallet) => {
        const hasLiquidity = await this.timeFrameService.isWalletHasLiquidity(
          job.tranche,
          wallet,
        )
        if (!hasLiquidity) {
          return
        }
        wallets.push(wallet)
      }),
    )
    if (!wallets) {
      return
    }
    await this.redisService.client.sadd(
      this.utilService.getPendingWalletsKey(job.tranche),
      wallets,
    )
    this.logger.debug(
      `[insert] update pending_wallets of ${job.tranche}, add ${wallets.length} wallets`,
    )
  }
}
