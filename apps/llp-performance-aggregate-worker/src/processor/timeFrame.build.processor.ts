import { aggregatedDataMapping } from 'llp-aggregator-services/dist/es'
import { TimeframeService } from 'llp-aggregator-services/dist/timeFrame'
import {
  AggreatedDataHistory,
  Checkpoint,
  TimeFrameBuildJob,
} from 'llp-aggregator-services/dist/type'
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
        removeItems[wallet] = []

        await Promise.all(
          checkPoints.map(async (range) => {
            if (!range.length) {
              return
            }

            const paired: [Checkpoint, Checkpoint][] = []
            ;[undefined, ...range].reduce((prev, cur) => {
              paired.push([prev, cur])
              return cur
            })

            if (!paired.length) {
              this.logger.debug(
                `[update] checkPoint data not enought for build timeFrame`,
              )
              return
            }

            const histories: AggreatedDataHistory[] = []
            await Promise.all(
              paired.map(async ([cpStart, cpEnd]) => {
                const data = await this.timeFrameService.aggreateDataHistories(
                  tranche,
                  cpStart,
                  cpEnd,
                )
                histories.push(data)

                this.logger.debug(
                  `[update] buidled timeFrame for ${wallet} ${tranche}: ${cpStart?.timestamp} → ${cpEnd.timestamp}`,
                )
              }),
            )

            const aggreateData = this.timeFrameService.aggreateData(
              tranche,
              wallet,
              histories,
            )
            aggreateData.forEach((current) => {
              const id = this.utilService.generateAggregatedId(current)
              removeItems[wallet].push(id)
              operations.push({
                create: {
                  _id: id,
                },
              })
              operations.push(current)
            })
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
}
