import {
  RequestChart,
  RequestTimeFrame,
  TrancheRebuildSingleWalletRequest,
  TrancheRebuildRequest,
  RequestLiveTimeFrame,
} from 'llp-aggregator-services/dist/type'
import { Param, UseGuards } from '@nestjs/common'
import { Controller, Get, Query } from '@nestjs/common'
import { ApiService } from './api.service'
import { ApiKeyGuard } from './guard/apikey.guard'

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

  @Get('/charts/apr')
  getAPRChart(@Query() query: RequestChart) {
    return this.service.getAPRChart(query)
  }

  @Get('/time-frames')
  getTimeFrames(@Query() query: RequestTimeFrame) {
    return this.service.getTimeFrames(query)
  }

  @Get('/time-frames/live')
  getLiveTimeFrame(@Query() query: RequestLiveTimeFrame) {
    return this.service.getLiveTimeFrame(query)
  }

  @Get('/rebuild/:tranche')
  @UseGuards(ApiKeyGuard)
  triggerRebuildTrancheTimeFrame(@Param() request: TrancheRebuildRequest) {
    return this.service.triggerRebuildTrancheTimeFrame(request.tranche)
  }

  @Get('/rebuild/:tranche/:wallet')
  @UseGuards(ApiKeyGuard)
  triggerRebuildWalletTimeFrame(
    @Param() request: TrancheRebuildSingleWalletRequest,
  ) {
    return this.service.triggerRebuildWalletTimeFrame(
      request.tranche,
      request.wallet,
    )
  }

  @Get('/rebuild')
  @UseGuards(ApiKeyGuard)
  triggerRebuildTranchesTimeFrame() {
    return this.service.triggerRebuildTranchesTimeFrame()
  }

  @Get('/build/status')
  checkBuildStatus() {
    return this.service.isSynced()
  }

  @Get('/status')
  checkStatus() {
    return this.service.getLastSyncedInfo()
  }
}
