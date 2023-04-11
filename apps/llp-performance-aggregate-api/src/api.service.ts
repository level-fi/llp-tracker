import {
  QueryDslQueryContainer,
  QueryDslRangeQuery,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types'
import { RedisService } from 'llp-aggregator-services/dist/queue'
import { TimeframeService } from 'llp-aggregator-services/dist/timeFrame'
import {
  AggreatedData,
  RequestChart,
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
    const now = Math.floor(Date.now() / 1000)
    if (
      (!query.to || query.to >= now) &&
      ((query.sort === 'desc' && query.page === 1) ||
        (query.sort === 'asc' && query.page === result.total))
    ) {
      if (query.sort === 'desc') {
        const live = await this.timeFrameService.buildLiveCheckpoint(
          query.tranche.toLowerCase(),
          query.wallet.toLowerCase(),
          result.source[0],
        )
        if (live) {
          result.source = live.concat(result.source)
        }
      } else {
        const live = await this.timeFrameService.buildLiveCheckpoint(
          query.tranche.toLowerCase(),
          query.wallet.toLowerCase(),
          result.source[result.source.length - 1],
        )
        if (live) {
          result.source = result.source.concat(live)
        }
      }
    }
    return {
      data: result.source.map((c) => ({
        amount: c.amount,
        timestamp: Math.min(c.to, now),
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
    const now = Math.floor(Date.now() / 1000)
    if (
      (!query.to || query.to >= now) &&
      ((query.sort === 'desc' && query.page === 1) ||
        (query.sort === 'asc' && query.page === result.total))
    ) {
      if (query.sort === 'desc') {
        const live = await this.timeFrameService.buildLiveCheckpoint(
          query.tranche.toLowerCase(),
          query.wallet.toLowerCase(),
          result.source[0],
        )
        if (live) {
          result.source = live.concat(result.source)
        }
      } else {
        const live = await this.timeFrameService.buildLiveCheckpoint(
          query.tranche.toLowerCase(),
          query.wallet.toLowerCase(),
          result.source[result.source.length - 1],
        )
        if (live) {
          result.source = result.source.concat(live)
        }
      }
    }

    return {
      data: result.source.map((c) => ({
        amount: c.amount,
        amountChange: c.amountChange,
        timestamp: Math.min(c.to, now),
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
    const now = Math.floor(Date.now() / 1000)
    if (
      (!query.to || query.to >= now) &&
      ((query.sort === 'desc' && query.page === 1) ||
        (query.sort === 'asc' && query.page === result.total))
    ) {
      if (query.sort === 'desc') {
        const live = await this.timeFrameService.buildLiveCheckpoint(
          query.tranche.toLowerCase(),
          query.wallet.toLowerCase(),
          result.source[0],
        )
        if (live) {
          result.source = live.concat(result.source)
        }
      } else {
        const live = await this.timeFrameService.buildLiveCheckpoint(
          query.tranche.toLowerCase(),
          query.wallet.toLowerCase(),
          result.source[result.source.length - 1],
        )
        if (live) {
          result.source = result.source.concat(live)
        }
      }
    }
    return {
      data: result.source.map((c) => ({
        timestamp: Math.min(c.to, now),
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
    const now = Math.floor(Date.now() / 1000)
    if (
      (!query.to || query.to >= now) &&
      ((query.sort === 'desc' && query.page === 1) ||
        (query.sort === 'asc' && query.page === result.total))
    ) {
      if (query.sort === 'desc') {
        const live = await this.timeFrameService.buildLiveCheckpoint(
          query.tranche.toLowerCase(),
          query.wallet.toLowerCase(),
          result.source[0],
        )
        if (live) {
          result.source = live.concat(result.source)
        }
      } else {
        const live = await this.timeFrameService.buildLiveCheckpoint(
          query.tranche.toLowerCase(),
          query.wallet.toLowerCase(),
          result.source[result.source.length - 1],
        )
        if (live) {
          result.source = result.source.concat(live)
        }
      }
    }
    return {
      data: result.source.map((c) => ({
        isLive: now < c.to,
        to: Math.min(c.to, now),
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
