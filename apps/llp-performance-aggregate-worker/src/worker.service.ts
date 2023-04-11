import { MappingProperty } from '@elastic/elasticsearch/lib/api/types'
import { Injectable } from '@nestjs/common'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { RedisService } from 'llp-aggregator-services/dist/queue'
import { UtilService } from 'llp-aggregator-services/dist/util'
import EventEmitter from 'events'

@Injectable()
export class WorkerService {
  constructor(
    private readonly esService: ElasticsearchService,
    private readonly utilService: UtilService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    EventEmitter.defaultMaxListeners = 100
  }

  async createIndex(name: string, mapping: Record<string, MappingProperty>) {
    try {
      await this.esService.indices.create({
        index: name,
        mappings: {
          properties: mapping,
        },
      })
      return true
    } catch {
      const existing = await this.esService.indices.exists({
        index: name,
      })
      return existing
    }
  }

  logBlockSynced(blockNumber: number, blockTimestamp: number) {
    return this.redisService.client.zadd(
      this.utilService.getBlockSyncedKey(),
      blockNumber,
      blockTimestamp,
    )
  }
}
