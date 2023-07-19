import {
  DaoFeeSet,
  DecreasePosition,
  IncreasePosition,
  LiquidatePosition,
  LiquidityAdded,
  LiquidityRemoved,
  Pool,
  Swap,
  TokenRiskFactorUpdated,
} from "../generated/Pool/Pool";
import { config } from "../utils/config";
import {
  emptyArray,
  loadOrCreateConfig,
  loadOrCreateRiskFactor,
  loadOrCreateTranche,
  _calcReturnFee,
  _calcTotalFee,
  _getPrice,
  _snapshotLlpPrice,
} from "../utils/helper";
import { BigInt } from "@graphprotocol/graph-ts";
import { ACC_PRECISION, ONE, ZERO } from "../utils/constant";
import { FeePerShare, PnlPerShare } from "../generated/schema";

export function handlePositionIncreased(ev: IncreasePosition): void {
  const feeReturn = _calcReturnFee(ev.params.feeValue);
  const riskFactorConfig = loadOrCreateRiskFactor(ev.params.indexToken);
  const totalRiskFactor = riskFactorConfig.totalRiskFactor;
  const totalRiskFactor_ = totalRiskFactor ? totalRiskFactor : ZERO;
  for (let i = 0; i < config.tranches.length; i++) {
    let tranche = loadOrCreateTranche(config.tranches[i]);
    const riskFactor = riskFactorConfig.riskFactors[i];
    const riskFactor_ = riskFactor ? riskFactor : ZERO;
    if (tranche.llpSupply.equals(ZERO) || totalRiskFactor_.equals(ZERO)) {
      continue;
    }
    tranche.lastFeeIndex++;
    const share = feeReturn.times(riskFactor_).div(totalRiskFactor_);
    const feePerShare = share.times(ACC_PRECISION).div(tranche.llpSupply);
    tranche.feePerShare = tranche.feePerShare.plus(feePerShare);

    const feePerShareEntity = new FeePerShare(
      `fee-${tranche.id}-${ev.transaction.hash.toHex()}-${
        ev.transactionLogIndex
      }`,
    );
    feePerShareEntity.index = tranche.lastFeeIndex;
    feePerShareEntity.tranche = config.tranches[i];
    feePerShareEntity.llpSupply = tranche.llpSupply;
    feePerShareEntity.value = feePerShare;
    feePerShareEntity.timestamp = ev.block.timestamp.toI32();
    feePerShareEntity.tx = ev.transaction.hash;

    tranche.save();
    feePerShareEntity.save();
  }

  _snapshotLlpPrice(ev.block.number, ev.block.timestamp);
}

export function handlePositionDecreased(ev: DecreasePosition): void {
  const feeReturn = _calcReturnFee(ev.params.feeValue);
  const riskFactorConfig = loadOrCreateRiskFactor(ev.params.indexToken);
  const totalRiskFactor = riskFactorConfig.totalRiskFactor;
  const totalRiskFactor_ = totalRiskFactor ? totalRiskFactor : ZERO;
  for (let i = 0; i < config.tranches.length; i++) {
    let tranche = loadOrCreateTranche(config.tranches[i]);
    const riskFactor = riskFactorConfig.riskFactors[i];
    const riskFactor_ = riskFactor ? riskFactor : ZERO;
    if (tranche.llpSupply.equals(ZERO) || totalRiskFactor_.equals(ZERO)) {
      continue;
    }
    tranche.lastFeeIndex++;
    tranche.lastPnlIndex++;
    const share = feeReturn.times(riskFactor_).div(totalRiskFactor_);
    const feePerShare = share.times(ACC_PRECISION).div(tranche.llpSupply);
    // sig 0: loss, 1: profit
    const pnlPerShare = ev.params.pnl
      .times(riskFactor_)
      .times(ACC_PRECISION)
      .div(totalRiskFactor_)
      .div(tranche.llpSupply);
    tranche.feePerShare = tranche.feePerShare.plus(feePerShare);
    tranche.pnlPerShare = tranche.pnlPerShare.plus(pnlPerShare);

    const feePerShareEntity = new FeePerShare(
      `fee-${tranche.id}-${ev.transaction.hash.toHex()}-${
        ev.transactionLogIndex
      }`,
    );
    feePerShareEntity.index = tranche.lastFeeIndex;
    feePerShareEntity.tranche = config.tranches[i];
    feePerShareEntity.llpSupply = tranche.llpSupply;
    feePerShareEntity.value = feePerShare;
    feePerShareEntity.timestamp = ev.block.timestamp.toI32();
    feePerShareEntity.tx = ev.transaction.hash;

    const pnlPerShareEntity = new PnlPerShare(
      `pnl-${tranche.id}-${ev.transaction.hash.toHex()}-${
        ev.transactionLogIndex
      }`,
    );
    pnlPerShareEntity.index = tranche.lastPnlIndex;
    pnlPerShareEntity.tranche = config.tranches[i];
    pnlPerShareEntity.llpSupply = tranche.llpSupply;
    pnlPerShareEntity.value = pnlPerShare;
    pnlPerShareEntity.timestamp = ev.block.timestamp.toI32();
    pnlPerShareEntity.tx = ev.transaction.hash;

    tranche.save();
    feePerShareEntity.save();
    pnlPerShareEntity.save();
  }

  _snapshotLlpPrice(ev.block.number, ev.block.timestamp);
}

