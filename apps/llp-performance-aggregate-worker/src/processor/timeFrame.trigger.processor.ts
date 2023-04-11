import { TimeframeService } from 'llp-aggregator-services/dist/timeFrame'
import {
  TimeFrameBuildJob,
  TimeFrameTriggerJob,
} from 'llp-aggregator-services/dist/type'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { Queue } from 'bull'

@Injectable()
export class TimeFrameTriggerProcessor {
  private readonly logger = new Logger(TimeFrameTriggerProcessor.name)

  constructor(
    @InjectQueue() private readonly queue: Queue,
    private readonly timeFrameService: TimeframeService,
  ) {}

  // only action when data ready
  async trigger(triggerData: TimeFrameTriggerJob) {
    const { tranche, wallets } = triggerData
    if (!tranche) {
      return
    }

    const data: TimeFrameBuildJob = {
      tranche: tranche,
      items: [],
    }
    await Promise.all(
      wallets.map(async (wallet) => {
        const points = await this.timeFrameService.getWalletCheckpoints(
          tranche,
          wallet,
        )
        this.logger.debug(
          `[trigger] number checkPoints of ${wallet} of tranche ${tranche} is ${points.length}`,
        )
        if (points.length <= 1) {
          return
        }
        data.items.push({
          wallet: wallet,
          points: points,
        })
      }),
    )
    if (!data.items.length) {
      return
    }
    await this.queue.add('timeFrame.build', data, {
      priority: 1,
    })
    this.logger.debug(
      `[trigger] registered aggregate job for tranche ${tranche}`,
    )
  }
}
