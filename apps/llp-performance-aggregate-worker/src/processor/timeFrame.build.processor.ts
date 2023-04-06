import { aggregatedDataMapping } from 'llp-aggregator-services/dist/es'
import { TimeframeService } from 'llp-aggregator-services/dist/timeFrame'
import { AggreatedData, Checkpoint, TimeFrameBuildJob } from 'llp-aggregator-services/dist/type'
import { UtilService } from 'llp-aggregator-services/dist/util'
import { Injectable, Logger } from '@nestjs/common'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { WorkerService } from '../worker.service'

@Injectable()
export class TimeFrameBuildProcessor {
  private readonly logger = new Logger(TimeFrameBuildProcessor.name)

  constructor(
    private readonly workerService: WorkerService,
    private readonly utilService: UtilService,
    private readonly esService: ElasticsearchService,
    private readonly timeFrameService: TimeframeService,
  ) {}

  async update(timeFrame: TimeFrameBuildJob) {
    if (!timeFrame) {
      return
    }
    const existing = await this.workerService.createIndex(
      this.utilService.aggregatedDataIndex,
      aggregatedDataMapping,
    )
    if (!existing) {
      throw `index ${this.utilService.aggregatedDataIndex} not ready`
    }

    const { tranche, items } = timeFrame
    const removeItems: { [wallet: string]: string[] } = {}
    const operations = []

    await Promise.all(
      items.map(async ({ points, wallet }) => {
        const checkPoints = await this.timeFrameService.fetchCheckpointsData(
          tranche,
          wallet,
          points,
        )

        const paired: [Checkpoint, Checkpoint][] = []
        for (const range of checkPoints) {
          if (!range.length) {
            continue
          }
          ;[undefined, ...range].reduce((prev, cur) => {
            paired.push([prev, cur])
            return cur
          })
        }
        if (!paired.length) {
          this.logger.debug(
            `[update] checkPoint data not enought for build timeFrame`,
          )
          return
        }
        removeItems[wallet] = []

        await Promise.all(
          paired.map(async ([cpStart, cpEnd]) => {
            const data = await this.aggreateData(
              tranche,
              wallet,
              cpStart,
              cpEnd,
            )
            const id = this.utilService.generateAggregatedId(data)
            removeItems[wallet].push(id)
            operations.push({
              create: {
                _id: id,
              },
            })
            operations.push(data)

            this.logger.debug(
              `[update] buidled timeFrame for ${wallet} ${tranche}: ${cpStart?.timestamp} → ${cpEnd.timestamp}`,
            )
          }),
        )
      }),
    )

    const createResponse = await this.esService.bulk({
      index: this.utilService.aggregatedDataIndex,
      operations: operations,
      refresh: true,
    })
    const deleteResponse = await this.esService.deleteByQuery({
      index: this.utilService.aggregatedDataIndex,
      query: {
        bool: {
          must: [
            ...Object.entries(removeItems).map(([wallet, ids]) => ({
              bool: {
                must: [
                  {
                    bool: {
                      must_not: {
                        terms: {
                          _id: ids,
                        },
                      },
                    },
                  },
                  {
                    term: {
                      wallet: wallet,
                    },
                  },
                ],
              },
            })),
            {
              term: {
                tranche: tranche,
              },
            },
          ],
        },
      },
      conflicts: 'proceed',
      refresh: true,
    })
    const [skipped, inserted] = [
      createResponse.items.filter((c) => c?.create?.status === 409).length,
      createResponse.items.filter((c) => c?.create?.status === 201).length,
    ]
    this.logger.debug(`
    [update] info of lp performance
      tranche:    ${tranche}
      skipped:    ${skipped}
      inserted:   ${inserted}
      deleted:    ${deleteResponse.deleted}
      failed:     ${createResponse.items.length - skipped - inserted}
    `)
  }

  async aggreateData(
    tranche: string,
    wallet: string,
    cpStart: Checkpoint,
    cpEnd: Checkpoint,
  ): Promise<AggreatedData> {
    const perShares = cpStart
      ? await this.timeFrameService.fetchPerShares(
          tranche,
          cpStart.timestamp,
          cpEnd.timestamp,
        )
      : {
          feePerShares: 0,
          pnlPerShares: 0,
        }
    if (!perShares) {
      return
    }
    // FOR SURE
    const totalChange = cpStart ? cpEnd.value - cpStart.value : cpEnd.value
    const amount = !cpStart
      ? 0
      : cpEnd.isCashOut
      ? cpEnd.lpAmount + cpEnd.lpAmountChange
      : cpEnd.lpAmount - cpEnd.lpAmountChange
    const fee = amount * perShares.feePerShares
    const pnl = amount * perShares.pnlPerShares
    const valueChange = cpStart
      ? cpEnd.lpAmountChange * cpEnd.price
      : cpEnd.value
    const price = totalChange - fee - pnl - valueChange
    const relativeChange =
      cpStart && cpStart.value ? (totalChange * 100) / cpStart.value : undefined

    return {
      isCron: !!cpEnd.isCron,
      isCashOut: cpEnd.isCashOut,
      amount: cpEnd.lpAmount,
      amountChange: cpEnd.lpAmountChange,
      timestamp: cpEnd.timestamp,
      tranche: tranche,
      value: cpEnd.value,
      totalChange: totalChange,
      price: cpEnd.price,
      relativeChange: relativeChange,
      valueMovement: {
        fee: fee,
        pnl: pnl,
        price: price,
        valueChange: valueChange,
      },
      wallet: wallet,
    }
  }
}
