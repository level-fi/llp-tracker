import { AggreatedData, CheckpointResponse } from "../type";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BigNumber, BigNumberish, utils } from "ethers";
import { formatUnits, isAddress } from "ethers/lib/utils";

@Injectable()
export class UtilService {
  get valueDecimals(): number {
    const defaultValue = 30;
    if (!this.configService) {
      return defaultValue;
    }
    return this.configService.get<number>("decimals.value") || defaultValue;
  }

  get lpTokenDecimals(): number {
    const defaultValue = 18;
    if (!this.configService) {
      return defaultValue;
    }
    return this.configService.get<number>("decimals.amount") || defaultValue;
  }

  get feePerSharesDecimals(): number {
    const defaultValue = 24;
    if (!this.configService) {
      return defaultValue;
    }
    const based = this.configService.get<number>("decimals.fee") || 12;
    return this.valueDecimals - this.lpTokenDecimals + based;
  }

  get pnlPerSharesDecimals(): number {
    const defaultValue = 24;
    if (!this.configService) {
      return defaultValue;
    }
    const based = this.configService.get<number>("decimals.pnl") || 12;
    return this.valueDecimals - this.lpTokenDecimals + based;
  }

  get env(): string {
    return this.configService.get<string>("NODE_ENV");
  }

  get app(): string {
    return "llp";
  }

  get version(): string {
    return this.configService.get<string>("version");
  }

  get aggregatedDataIndex(): string {
    const index = this.configService.get<string>("es.indicies.aggregatedData");
    if (index) {
      return index;
    }
    return `${this.app}_${this.chainId}_${this.version}_${this.env}_aggregated`;
  }

  get checkPointIndex(): string {
    const index = this.configService.get<string>("es.indicies.checkPoint");
    if (index) {
      return index;
    }
    return `${this.app}_${this.chainId}_${this.version}_${this.env}_checkpoints`;
  }

  get perSharesIndex(): string {
    const index = this.configService.get<string>("es.indicies.pershares");
    if (index) {
      return index;
    }
    return `${this.app}_${this.chainId}_${this.version}_${this.env}_pershares`;
  }

  get tranches(): string[] {
    const raw = this.configService.get<string>("chainConfig.tranches");
    if (!raw) {
      return;
    }
    const data = raw
      .toLowerCase()
      .split(",")
      .filter((c) => isAddress(c));
    return data.filter((c, i) => data.indexOf(c) === i);
  }

  get chainId(): number {
    return this.configService.get<number>("chainConfig.chainId");
  }

  constructor(private readonly configService: ConfigService) {}

  parseBigNumber(value: BigNumberish, decimals: number) {
    if (!value) {
      return;
    }
    return parseFloat(formatUnits(BigNumber.from(value), decimals));
  }

  getCheckpointLastSyncedKey(tranche: string, chainId = this.chainId) {
    return `${this.app}:${chainId}:${this.version}:${
      this.env
    }:crawler:${tranche.toLowerCase()}:checkPoint`;
  }

  getFeePerSharesLastSyncedKey(tranche: string, chainId = this.chainId) {
    return `${this.app}:${chainId}:${this.version}:${
      this.env
    }:crawler:${tranche.toLowerCase()}:fee_per_shares`;
  }

  getPnLPerSharesLastSyncedKey(tranche: string, chainId = this.chainId) {
    return `${this.app}:${chainId}:${this.version}:${
      this.env
    }:crawler:${tranche.toLowerCase()}:pnl_per_shares`;
  }

  getTranchePerSharesSummaryKey(prefix: string, timestamp: number | string) {
    return `${prefix}:${timestamp}`;
  }

  getWalletsKey(tranche: string, chainId = this.chainId) {
    return `${this.app}:${chainId}:${this.version}:${
      this.env
    }:tranche:${tranche.toLowerCase()}:wallets`;
  }

  getPendingWalletsKey(tranche: string, chainId = this.chainId) {
    return `${this.app}:${chainId}:${this.version}:${
      this.env
    }:tranche:${tranche.toLowerCase()}:pending_wallets`;
  }

  getTimestampKey(tranche: string, wallet: string, chainId = this.chainId) {
    return `${this.app}:${chainId}:${this.version}:${
      this.env
    }:tranche:${tranche.toLowerCase()}:timestamp:${wallet.toLowerCase()}`;
  }

  getCronCheckpointKey(chainId = this.chainId) {
    return `${this.app}:${chainId}:${this.version}:${this.env}:checkPoints`;
  }

  getTranchePriceKey(tranche: string, chainId = this.chainId) {
    return `${this.app}:${chainId}:${this.version}:${
      this.env
    }:tranche:${tranche.toLowerCase()}:prices`;
  }

  getBlockSyncedKey(chainId = this.chainId) {
    return `${this.app}:${chainId}:${this.version}:${this.env}:last_synced`;
  }

  getCheckpointValueSummaryKey(
    tranche: string,
    wallet: string,
    timestamp: number | string,
    chainId = this.chainId
  ) {
    return `${this.app}:${chainId}:${this.version}:${
      this.env
    }:tranche:${tranche.toLowerCase()}:checkpoint_values:${wallet.toLowerCase()}:${timestamp}`;
  }

  getCheckpointAmountSummaryKey(
    tranche: string,
    wallet: string,
    timestamp: number | string,
    chainId = this.chainId
  ) {
    return `${this.app}:${chainId}:${this.version}:${
      this.env
    }:tranche:${tranche.toLowerCase()}:checkpoint_amounts:${wallet.toLowerCase()}:${timestamp}`;
  }

  generateAggregatedId(item: AggreatedData, chainId = this.chainId) {
    const based = `${item.wallet}_${chainId}_${item.tranche}_${item.from}_${item.to}_${item.valueMovement.fee}_${item.valueMovement.pnl}_${item.valueMovement.price}`;
    return utils.id(based);
  }

  generateCheckpointId(item: CheckpointResponse) {
    return utils.id(item.id);
  }
}
