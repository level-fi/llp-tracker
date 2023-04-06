import { Checkpoint, PERSHARES_TYPE } from '../type'
import { UtilService } from '../util'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { gql, GraphQLClient } from 'graphql-request'
import * as cronParser from 'cron-parser'
import { RedisService } from '../queue'
import { TrancheService } from '../tranche'

@Injectable()
export class TimeframeService {
  private readonly logger = new Logger(TimeframeService.name)

  constructor(
    private readonly utilService: UtilService,
    private readonly esService: ElasticsearchService,
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
    private readonly trancheService: TrancheService,
  ) {}

  get graphqlEndpoint(): string {
    return this.config.get('endpoint.snapshot')
  }

  get graphqlClient(): GraphQLClient {
    return new GraphQLClient(this.graphqlEndpoint)
  }

  get expression() {
    return this.config.get<string>('scheduler.checkPoint')
  }

  async syncedStats(tranche: string) {
    const checkPointExist = await this.esService.indices.exists({
      index: [
        this.utilService.checkPointIndex,
        this.utilService.perSharesIndex,
      ],
    })
    if (!checkPointExist) {
      return
    }
    const queries = gql`
      query ($tranche: String!) {
        walletTrancheHistories(
          first: 1
          orderBy: index
          orderDirection: desc
          where: { tranche: $tranche }
        ) {
          index
        }
        feePerShares(
          first: 1
          orderBy: index
          orderDirection: desc
          where: { tranche: $tranche }
        ) {
          index
        }
        pnlPerShares(
          first: 1
          orderBy: index
          orderDirection: desc
          where: { tranche: $tranche }
        ) {
          index
        }
      }
    `
    const [
      checkPointCounter,
      perShareCounter,
      { walletTrancheHistories, feePerShares, pnlPerShares },
    ] = await Promise.all([
      this.esService.count({
        index: this.utilService.checkPointIndex,
        query: {
          term: {
            tranche: tranche,
          },
        },
      }),
      this.esService.search({
        size: 0,
        track_total_hits: true,
        index: this.utilService.perSharesIndex,
        query: {
          term: {
            tranche: tranche,
          },
        },
        aggregations: {
          byType: {
            terms: {
              field: 'type',
            },
          },
        },
      }),
      this.graphqlClient.request<{
        walletTrancheHistories
        feePerShares
        pnlPerShares
      }>(queries, {
        tranche: tranche,
      }),
    ])
    // es stats
    const numberOfCheckpoint = checkPointCounter.count
    const numberOfFee: number = perShareCounter.aggregations?.['byType']?.[
      'buckets'
    ]?.find((c) => c.key == PERSHARES_TYPE.FEE)?.doc_count
    const numberOfPnL: number = perShareCounter.aggregations?.['byType']?.[
      'buckets'
    ]?.find((c) => c.key == PERSHARES_TYPE.PNL)?.doc_count

    // subgraph stats
    const graphNumberOfCheckpoint = walletTrancheHistories?.[0]?.index
    const graphNumberOfFee = feePerShares?.[0]?.index
    const graphNumberOfPnl = pnlPerShares?.[0]?.index

    this.logger.debug(`[syncedStats] ${tranche} check for ready build
    subgraph stats:
        checkPoints:    ${graphNumberOfCheckpoint}
        fee:            ${graphNumberOfFee}
        pnl:            ${graphNumberOfPnl}
    es stats:
        checkPoints:    ${numberOfCheckpoint}
        fee:            ${numberOfFee}
        pnl:            ${numberOfPnL}
`)

    return {
      es: {
        checkPoint: numberOfCheckpoint,
        fee: numberOfFee,
        pnl: numberOfPnL,
      },
      graph: {
        checkPoint: graphNumberOfCheckpoint,
        fee: graphNumberOfFee,
        pnl: graphNumberOfPnl,
      },
    }
  }

