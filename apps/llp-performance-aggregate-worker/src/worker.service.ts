import { MappingProperty } from '@elastic/elasticsearch/lib/api/types'
import { Injectable } from '@nestjs/common'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import EventEmitter from 'events'

@Injectable()
export class WorkerService {
  constructor(private readonly esService: ElasticsearchService) {}

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
}
