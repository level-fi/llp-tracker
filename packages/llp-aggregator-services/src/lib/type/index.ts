import { IsAddress } from '../validator'
import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, Max, Min, Validate } from 'class-validator'
import { BigNumber } from 'ethers'

export enum PERSHARES_TYPE {
  FEE,
  PNL,
}

export interface CheckpointResponse {
  id: string
  isRemove: boolean
  lpAmountChange: BigNumber
  lpAmount: BigNumber
  value: BigNumber
  block: number
  timestamp: number
  wallet: string
  tranche: string
  price: BigNumber
  index: number
  tx: string
}

export interface Checkpoint {
  isCron?: boolean
  wallet: string
  tranche: string
  lpAmount: number
  lpAmountChange: number
  value: number
  price: number
  block: number
  timestamp: number
  isRemove: boolean
  tx: string
}

export interface PerShareResponse {
  id: string
  timestamp: number
  value: string
  tranche: string
  index: number
}

export interface PerShares {
  type: PERSHARES_TYPE
  tranche: string
  timestamp: number
  createdDate: number
  value: number
}

export class AggreatedDataHistory {
  isCron: boolean
  timestamp: number
  amount: number
  amountChange: number
  price: number
  value: number
  block: number
  tx: string
  isRemove: boolean
  totalChange: number
  valueMovement: {
    fee: number
    pnl: number
    price: number
    valueChange: number
  }
}

export class AggreatedData {
  wallet: string
  tranche: string
  from: number
  to: number
  amount: number
  amountChange: number
  price: number
  value: number
  totalChange: number
  relativeChange?: number
  nomialApr?: number
  netApr?: number
  valueMovement: {
    fee: number
    pnl: number
    price: number
    valueChange: number
  }
  histories: AggreatedDataHistory[]
}

export class RequestLiveTimeFrame {
  @Validate(IsAddress)
  wallet: string

  @Validate(IsAddress)
  tranche: string
}

export class RequestTimeFrame {
  @Validate(IsAddress)
  wallet: string

  @Validate(IsAddress)
  tranche: string

  @IsInt()
  @Type(() => Number)
  @Max(1000)
  @Min(10)
  size = 10

  @IsInt()
  @Min(1)
  @Type(() => Number)
  page = 1

  sort: 'desc' | 'asc' = 'desc'

  @Type(() => Number)
  from?: number

  @Type(() => Number)
  to?: number

}

export class RequestChart extends RequestTimeFrame {
  @IsInt()
  @Type(() => Number)
  @Max(1000)
  @Min(10)
  size = 1000
}

export interface CheckpointCrawlerJob {
  tranche: string
}

export interface PerSharesCrawlerJob {
  tranche: string
  type: PERSHARES_TYPE
  tableName: string
  redisKey: string
  decimals: number
}

export interface TimeFrameBuildJob {
  tranche: string
  items: {
    wallet: string
    points: number[]
  }[]
}

export interface TimeFrameTriggerJob {
  tranche: string
  wallets: string[]
}

export interface TimeFrameCollectJob {
  tranche: string
  timestamps: number[]
}

export interface TimeFrameNewCronCheckpointJob {
  tranche: string
  wallets: string[]
  timestamp: number
}

export class TrancheRebuildRequest {
  @IsNotEmpty()
  tranche: string
}

export class TrancheRebuildSingleWalletRequest {
  @IsNotEmpty()
  tranche: string
  @IsNotEmpty()
  wallet: string
}