  async isReadyForAggreate(tranche: string) {
    const checkPointExist = await this.esService.indices.exists({
      index: [
        this.utilService.checkPointIndex,
        this.utilService.perSharesIndex,
      ],
    })
    if (!checkPointExist) {
      return
    }
    // FETCH total checkPoint
    const [checkPointCounter, { walletTrancheHistories }] = await Promise.all([
      this.esService.count({
        index: this.utilService.checkPointIndex,
        query: {
          term: {
            tranche: tranche,
          },
        },
      }),
      this.graphqlClient.request<{
        walletTrancheHistories
      }>(
        gql`
          query ($tranche: String!) {
            walletTrancheHistories(
              first: 1
              orderBy: index
              orderDirection: desc
              where: { tranche: $tranche }
            ) {
              index
              snapshotAtTimestamp
            }
          }
        `,
        {
          tranche: tranche,
        },
      ),
    ])
    const totalGraphCheckpoint = walletTrancheHistories?.[0]?.index
    const totalESCheckpoint = checkPointCounter.count
    if (totalGraphCheckpoint !== totalESCheckpoint) {
      return false
    }
    //
    const lastGraphTimestamp = walletTrancheHistories?.[0]?.snapshotAtTimestamp
    const [{ feePerShares, pnlPerShares }, perShareCounter] = await Promise.all(
      [
        this.graphqlClient.request<{
          feePerShares
          pnlPerShares
        }>(
          gql`
            query ($tranche: String!, $timestamp: Int!) {
              feePerShares(
                first: 1
                orderBy: index
                orderDirection: desc
                where: { tranche: $tranche, timestamp_lte: $timestamp }
              ) {
                index
              }
              pnlPerShares(
                first: 1
                orderBy: index
                orderDirection: desc
                where: { tranche: $tranche, timestamp_lte: $timestamp }
              ) {
                index
              }
            }
          `,
          {
            tranche: tranche,
            timestamp: lastGraphTimestamp,
          },
        ),
        this.esService.search({
          size: 0,
          track_total_hits: true,
          index: this.utilService.perSharesIndex,
          query: {
            bool: {
              must: [
                {
                  term: {
                    tranche: tranche,
                  },
                },
                {
                  range: {
                    timestamp: {
                      lte: lastGraphTimestamp,
                    },
                  },
                },
              ],
            },
          },
          aggregations: {
            byType: {
              terms: {
                field: 'type',
              },
            },
          },
        }),
      ],
    )
    const numberOfFee: number = perShareCounter.aggregations?.['byType']?.[
      'buckets'
    ]?.find((c) => c.key == PERSHARES_TYPE.FEE)?.doc_count
    const numberOfPnL: number = perShareCounter.aggregations?.['byType']?.[
      'buckets'
    ]?.find((c) => c.key == PERSHARES_TYPE.PNL)?.doc_count

    const graphNumberOfFee = feePerShares?.[0]?.index
    const graphNumberOfPnl = pnlPerShares?.[0]?.index

    this.logger.debug(`[isReadyForAggreate] ${tranche} check for ready build
    subgraph stats:
        checkPoints:    ${totalGraphCheckpoint}
        fee:            ${graphNumberOfFee}
        pnl:            ${graphNumberOfPnl}
    es stats:
        checkPoints:    ${totalESCheckpoint}
        fee:            ${numberOfFee}
        pnl:            ${numberOfPnL}
`)

    return numberOfFee === graphNumberOfFee && numberOfPnL === graphNumberOfPnl
  }

  generateCronCheckpoints(timeseries: number[]): number[] {
    if (!timeseries.length) {
      return []
    }
    const startDate = new Date(Math.min(...timeseries) * 1000)
    const endDate = new Date(Math.max(...timeseries) * 1000)
    const interval = cronParser.parseExpression(this.expression, {
      currentDate: startDate,
      endDate: endDate,
      iterator: true,
    })
    const results: number[] = []
    while (interval.hasNext()) {
      const current = interval.next()
      results.push(Math.floor(current.value.getTime() / 1000))
      if (current.done) {
        break
      }
    }
    return results
  }

