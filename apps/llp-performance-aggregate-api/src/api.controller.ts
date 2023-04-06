import {
  RequestChart,
  RequestTimeFrame,
} from 'llp-aggregator-services/dist/type'
import { Param } from '@nestjs/common'
import { Controller, Get, Query } from '@nestjs/common'
import { ApiService } from './api.service'

@Controller()
export class ApiController {
  constructor(private readonly service: ApiService) {}

  @Get('/charts/liquidity')
  getLiquidityChart(@Query() query: RequestChart) {
    return this.service.getLiquidityChart(query)
  }

  @Get('/charts/tracking')
  getTrackingChart(@Query() query: RequestChart) {
    return this.service.getTrackingChart(query)
  }

  @Get('/time-frames')
  getTimeFrames(@Query() query: RequestTimeFrame) {
    return this.service.getTimeFrames(query)
  }

  @Get('/rebuild/:tranche')
  triggerRebuildTrancheTimeFrame(@Param('tranche') tranche: string) {
    return this.service.triggerRebuildTrancheTimeFrame(tranche)
  }

  @Get('/rebuild/:tranche/:wallet')
  triggerRebuildWalletTimeFrame(
    @Param('tranche') tranche: string,
    @Param('wallet') wallet: string,
  ) {
    return this.service.triggerRebuildWalletTimeFrame(tranche, wallet)
  }

  @Get('/rebuild')
  triggerRebuildTranchesTimeFrame() {
    return this.service.triggerRebuildTranchesTimeFrame()
  }

  @Get('status')
  checkStatus() {
    return this.service.isSynced()
  }
}
