import { config } from '../utils/config';
import { ADDRESS_ZERO } from '../utils/constant';
import { loadOrCreateTranche, trackLp } from '../utils/helper';
import { Transfer } from '../generated/SLP/LpToken';

export function handleTransfer(ev: Transfer): void {
  const tranche = loadOrCreateTranche(ev.address);
  if (ev.params.from.equals(ADDRESS_ZERO)) {
    tranche.llpSupply = tranche.llpSupply.plus(ev.params.value);
  }
  if (ev.params.to.equals(ADDRESS_ZERO)) {
    tranche.llpSupply = tranche.llpSupply.minus(ev.params.value);
  }
  tranche.save();

  if (!config.excludeTrackLp.includes(ev.params.from)) {
    trackLp(ev.params.from, ev.address, ev, ev.params.value, false);
  }
  if (!config.excludeTrackLp.includes(ev.params.to)) {
    trackLp(ev.params.to, ev.address, ev, ev.params.value, true);
  }
}
