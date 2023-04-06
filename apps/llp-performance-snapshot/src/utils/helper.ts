import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { Oracle } from '../../generated/Oracle/Oracle';
import { PriceFeed } from '../../generated/Oracle/PriceFeed';
import { Pool } from '../../generated/Pool/Pool';
import {
  Config,
  LlpPrice,
  Price,
  RiskFactor,
  Tranche,
  WalletTranche,
  WalletTrancheHistory,
} from '../../generated/schema';
import { config } from './config';
import { FEE_PRECISION, NEGATIVE_ONE, ZERO } from './constant';

export function emptyArray<T>(size: number, v?: T): T[] {
  const ret: T[] = [];
  for (let i = 0; i < size; i++) {
    if (v) {
      ret[i] = v;
    }
  }
  return ret;
}

export function getDayId(timestamp: BigInt): BigInt {
  const dayTimestamp = (timestamp.toI32() / 86400) * 86400;
  return BigInt.fromI32(dayTimestamp);
}

export function loadOrCreateConfig(): Config {
  let entity = Config.load('config');
  if (!entity) {
    entity = new Config('config');
    const pool = Pool.bind(config.pool);
    const fees = pool.try_fee();
    entity.daoFeeRatio = fees.reverted ? ZERO : fees.value.getDaoFee();
    entity.save();
  }
  return entity;
}

export function loadOrCreateWalletTranche(wallet: Address, tranche: Address): WalletTranche {
  let walletTranche = WalletTranche.load(`${wallet.toHex()}-${tranche.toHex()}`);
  if (!walletTranche) {
    walletTranche = new WalletTranche(`${wallet.toHex()}-${tranche.toHex()}`);
    walletTranche.tranche = tranche;
    walletTranche.wallet = wallet;
    walletTranche.llpAmount = ZERO;
  }
  return walletTranche;
}

export function loadOrCreateWalletTrancheHistory(
  wallet: Address,
  tranche: Address,
  block: BigInt,
): WalletTrancheHistory {
  let history = WalletTrancheHistory.load(`${wallet.toHex()}-${tranche.toHex()}-${block}`);
  if (!history) {
    const trancheEntity = loadOrCreateTranche(tranche);
    trancheEntity.lastHistoryIndex++;
    trancheEntity.save();
    history = new WalletTrancheHistory(`${wallet.toHex()}-${tranche.toHex()}-${block}`);
    history.tranche = tranche;
    history.wallet = wallet;
    history.llpAmount = ZERO;
    history.llpAmountChange = ZERO;
    history.index = trancheEntity.lastHistoryIndex;
  }
  return history;
}

export function loadOrCreateRiskFactor(indexToken: Address): RiskFactor {
  let riskFactorConfig = RiskFactor.load(indexToken.toHex());
  const pool = Pool.bind(config.pool);
  const tranches = config.tranches;
  if (!riskFactorConfig) {
    riskFactorConfig = new RiskFactor(indexToken.toHex());
    riskFactorConfig.token = indexToken;
    const totalRiskFactor = pool.try_totalRiskFactor(indexToken);
    riskFactorConfig.totalRiskFactor = totalRiskFactor.reverted ? ZERO : totalRiskFactor.value;
    let riskFactors = emptyArray<BigInt>(tranches.length, ZERO);
    for (let i = 0; i < tranches.length; i++) {
      const tranche = tranches[i];
      const riskFactor = pool.try_riskFactor(indexToken, tranche);
      const riskFactor_ = riskFactor.reverted ? ZERO : riskFactor.value;
      riskFactors[i] = riskFactor_;
    }
    riskFactorConfig.riskFactors = riskFactors;
    riskFactorConfig.save();
  }
  return riskFactorConfig;
}

export function loadOrCreateTranche(tranche: Address): Tranche {
  let entity = Tranche.load(tranche.toHex());
  if (!entity) {
    entity = new Tranche(tranche.toHex());
    entity.lastFeeIndex = -1;
    entity.lastPnlIndex = -1;
    entity.lastHistoryIndex = -1;
    entity.llpSupply = ZERO;
    entity.feePerShare = ZERO;
    entity.pnlPerShare = ZERO;
  }
  return entity;
}

export function loadOrCreatePriceStat(id: string, token: Address, period: string, timestamp: BigInt): Price {
  let entity = Price.load(id);
  if (entity === null) {
    entity = new Price(id);
    entity.value = ZERO;
    entity.token = token;
    entity.period = period;
    entity.timestamp = timestamp.toI32();
  }
  return entity;
}

export function _calcReturnFee(feeValue: BigInt): BigInt {
  const config = loadOrCreateConfig();
  return feeValue.times(FEE_PRECISION.minus(config.daoFeeRatio)).div(FEE_PRECISION);
}

