import {
  QueryDslQueryContainer,
  QueryDslRangeQuery,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types'
import { RedisService } from 'llp-aggregator-services/dist/queue'
import { TimeframeService } from 'llp-aggregator-services/dist/timeFrame'
import {
  AggreatedData,
  AggreatedDataHistory,
  RequestChart,
  RequestLiveTimeFrame,
  RequestTimeFrame,
} from 'llp-aggregator-services/dist/type'
import { UtilService } from 'llp-aggregator-services/dist/util'
import { Injectable } from '@nestjs/common'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { TimeFrameScheduler } from './scheduler/timeFrame.scheduler'

@Injectable()
export class ApiService {
  constructor(
    private readonly esService: ElasticsearchService,
    private readonly utilService: UtilService,
    private readonly redisService: RedisService,
    private readonly timeFrameService: TimeframeService,
    private readonly timeFrameScheduler: TimeFrameScheduler,
  ) {}

  async getLiquidityChart(query: RequestChart) {
    const existing = await this.esService.indices.exists({
      index: this.utilService.aggregatedDataIndex,
    })
    if (!existing) {
      return {
        data: [],
      }
    }
    const result = await this.queryTimeFrames(query)
    return {
      data: result.source.map((c) => ({
        amount: c.amount,
        timestamp: c.to,
        value: c.value,
      })),
      page: {
        totalItems: result.totalItems,
        total: result.total,
        current: query.page,
        size: query.size,
      },
    }
  }

  async getTrackingChart(query: RequestChart) {
    const existing = await this.esService.indices.exists({
      index: this.utilService.aggregatedDataIndex,
    })
    if (!existing) {
      return {
        data: [],
      }
    }
    const result = await this.queryTimeFrames(query)
    return {
      data: result.source.map((c) => ({
        amount: c.amount,
        amountChange: c.amountChange,
        timestamp: c.to,
        totalChange: c.totalChange,
        value: c.value,
        relativeChange: c.relativeChange,
        valueMovement: {
          fee: c.valueMovement?.fee,
          pnl: c.valueMovement?.pnl,
          price: c.valueMovement?.price,
          valueChange: c.valueMovement?.valueChange,
        },
      })),
      page: {
        totalItems: result.totalItems,
        total: result.total,
        current: query.page,
        size: query.size,
      },
    }
  }

  async getAPRChart(query: RequestChart) {
    const existing = await this.esService.indices.exists({
      index: this.utilService.aggregatedDataIndex,
    })
    if (!existing) {
      return {
        data: [],
      }
    }
    const result = await this.queryTimeFrames(query)
    return {
      data: result.source.map((c) => ({
        timestamp: c.to,
        nominalApr: c.nomialApr,
        netApr: c.netApr,
      })),
      page: {
        totalItems: result.totalItems,
        total: result.total,
        current: query.page,
        size: query.size,
      },
    }
  }

  async getTimeFrames(query: RequestTimeFrame) {
    const existing = await this.esService.indices.exists({
      index: this.utilService.aggregatedDataIndex,
    })
    if (!existing) {
      return {
        data: [],
      }
    }
    const result = await this.queryTimeFrames(query)
    return {
      data: result.source.map((c) => ({
        to: c.to,
        from: c.from,
        amount: c.amount,
        amountChange: c.amountChange,
        value: c.value,
        totalChange: c.totalChange,
        price: c.price,
        relativeChange: c.relativeChange,
        valueMovement: {
          fee: c.valueMovement?.fee,
          pnl: c.valueMovement?.pnl,
          price: c.valueMovement?.price,
          valueChange: c.valueMovement?.valueChange,
        },
        nominalApr: c.nomialApr,
        netApr: c.netApr,
      })),
      page: {
        totalItems: result.totalItems,
        total: result.total,
        current: query.page,
        size: query.size,
      },
    }
  }

  async queryTimeFrames(
    query: RequestTimeFrame,
    queries: QueryDslQueryContainer[] = [],
  ) {
    const sort = query.sort
    queries.push({
      term: {
        wallet: query.wallet.toLowerCase(),
      },
    })
    queries.push({
      term: {
        tranche: query.tranche.toLowerCase(),
      },
    })
    if (query.from || query.to) {
      const dateRange: QueryDslRangeQuery = {}
      if (query.from) {
        dateRange.gte = query.from
      }
      if (query.to) {
        dateRange.lte = query.to
      }
      queries.push({
        range: {
          to: dateRange,
        },
      })
    }
    const results = await this.esService.search<AggreatedData>({
      index: this.utilService.aggregatedDataIndex,
      query: {
        bool: {
          must: queries,
        },
      },
      size: query.size,
      from: query.size * (query.page - 1),
      sort: [
        {
          to: ['asc', 'desc'].includes(sort) ? sort : 'desc',
        },
      ],
    })
    const totalItems = (results.hits.total as SearchTotalHits).value
    const total = Math.ceil(totalItems / query.size)
    return {
      source: results.hits.hits?.map((c) => c._source) || [],
      totalItems,
      total,
    }
  }

  async getLiveTimeFrame(query: RequestLiveTimeFrame) {
    const lastFrame = await this.esService.search<AggreatedData>({
      size: 1,
      query: {
        bool: {
          must: [
            {
              term: {
                tranche: query.tranche.toLowerCase(),
              },
            },
            {
              term: {
                wallet: query.wallet.toLowerCase(),
              },
            },
          ],
        },
      },
      sort: {
        to: 'desc',
      },
    })
    let histories: AggreatedDataHistory[] = []
    if (lastFrame.hits.hits?.length && lastFrame.hits.hits[0]._source.amount) {
      histories = lastFrame.hits.hits[0]._source.histories
    } else {
      const prevCron = this.timeFrameService.getPrevCronCheckpoint(
        Math.floor(Date.now() / 1000),
      )
      histories = [
        {
          amount: 0,
          amountChange: 0,
          block: undefined,
          isCron: true,
          isRemove: false,
          price: 0,
          timestamp: prevCron,
          totalChange: 0,
          tx: undefined,
          value: 0,
          valueMovement: {
            fee: 0,
            pnl: 0,
            price: 0,
            valueChange: 0,
          },
        },
      ]
    }
    const live = await this.timeFrameService.buildLiveCheckpoint(
      query.tranche.toLowerCase(),
      query.wallet.toLowerCase(),
      histories,
    )
    if (!live) {
      return {
        data: undefined,
      }
    }
    return {
      data: {
        to: Math.floor(Date.now() / 1000),
        from: live.from,
        amount: live.amount,
        amountChange: live.amountChange,
        value: live.value,
        totalChange: live.totalChange,
        price: live.price,
        relativeChange: live.relativeChange,
        valueMovement: {
          fee: live.valueMovement?.fee,
          pnl: live.valueMovement?.pnl,
          price: live.valueMovement?.price,
          valueChange: live.valueMovement?.valueChange,
        },
        nominalApr: live.nomialApr,
        netApr: live.netApr,
      },
    }
  }

  async triggerRebuildTrancheTimeFrame(tranche: string) {
    const wallets = await this.redisService.client.smembers(
      this.utilService.getWalletsKey(tranche),
    )
    await this.redisService.client.sadd(
      this.utilService.getPendingWalletsKey(tranche),
      wallets,
    )
    return {
      data: wallets,
    }
  }

  async triggerRebuildTranchesTimeFrame() {
    await Promise.all(
      this.utilService.tranches.map((tranche) =>
        this.triggerRebuildTrancheTimeFrame(tranche),
      ),
    )
    await this.timeFrameScheduler.createJob()
    return {
      data: 'OK',
    }
  }

  async triggerRebuildWalletTimeFrame(tranche: string, wallet: string) {
    await this.redisService.client.sadd(
      this.utilService.getPendingWalletsKey(tranche),
      wallet.toLowerCase(),
    )
    await this.timeFrameScheduler.createJob()
    return {
      data: 'OK',
    }
  }

  isSynced() {
    return Promise.all(
      this.utilService.tranches.map(async (tranche) => {
        const [stats, readyForBuild] = await Promise.all([
          this.timeFrameService.syncedStats(tranche),
          this.timeFrameService.isReadyForAggreate(tranche),
        ])
        const synced = stats
          ? stats.es.checkPoint === stats.graph.checkPoint &&
            stats.es.fee === stats.graph.fee &&
            stats.es.pnl === stats.graph.pnl
          : false
        return {
          tranche,
          synced: synced,
          stats: stats,
          readyForBuild: readyForBuild,
        }
      }),
    )
  }

  async getLastSyncedInfo() {
    const exist = await this.esService.indices.exists({
      index: this.utilService.aggregatedDataIndex,
    })
    if (!exist) {
      return {
        data: {},
      }
    }

    const [timestamp, block] = await this.redisService.client.zrevrange(
      this.utilService.getBlockSyncedKey(),
      0,
      -1,
      'WITHSCORES',
    )
    return {
      data: {
        block: block,
        timestamp: timestamp,
      },
    }
  }
}
