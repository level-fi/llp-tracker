import { Deposited, EmergencyWithdrawn, ETHDeposited, Withdrawn } from '../../generated/Lockdrop/Lockdrop';
import { BigInt, ByteArray, crypto, ethereum, log } from '@graphprotocol/graph-ts';
import { trackLp } from '../utils/helper';
import { config } from '../utils/config';

export function handleDeposit(ev: Deposited): void {
  trackLp(ev.params.to, config.tranches[1], ev, ev.params.lockAmount, true);
}

export function handleETHDeposit(ev: ETHDeposited): void {
  trackLp(ev.params.to, config.tranches[1], ev, ev.params.lockAmount, true);
}

export function handleWithdraw(ev: Withdrawn): void {
  trackLp(ev.params.sender, config.tranches[1], ev, ev.params.amount, false);
}

export function handleEmergencyWithdraw(ev: EmergencyWithdrawn): void {
  let receipt = ev.receipt;
  if (!receipt) return;
  let transferLog = receipt.logs
    .filter(function(l) {
      return l.topics[0].equals(crypto.keccak256(ByteArray.fromUTF8('Transfer(address,address,uint256)')));
    })
    .at(0);
  let params = ethereum.decode('(uint256)', transferLog.data)!.toTuple();
  trackLp(ev.params.sender, config.tranches[1], ev, params[0].toBigInt(), false);
}
