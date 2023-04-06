import { BigInt } from '@graphprotocol/graph-ts';
import { Deposit, Withdraw, EmergencyWithdraw } from '../../generated/LevelMasterV1/LevelMaster';
import { config } from '../utils/config';
import { trackLp } from '../utils/helper';

export function handleDeposit(ev: Deposit): void {
  if (ev.params.pid.ge(BigInt.fromI32(config.tranches.length))) {
    return;
  }
  const tranche = config.tranches[ev.params.pid.toI32()];
  trackLp(ev.params.to, tranche, ev, ev.params.amount, true);
}

export function handleWithdraw(ev: Withdraw): void {
  if (ev.params.pid.ge(BigInt.fromI32(config.tranches.length))) {
    return;
  }
  const tranche = config.tranches[ev.params.pid.toI32()];
  trackLp(ev.params.user, tranche, ev, ev.params.amount, false);
}

export function handleEmergencyWithdraw(ev: EmergencyWithdraw): void {
  if (ev.params.pid.ge(BigInt.fromI32(config.tranches.length))) {
    return;
  }
  const tranche = config.tranches[ev.params.pid.toI32()];
  trackLp(ev.params.user, tranche, ev, ev.params.amount, false);
}
