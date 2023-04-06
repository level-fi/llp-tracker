import { RedisService } from '../queue'
import { UtilService } from '../util'
import { Injectable } from '@nestjs/common'

@Injectable()
export class TrancheService {
  constructor(
    private readonly redisService: RedisService,
    private readonly utilService: UtilService,
  ) {}

  async getLPPrice(tranche: string, timestamp: number) {
    const prices = await this.redisService.client.zrevrangebyscore(
      this.utilService.getTranchePriceKey(tranche),
      timestamp,
      0,
      'LIMIT',
      0,
      1,
    )
    if (!prices?.length) {
      return
    }
    const price = this.utilService.parseBigNumber(
      prices[0],
      this.utilService.valueDecimals - this.utilService.lpTokenDecimals,
    )
    return price
  }
}