export function handlePositionLiquidated(ev: LiquidatePosition): void {
  const feeReturn = _calcReturnFee(ev.params.feeValue);
  const riskFactorConfig = loadOrCreateRiskFactor(ev.params.indexToken);
  const totalRiskFactor = riskFactorConfig.totalRiskFactor;
  const totalRiskFactor_ = totalRiskFactor ? totalRiskFactor : ZERO;
  for (let i = 0; i < config.tranches.length; i++) {
    let tranche = loadOrCreateTranche(config.tranches[i]);
    const riskFactor = riskFactorConfig.riskFactors[i];
    const riskFactor_ = riskFactor ? riskFactor : ZERO;
    if (tranche.llpSupply.equals(ZERO) || totalRiskFactor_.equals(ZERO)) {
      continue;
    }
    tranche.lastPnlIndex++;
    tranche.lastFeeIndex++;
    const share = feeReturn.times(riskFactor_).div(totalRiskFactor_);
    const feePerShare = share.times(ACC_PRECISION).div(tranche.llpSupply);
    // sig 0: loss, 1: profit
    const pnlPerShare = ev.params.pnl
      .times(riskFactor_)
      .times(ACC_PRECISION)
      .div(totalRiskFactor_)
      .div(tranche.llpSupply);
    tranche.feePerShare = tranche.feePerShare.plus(feePerShare);
    tranche.pnlPerShare = tranche.pnlPerShare.plus(pnlPerShare);

    const feePerShareEntity = new FeePerShare(
      `fee-${tranche.id}-${ev.transaction.hash.toHex()}-${
        ev.transactionLogIndex
      }`,
    );
    feePerShareEntity.tranche = config.tranches[i];
    feePerShareEntity.llpSupply = tranche.llpSupply;
    feePerShareEntity.value = feePerShare;
    feePerShareEntity.timestamp = ev.block.timestamp.toI32();
    feePerShareEntity.tx = ev.transaction.hash;
    feePerShareEntity.index = tranche.lastFeeIndex;

    const pnlPerShareEntity = new PnlPerShare(
      `pnl-${tranche.id}-${ev.transaction.hash.toHex()}-${
        ev.transactionLogIndex
      }`,
    );
    pnlPerShareEntity.tranche = config.tranches[i];
    pnlPerShareEntity.llpSupply = tranche.llpSupply;
    pnlPerShareEntity.value = pnlPerShare;
    pnlPerShareEntity.timestamp = ev.block.timestamp.toI32();
    pnlPerShareEntity.tx = ev.transaction.hash;
    pnlPerShareEntity.index = tranche.lastPnlIndex;

    tranche.save();
    feePerShareEntity.save();
    pnlPerShareEntity.save();
  }
  _snapshotLlpPrice(ev.block.number, ev.block.timestamp);
}

export function handleLiquidityAdded(ev: LiquidityAdded): void {
  const tokenPrice = _getPrice(ev.params.token);
  const feeValue = tokenPrice.times(ev.params.fee);
  const share = _calcReturnFee(feeValue);
  let tranche = loadOrCreateTranche(ev.params.tranche);
  if (tranche.llpSupply.equals(ZERO)) {
    return;
  }
  tranche.lastFeeIndex++;
  const feePerShare = share.times(ACC_PRECISION).div(tranche.llpSupply);
  tranche.feePerShare = tranche.feePerShare.plus(feePerShare);

  const feePerShareEntity = new FeePerShare(
    `fee-${tranche.id}-${ev.transaction.hash.toHex()}-${
      ev.transactionLogIndex
    }`,
  );
  feePerShareEntity.index = tranche.lastFeeIndex;
  feePerShareEntity.tranche = ev.params.tranche;
  feePerShareEntity.llpSupply = tranche.llpSupply;
  feePerShareEntity.value = feePerShare;
  feePerShareEntity.timestamp = ev.block.timestamp.toI32();
  feePerShareEntity.tx = ev.transaction.hash;

  tranche.save();
  feePerShareEntity.save();

  _snapshotLlpPrice(ev.block.number, ev.block.timestamp);
}

