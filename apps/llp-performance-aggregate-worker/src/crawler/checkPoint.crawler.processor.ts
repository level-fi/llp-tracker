import { checkPointMapping } from 'llp-aggregator-services/dist/es'
import { RedisService } from 'llp-aggregator-services/dist/queue'
import {
  CheckpointCrawlerJob,
  CheckpointResponse,
  Checkpoint,
} from 'llp-aggregator-services/dist/type'
import { UtilService } from 'llp-aggregator-services/dist/util'
import { TimeframeService } from 'llp-aggregator-services/dist/timeFrame'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { Queue } from 'bull'
import { BigNumber } from 'ethers'
import { gql, GraphQLClient } from 'graphql-request'
import { WorkerService } from '../worker.service'

@Injectable()
export class CheckpointCrawlerProcessor {
  private readonly logger = new Logger(CheckpointCrawlerProcessor.name)

  constructor(
    @InjectQueue() private readonly queue: Queue,
    private readonly config: ConfigService,
    private readonly workerService: WorkerService,
    private readonly utilService: UtilService,
    private readonly esService: ElasticsearchService,
    private readonly redisService: RedisService,
    private readonly timeFrameService: TimeframeService,
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

  get maxQuery(): number {
    return this.config.get<number>('crawler.maxQuery')
  }

  async update(job: CheckpointCrawlerJob) {
    const timeFrames = await this.fetch(job, this.maxQuery, this.pageSize)
    if (!timeFrames.length) {
      return
    }
    const existing = await this.workerService.createIndex(
      this.utilService.checkPointIndex,
      checkPointMapping,
    )
    if (!existing) {
      throw `index ${this.utilService.checkPointIndex} not ready`
    }
    const keyValueTimeFrames: { [id: string]: Checkpoint } = {}
    const operations = timeFrames.flatMap((doc) => {
      const id = this.utilService.generateCheckpointId(doc)
      const value: Checkpoint = {
        wallet: doc.wallet,
        tranche: doc.tranche,
        lpAmount: this.utilService.parseBigNumber(
          doc.lpAmount,
          this.utilService.lpTokenDecimals,
        ),
        lpAmountChange: this.utilService.parseBigNumber(
          doc.lpAmountChange,
          this.utilService.lpTokenDecimals,
        ),
        value: this.utilService.parseBigNumber(
          doc.value,
          this.utilService.valueDecimals,
        ),
        price: this.utilService.parseBigNumber(
          doc.price,
          this.utilService.valueDecimals - this.utilService.lpTokenDecimals,
        ),
        block: doc.block,
        timestamp: doc.timestamp,
        isRemove: doc.isRemove,
        tx: doc.tx,
      }
      keyValueTimeFrames[id] = value
      return [
        {
          create: {
            _id: id,
          },
        },
        value,
      ]
    })
    const createResponse = await this.esService.bulk({
      index: this.utilService.checkPointIndex,
      operations: operations,
      refresh: true,
    })
    const insertedCheckpoints = createResponse.items
      .filter((c) => c?.create?.status === 201)
      .map((c) => keyValueTimeFrames[c.create?._id])
    const [skipped, inserted] = [
      createResponse.items.filter((c) => c?.create?.status === 409).length,
      insertedCheckpoints.length,
    ]
    this.logger.log(
      `[fetch] update timeFrame of tranche ${
        job.tranche
      } [inserted ${inserted}, skipped ${skipped}, failed ${
        createResponse.items.length - inserted - skipped
      }]`,
    )

    // POST PROCESS
    await Promise.all([
      // store list address of tranche
      this.storeTrancheWallets(
        job.tranche,
        timeFrames.map((c) => c.wallet),
      ),
      // store all wallet checkPoint [cron not included]
      this.storeWalletCheckpoints(job.tranche, timeFrames),
      // store list wallet for aggreated data
      this.storePendingTrancheWallets(
        job.tranche,
        insertedCheckpoints.map((c) => c.wallet),
      ),
      // store cummulative of value and amount
      this.storeCummulativeChange(insertedCheckpoints),
    ])
    // register job for next fetch
    const newIndex = timeFrames[timeFrames.length - 1].index
    // remember set last synced timestamp for next fetch
    await this.redisService.client.set(
      this.utilService.getCheckpointLastSyncedKey(job.tranche),
      newIndex,
    )
    if (timeFrames.length === this.maxQuery * this.pageSize) {
      await this.queue.add('crawler.checkPoint', job)
    }
  }

  async fetch(
    job: CheckpointCrawlerJob,
    maxQuery: number,
    take: number,
  ): Promise<CheckpointResponse[]> {
    this.logger.debug(
      `[fetch] receive job for fetch timeFrame data for ${JSON.stringify(job)}`,
    )
    const rawLastSynced = await this.redisService.client.get(
      this.utilService.getCheckpointLastSyncedKey(job.tranche),
    )
    let lastSynced = parseInt(rawLastSynced)
    if (isNaN(lastSynced)) {
      lastSynced = 0
    }
    const subQueries: string[] = []
    for (let i = 0; i < maxQuery; i++) {
      const index = lastSynced + i * take
      subQueries.push(`
        call_${i}:walletTrancheHistories(
          first: $take
          orderBy: index
          orderDirection: asc
          where: { tranche: $tranche, index_gt: ${index} }
        ) {
          id
          llpAmount
          llpAmountChange
          llpPrice
          snapshotAtBlock
          snapshotAtTimestamp
          tranche
          wallet
          index
          tx
        }
      `)
    }
    const query = gql`
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
    const response = await this.graphqlClient.request(query, {
      tranche: job.tranche,
      take: take,
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
    return items.map((c: any): CheckpointResponse => {
      const amount = BigNumber.from(c.llpAmount)
      const price = BigNumber.from(c.llpPrice)
      const value = amount.mul(price)
      const amountChange = BigNumber.from(c.llpAmountChange)
      const isRemove = amountChange.lt(0)

      return {
        id: c.id,
        isRemove: isRemove,
        lpAmount: amount,
        lpAmountChange: amountChange,
        value: value,
        price: price,
        block: c.snapshotAtBlock,
        timestamp: c.snapshotAtTimestamp,
        tranche: c.tranche.toLowerCase(),
        wallet: c.wallet.toLowerCase(),
        index: c.index,
        tx: c.tx,
      }
    })
  }

  storeTrancheWallets(tranche: string, wallets: string[]) {
    if (!wallets.length) {
      return
    }
    return this.redisService.client.sadd(
      this.utilService.getWalletsKey(tranche),
      wallets,
    )
  }

  storeWalletCheckpoints(
    tranche: string,
    checkPointResponse: CheckpointResponse[],
  ) {
    // exclude all non balance change checkpoint
    const checkpoints = checkPointResponse.filter(
      (c) => !c.lpAmountChange.eq(0),
    )
    if (!checkpoints.length) {
      return
    }
    return Promise.all(
      checkpoints.map((c) =>
        this.redisService.client.zadd(
          this.utilService.getTimestampKey(tranche, c.wallet),
          c.timestamp,
          c.timestamp,
        ),
      ),
    )
  }

  storePendingTrancheWallets(tranche: string, wallets: string[]) {
    if (!wallets.length) {
      return
    }
    return this.redisService.client.sadd(
      this.utilService.getPendingWalletsKey(tranche),
      wallets,
    )
  }

  storeCummulativeChange(checkpoints: Checkpoint[]) {
    if (!checkpoints.length) {
      return
    }
    return checkpoints.map((cp) => {
      const nextScheduled = this.timeFrameService.getNextCronCheckpoint(
        cp.timestamp,
      )
      const valueKey = this.utilService.getCheckpointValueSummaryKey(
        cp.tranche,
        cp.wallet,
        nextScheduled,
      )
      const amountKey = this.utilService.getCheckpointAmountSummaryKey(
        cp.tranche,
        cp.wallet,
        nextScheduled,
      )
      return Promise.all([
        this.redisService.client.incrbyfloat(
          valueKey,
          cp.lpAmountChange * cp.price,
        ),
        this.redisService.client.incrbyfloat(amountKey, cp.lpAmountChange),
      ])
    })
  }
}
