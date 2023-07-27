import { checkPointMapping } from 'llp-aggregator-services/dist/es'
import { RedisService } from 'llp-aggregator-services/dist/queue'
import {
  PerSharesCrawlerJob,
  PerShareResponse,
  PerShares,
} from 'llp-aggregator-services/dist/type'
import { UtilService } from 'llp-aggregator-services/dist/util'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { Queue } from 'bull'
import { gql, GraphQLClient } from 'graphql-request'
import { WorkerService } from '../worker.service'
import { TimeframeService } from 'llp-aggregator-services/dist/timeFrame'

@Injectable()
export class PerSharesCrawlerProcessor {
  private readonly logger = new Logger(PerSharesCrawlerProcessor.name)

  constructor(
    @InjectQueue() private readonly queue: Queue,
    private readonly config: ConfigService,
    private readonly workerService: WorkerService,
    private readonly utilService: UtilService,
    private readonly esService: ElasticsearchService,
    private readonly redisService: RedisService,
    private readonly timeFrameService: TimeframeService,
  ) {}

  get startDate(): number {
    return this.config.get<number>('cronStartDate')
  }

  get graphqlEndpoint(): string {
    return this.config.get('endpoint.snapshot')
  }

  get graphqlClient(): GraphQLClient {
    return new GraphQLClient(this.graphqlEndpoint)
  }

  get pageSize(): number {
    return this.config.get<number>('crawler.pageSize')
  }

  get maxQuery(): number {
    return this.config.get<number>('crawler.maxQuery')
  }

  async update(job: PerSharesCrawlerJob) {
    const items = await this.fetch(job, this.maxQuery, this.pageSize)
    if (!items.length) {
      return
    }
    const existing = await this.workerService.createIndex(
      this.utilService.perSharesIndex,
      checkPointMapping,
    )
    if (!existing) {
      throw `index ${this.utilService.perSharesIndex} not ready`
    }
    const operations = items.flatMap((doc) => {
      const value = this.utilService.parseBigNumber(doc.value, job.decimals)
      return [
        {
          create: {
            _id: `${doc.timestamp}_${value}_${doc.id}`,
          },
        },
        {
          tranche: doc.tranche,
          timestamp: doc.timestamp,
          type: job.type,
          value: value,
          createdDate: Date.now(),
        } as PerShares,
      ]
    })
    const createResponse = await this.esService.bulk({
      index: this.utilService.perSharesIndex,
      operations: operations,
      refresh: true,
    })
    const insertedPerShares = createResponse.items.filter(
      (c) => c?.create?.status === 201,
    )
    const [skipped, inserted] = [
      createResponse.items.filter((c) => c?.create?.status === 409).length,
      insertedPerShares.length,
    ]
    this.logger.log(
      `[fetch] update ${job.tableName} of tranche ${
        job.tranche
      } [inserted ${inserted}, skipped ${skipped}, failed ${
        createResponse.items.length - inserted - skipped
      }]`,
    )
    // POST PROCESS
    // register job for next fetch
    const newIndex = items[items.length - 1].index
    // remember set last synced index for next fetch
    await this.redisService.client.set(job.redisKey, newIndex)
    if (items.length === this.maxQuery * this.pageSize) {
      await this.queue.add('crawler.perShares', job)
    }
    //
    await Promise.all(
      insertedPerShares.map((c) => {
        const id = c.create?._id
        if (!id) {
          return
        }
        const [timestamp, value] = id.split('_')
        const nextCron = this.timeFrameService.getNextCronCheckpoint(
          parseInt(timestamp),
        )
        if (nextCron <= this.startDate) {
          return
        }
        const key = this.utilService.getTranchePerSharesSummaryKey(
          job.redisKey,
          nextCron,
        )
        return this.redisService.client.incrbyfloat(key, value)
      }),
    )
  }

  async fetch(
    job: PerSharesCrawlerJob,
    maxQuery: number,
    take: number,
  ): Promise<PerShareResponse[]> {
    this.logger.debug(
      `[fetch] receive job for fetch ${job.tableName} data for ${JSON.stringify(
        job,
      )}`,
    )
    const rawLastSynced = await this.redisService.client.get(job.redisKey)
    let lastSynced = parseInt(rawLastSynced)
    if (isNaN(lastSynced)) {
      lastSynced = 0
    }

    const subQueries: string[] = []
    for (let i = 0; i < maxQuery; i++) {
      const index = lastSynced + i * take
      subQueries.push(`
        call_${i}:${job.tableName}(
          first: $take
          orderBy: index
          orderDirection: asc
          where: { index_gt: ${index}, tranche: $tranche }
        ) {
          id
          value
          timestamp
          tranche
          index
        }
      `)
    }
    const queries = gql`
      query ($tranche: String!, $take: Int!) {
        _meta {
          block {
            number
            timestamp
          }
        }
        ${subQueries.join(',')}
      }
    `
    const response = await this.graphqlClient.request(queries, {
      tranche: job.tranche,
      take: take,
      index: lastSynced,
    })
    if (!response) {
      return []
    }
    await this.workerService.logBlockSynced(
      response['_meta']?.block?.number,
      response['_meta']?.block?.timestamp,
    )
    delete response['_meta']
    //
    const items = Object.values(response).flat()
    return items.map(
      (c: any): PerShareResponse => ({
        id: c.id,
        timestamp: c.timestamp,
        tranche: c.tranche.toLowerCase(),
        value: c.value,
        index: c.index,
      }),
    )
  }
}