export function handleLiquidityRemoved(ev: LiquidityRemoved): void {
  const tokenPrice = _getPrice(ev.params.token);
  const feeValue = tokenPrice.times(ev.params.fee);
  const share = _calcReturnFee(feeValue);
  let tranche = loadOrCreateTranche(ev.params.tranche);
  if (tranche.llpSupply.equals(ZERO)) {
    return;
  }
  tranche.lastFeeIndex++;
  const feePerShare = share.times(ACC_PRECISION).div(tranche.llpSupply);
  tranche.feePerShare = tranche.feePerShare.plus(feePerShare);

  const feePerShareEntity = new FeePerShare(
    `fee-${tranche.id}-${ev.transaction.hash.toHex()}-${
      ev.transactionLogIndex
    }`,
  );
  feePerShareEntity.index = tranche.lastFeeIndex;
  feePerShareEntity.tranche = ev.params.tranche;
  feePerShareEntity.llpSupply = tranche.llpSupply;
  feePerShareEntity.value = feePerShare;
  feePerShareEntity.timestamp = ev.block.timestamp.toI32();
  feePerShareEntity.tx = ev.transaction.hash;

  tranche.save();
  feePerShareEntity.save();

  _snapshotLlpPrice(ev.block.number, ev.block.timestamp);
}

export function handleSwap(ev: Swap): void {
  const tokenInPrice = _getPrice(ev.params.tokenIn);
  const feeValue = tokenInPrice.times(ev.params.fee);
  const feeReturn = _calcReturnFee(feeValue);
  const riskFactorConfig = loadOrCreateRiskFactor(ev.params.tokenIn);
  const isStableCoin = config.stableTokens.includes(ev.params.tokenIn);
  const totalRiskFactor = riskFactorConfig.totalRiskFactor;
  const totalRiskFactor_ = isStableCoin
    ? BigInt.fromI32(config.tranches.length)
    : totalRiskFactor
    ? totalRiskFactor
    : ZERO;
  for (let i = 0; i < config.tranches.length; i++) {
    let tranche = loadOrCreateTranche(config.tranches[i]);
    const riskFactor = riskFactorConfig.riskFactors[i];
    const riskFactor_ = isStableCoin ? ONE : riskFactor ? riskFactor : ZERO;
    if (tranche.llpSupply.equals(ZERO) || totalRiskFactor_.equals(ZERO)) {
      continue;
    }
    tranche.lastFeeIndex++;
    const share = feeReturn.times(riskFactor_).div(totalRiskFactor_);
    const feePerShare = share.times(ACC_PRECISION).div(tranche.llpSupply);
    tranche.feePerShare = tranche.feePerShare.plus(feePerShare);

    const feePerShareEntity = new FeePerShare(
      `fee-${tranche.id}-${ev.transaction.hash.toHex()}-${
        ev.transactionLogIndex
      }`,
    );
    feePerShareEntity.index = tranche.lastFeeIndex;
    feePerShareEntity.tranche = config.tranches[i];
    feePerShareEntity.llpSupply = tranche.llpSupply;
    feePerShareEntity.value = feePerShare;
    feePerShareEntity.timestamp = ev.block.timestamp.toI32();
    feePerShareEntity.tx = ev.transaction.hash;

    tranche.save();
    feePerShareEntity.save();
  }

  _snapshotLlpPrice(ev.block.number, ev.block.timestamp);
}

export function handleDaoFeeSet(ev: DaoFeeSet): void {
  const protocol = loadOrCreateConfig();
  protocol.daoFeeRatio = ev.params.value;
  protocol.save();
}

export function handleTokenRiskFactorUpdated(ev: TokenRiskFactorUpdated): void {
  const riskFactor = loadOrCreateRiskFactor(ev.params.token);
  const pool = Pool.bind(config.pool);
  const tranches = config.tranches;
  const totalRiskFactor = pool.try_totalRiskFactor(ev.params.token);
  riskFactor.totalRiskFactor = totalRiskFactor.reverted
    ? ZERO
    : totalRiskFactor.value;
  let riskFactors = emptyArray<BigInt>(tranches.length, ZERO);
  for (let i = 0; i < tranches.length; i++) {
    const tranche = tranches[i];
    const riskFactor = pool.try_riskFactor(ev.params.token, tranche);
    const riskFactor_ = riskFactor.reverted ? ZERO : riskFactor.value;
    riskFactors[i] = riskFactor_;
  }
  riskFactor.riskFactors = riskFactors;
  riskFactor.save();
}
