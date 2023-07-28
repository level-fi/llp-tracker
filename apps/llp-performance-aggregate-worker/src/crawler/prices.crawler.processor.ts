import { RedisService } from 'llp-aggregator-services/dist/queue'
import {
  PriceResponse,
  PricesCrawlerJob,
} from 'llp-aggregator-services/dist/type'
import { UtilService } from 'llp-aggregator-services/dist/util'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue } from 'bull'
import { BigNumber } from 'ethers'
import { gql, GraphQLClient } from 'graphql-request'
import { WorkerService } from '../worker.service'

@Injectable()
export class PricesCrawlerProcessor {
  private readonly logger = new Logger(PricesCrawlerProcessor.name)

  constructor(
    @InjectQueue() private readonly queue: Queue,
    private readonly config: ConfigService,
    private readonly workerService: WorkerService,
    private readonly utilService: UtilService,
    private readonly redisService: RedisService,
  ) {}

  get graphqlEndpoint(): string {
    return this.config.get('endpoint.snapshot')
  }

  get graphqlClient(): GraphQLClient {
    return new GraphQLClient(this.graphqlEndpoint)
  }

  get pageSize(): number {
    return this.config.get<number>('crawler.pageSize')
  }

  async update(job: PricesCrawlerJob) {
    const prices = await this.fetch(job, this.pageSize)
    if (!prices.length) {
      return
    }
    this.logger.debug(
      `[update] fetched ${prices.length} prices of ${job.tranche}`,
    )
    await this.redisService.client.zadd(
      this.utilService.getTranchePriceKey(job.tranche),
      ...prices.flatMap((c) => [c.timestamp, c.price.toString()]),
    )
    this.logger.debug(
      `[update] inserted ${prices.length} prices of ${job.tranche}`,
    )
    // register job for next fetch
    const newLastSynced = prices[prices.length - 1].timestamp
    // remember set last synced timestamp for next fetch
    await this.redisService.client.set(
      this.utilService.getPricesLastSyncedKey(job.tranche),
      newLastSynced,
    )
    if (prices.length === this.pageSize) {
      await this.queue.add('crawler.prices', job)
      this.logger.debug(
        `[update] continue fetch prices, register new job ${JSON.stringify(
          job,
        )}`,
      )
    }
  }

  async fetch(job: PricesCrawlerJob, take: number): Promise<PriceResponse[]> {
    this.logger.debug(
      `[fetch] receive job for fetch prices data for ${JSON.stringify(job)}`,
    )
    const rawLastSynced = await this.redisService.client.get(
      this.utilService.getPricesLastSyncedKey(job.tranche),
    )
    let lastSynced = parseInt(rawLastSynced)
    if (isNaN(lastSynced)) {
      lastSynced = 0
    } else {
      lastSynced -= 1
    }
    const query = gql`
      query ($tranche: String!, $take: Int!, $timestamp: Int!) {
        _meta {
          block {
            number
            timestamp
          }
        }
        llpPrices(
          first: $take
          orderBy: snapshotAtTimestamp
          orderDirection: asc
          where: { tranche: $tranche, snapshotAtTimestamp_gt: $timestamp }
        ) {
          id
          price
          snapshotAtTimestamp
        }
      }
    `
    const response = await this.graphqlClient.request(query, {
      tranche: job.tranche,
      take: take,
      timestamp: lastSynced,
    })
    if (!response) {
      return []
    }
    await this.workerService.logBlockSynced(
      response['_meta']?.block?.number,
      response['_meta']?.block?.timestamp,
    )
    //
    return response.llpPrices.map((c: any): PriceResponse => {
      const price = BigNumber.from(c.price)
      return {
        price: price,
        timestamp: c.snapshotAtTimestamp,
      }
    })
  }
}
