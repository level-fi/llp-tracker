import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Oracle, PricePosted } from '../../generated/Oracle/Oracle';
import { Price } from '../../generated/schema';
import { PRICE_FEED_PRECISION } from '../utils/constant';
import { getDayId, _storePriceByType } from '../utils/helper';

export function handlePricePost(ev: PricePosted): void {
  let price = ev.params.price;
  let entity = Price.load(`total-${ev.params.token.toHex()}`);
  if (
    entity &&
    entity.value
      .minus(price)
      .abs()
      .times(PRICE_FEED_PRECISION)
      .div(entity.value)
      .ge(BigInt.fromI32(20000000))
  ) {
    const pool = Oracle.bind(ev.address);
    const callResult = pool.try_getPrice(ev.params.token, true);
    if (callResult.reverted) {
      return;
    }
    price = callResult.value;
  }
  // store total
  _storePriceByType(`total-${ev.params.token.toHex()}`, ev.params.token, price, getDayId(ev.block.timestamp), 'total');

  _storePriceByType(
    `day-${getDayId(ev.block.timestamp)}-${ev.params.token.toHex()}`,
    ev.params.token,
    price,
    getDayId(ev.block.timestamp),
    'daily',
  );
}