export function _calcTotalFee(daoFeeValue: BigInt): BigInt {
  const config = loadOrCreateConfig();
  return daoFeeValue.times(FEE_PRECISION).div(config.daoFeeRatio);
}

export function _getPrice(token: Address, block: BigInt): BigInt {
  const entity = Price.load(`total-${token.toHex()}`);
  if (!entity) {
    const oracle = Oracle.bind(config.oracle);
    const pricefeed = PriceFeed.bind(config.oracleV1);
    if (block.ge(config.oracle_block_update)) {
      const price = oracle.try_getPrice(token, true);
      return price.reverted ? ZERO : price.value;
    } else {
      const price = pricefeed.try_getPrice(token);
      return price.reverted ? ZERO : price.value;
    }
  }
  return entity.value;
}

export function _calcTrancheValue(tranche: Address, block: BigInt): BigInt | null {
  const poolContract = Pool.bind(config.pool);
  if (block.lt(config.oracle_block_update)) {
    const trancheValueV1 = poolContract.try_getTrancheValue1(tranche);
    return trancheValueV1.reverted ? null : trancheValueV1.value;
  }
  const maxTrancheValue = poolContract.try_getTrancheValue(tranche, true);
  const minTrancheValue = poolContract.try_getTrancheValue(tranche, false);
  if (maxTrancheValue.reverted || minTrancheValue.reverted) {
    return null;
  }
  return maxTrancheValue.value.plus(minTrancheValue.value).div(BigInt.fromI32(2));
}

export function _snapshotLlpPrice(block: BigInt, timestamp: BigInt): void {
  for (let i = 0; i < config.tranches.length; i++) {
    const tranche = config.tranches[i];
    const trancheValue = _calcTrancheValue(tranche, block);
    const trancheEntity = Tranche.load(tranche.toHex());
    if (!trancheEntity || !trancheValue || trancheEntity.llpSupply.equals(ZERO)) {
      continue;
    }
    const llpPrice = trancheValue.div(trancheEntity.llpSupply);
    const llpPriceHistory = new LlpPrice(`${tranche.toHex()}-${block}`);
    llpPriceHistory.tranche = tranche;
    llpPriceHistory.price = llpPrice;
    llpPriceHistory.snapshotAtBlock = block.toI32();
    llpPriceHistory.snapshotAtTimestamp = timestamp.toI32();
    llpPriceHistory.save();

    _storePriceByType(`day-${getDayId(timestamp)}-${tranche.toHex()}`, tranche, llpPrice, getDayId(timestamp), 'daily');
  }
}

export function _storePriceByType(id: string, token: Address, value: BigInt, timestamp: BigInt, period: string): void {
  const entity = loadOrCreatePriceStat(id, token, period, getDayId(timestamp));
  entity.value = value;
  entity.token = token;
  entity.timestamp = timestamp.toI32();
  entity.period = period;
  entity.save();
}

export function trackLp(user: Address, tranche: Address, ev: ethereum.Event, delta: BigInt, isIncrease: bool): void {
  const trancheEntity = loadOrCreateTranche(tranche);
  const walletTranche = loadOrCreateWalletTranche(user, tranche);

  const trancheValue = _calcTrancheValue(tranche, ev.block.number);
  if (!trancheValue || !trancheEntity || trancheEntity.llpSupply.equals(ZERO)) {
    return;
  }

  // save history
  const walletTrancheHistory = loadOrCreateWalletTrancheHistory(user, tranche, ev.block.number);
  if (isIncrease) {
    walletTranche.llpAmount = walletTranche.llpAmount.plus(delta);
    walletTrancheHistory.llpAmountChange = walletTrancheHistory.llpAmountChange.plus(delta);
  } else {
    walletTranche.llpAmount = walletTranche.llpAmount.minus(delta);
    walletTrancheHistory.llpAmountChange = walletTrancheHistory.llpAmountChange.plus(delta.times(NEGATIVE_ONE));
  }
  walletTrancheHistory.llpPrice = trancheValue.div(trancheEntity.llpSupply);
  walletTrancheHistory.llpAmount = walletTranche.llpAmount;
  walletTrancheHistory.trancheValue = trancheValue;
  walletTrancheHistory.wallet = user;
  walletTrancheHistory.tranche = tranche;
  walletTrancheHistory.tx = ev.transaction.hash;
  walletTrancheHistory.snapshotAtBlock = ev.block.number.toI32();
  walletTrancheHistory.snapshotAtTimestamp = ev.block.timestamp.toI32();

  // save
  walletTranche.save();
  walletTrancheHistory.save();
}