  async fetchPerShares(tranche: string, from: number, to: number) {
    this.logger.debug(
      `[fetchFeePerShares] fetch fee per shares with: tranche ${tranche}, from ${from}, to ${to}`,
    )
    const existing = await this.esService.indices.exists({
      index: this.utilService.perSharesIndex,
    })
    if (!existing) {
      return
    }
    const results = await this.esService.search({
      index: this.utilService.perSharesIndex,
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          must: [
            {
              term: {
                tranche: tranche,
              },
            },
            {
              range: {
                timestamp: {
                  gte: from,
                  lt: to,
                },
              },
            },
          ],
        },
      },
      aggs: {
        fee: {
          filter: {
            term: {
              type: PERSHARES_TYPE.FEE,
            },
          },
          aggs: {
            perShares: {
              sum: { field: 'value' },
            },
          },
        },
        pnl: {
          filter: {
            term: {
              type: PERSHARES_TYPE.PNL,
            },
          },
          aggs: {
            perShares: {
              sum: { field: 'value' },
            },
          },
        },
      },
    })
    return {
      feePerShares:
        results.aggregations?.['fee']?.['perShares']?.['value'] || 0,
      pnlPerShares:
        results.aggregations?.['pnl']?.['perShares']?.['value'] || 0,
    }
  }

  async getWalletCheckpoints(tranche: string, wallet: string) {
    const userActionPoints = await this.redisService.client.zrangebyscore(
      this.utilService.getTimestampKey(tranche, wallet),
      0,
      '+inf',
    )
    const parsedUserActionPoints = userActionPoints
      .map((c) => parseInt(c))
      .filter((c) => !isNaN(c))

    const stillHasLiquidity = await this.isWalletHasLiquidity(tranche, wallet)

    const cronPoints = await this.redisService.client.zrangebyscore(
      this.utilService.getCronCheckpointKey(),
      Math.min(...parsedUserActionPoints),
      stillHasLiquidity ? '+inf' : Math.max(...parsedUserActionPoints),
    )
    const parsedCronPoints = cronPoints
      .map((c) => parseInt(c))
      .filter((c) => !isNaN(c))

    const points =
      parsedUserActionPoints.length <= 1
        ? parsedUserActionPoints
        : [...parsedCronPoints, ...parsedUserActionPoints]
    return points
  }

  async isWalletHasLiquidity(tranche: string, wallet: string) {
    const exist = await this.esService.indices.exists({
      index: this.utilService.checkPointIndex,
    })
    if (!exist) {
      return false
    }
    const last = await this.esService.search<Checkpoint>({
      index: this.utilService.checkPointIndex,
      size: 1,
      query: {
        bool: {
          must: [
            {
              term: {
                tranche: tranche,
              },
            },
            {
              term: {
                wallet: wallet,
              },
            },
          ],
        },
      },
      sort: {
        timestamp: 'desc',
      },
    })
    return !!last.hits.hits?.[0]?._source?.lpAmount
  }

  async fetchLiquidityBasedCheckpoints(
    tranche: string,
    wallet: string,
    timestamps: number[],
  ) {
    const existing = await this.esService.indices.exists({
      index: this.utilService.checkPointIndex,
    })
    if (!existing) {
      return []
    }
    const checkPoints: Checkpoint[] = []
    // TODO: mem issue
    const size = 50
    const total = timestamps.length
    for (let i = 0; i < total; i += size) {
      const splicedTimestamps = timestamps.slice(i, i + size)
      const items = await this.esService.search<Checkpoint>({
        index: this.utilService.checkPointIndex,
        size: size,
        query: {
          bool: {
            must: [
              {
                term: {
                  tranche: tranche,
                },
              },
              {
                term: {
                  wallet: wallet,
                },
              },
              {
                bool: {
                  should: splicedTimestamps.map((timestamp) => ({
                    term: {
                      timestamp: timestamp,
                    },
                  })),
                },
              },
            ],
          },
        },
      })
      checkPoints.push(...items.hits.hits?.map((c) => c._source))
    }
    return checkPoints
  }

  async fetchCheckpointsData(
    tranche: string,
    wallet: string,
    timestamps: number[],
  ) {
    // FOR SURE
    timestamps.sort()
    this.logger.debug(
      `[fetchCheckpoints] fetch checkPoint data of tranche ${tranche} with ${wallet}`,
    )
    const checkPoints = await this.fetchLiquidityBasedCheckpoints(
      tranche,
      wallet,
      timestamps,
    )
    const results: Checkpoint[][] = []
    // pointer will grow up when wallet remove all liquidity at checkPoint
    let pointer = 0
    for (const timestamp of timestamps) {
      if (!results[pointer]) {
        results[pointer] = []
      }

      const checkPoint = checkPoints.find((c) => c.timestamp === timestamp)
      if (checkPoint) {
        results[pointer].push(checkPoint)
        if (!checkPoint.lpAmount) {
          pointer++
        }
        continue
      }

      if (!results[pointer].length) {
        continue
      }

      const lastAction = results[pointer][results[pointer].length - 1]
      const price = await this.trancheService.getLPPrice(tranche, timestamp)
      const amount = lastAction.lpAmount
      const value = price ? price * amount : 0
      const cronCheckpoint: Checkpoint = {
        isCron: true,
        lpAmount: amount,
        lpAmountChange: 0,
        price: price,
        timestamp: timestamp,
        tranche: tranche,
        wallet: wallet,
        value: value,
        raw: undefined,
        isCashOut: false,
      }
      results[pointer].push(cronCheckpoint)
    }
    return results
  }
}
