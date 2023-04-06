import { AggreatedData } from "../type";
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

  get prefix(): string {
    const prefix = this.configService.get<string>("prefix");
    return `${prefix}_${process.env.NODE_ENV}_llp_performance`;
  }

  get aggregatedDataIndex(): string {
    const name =
      this.configService.get<string>("es.indicies.aggregatedData") ||
      this.prefix + "_aggregated_data";
    return name;
  }

  get checkPointIndex(): string {
    const name =
      this.configService.get<string>("es.indicies.perShares") ||
      this.prefix + "_check_point";
    return name;
  }

  get perSharesIndex(): string {
    const name =
      this.configService.get<string>("es.indicies.checkPoint") ||
      this.prefix + "_pershares";
    return name;
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

  constructor(private readonly configService: ConfigService) {}

  parseBigNumber(value: BigNumberish, decimals: number) {
    if (!value) {
      return;
    }
    return parseFloat(formatUnits(BigNumber.from(value), decimals));
  }

  getCheckpointLastSyncedKey(tranche: string) {
    return `${this.prefix}:crawler:${tranche.toLowerCase()}:checkPoint`;
  }

  getFeePerSharesLastSyncedKey(tranche: string) {
    return `${this.prefix}:crawler:${tranche.toLowerCase()}:fee_per_shares`;
  }

  getPnLPerSharesLastSyncedKey(tranche: string) {
    return `${this.prefix}:crawler:${tranche.toLowerCase()}:pnl_per_shares`;
  }

  getWalletsKey(tranche: string) {
    return `${this.prefix}:tranche:${tranche.toLowerCase()}:wallets`;
  }

  getPendingWalletsKey(tranche: string) {
    return `${this.prefix}:tranche:${tranche.toLowerCase()}:pending_wallets`;
  }

  getTimestampKey(tranche: string, wallet: string) {
    return `${
      this.prefix
    }:tranche:${tranche.toLowerCase()}:timestamp:${wallet.toLowerCase()}`;
  }

  getCronCheckpointKey() {
    return `${this.prefix}:checkPoints`;
  }

  getTranchePriceKey(tranche: string) {
    return `${this.prefix}:tranche:${tranche.toLowerCase()}:prices`;
  }

  generateAggregatedId(item: AggreatedData) {
    const based = `${item.wallet}_${item.tranche}_${item.timestamp}_${item.valueMovement.fee}_${item.valueMovement.pnl}_${item.valueMovement.price}`;
    return utils.id(based);
  }
}
