import { formatBigNumber } from '../utils/numbers';
import React, { memo, useMemo } from 'react';

export type BigNumberValueProps = {
  value: bigint | undefined;
  decimals: number;
  fractionDigits?: number;
  keepTrailingZeros?: boolean;
  keepCommas?: boolean;
  percentage?: boolean;
  compact?: boolean;
  emptyValue?: string;
  split?: boolean;
  threshold?: number;
  currency?: string;
  flashing?: boolean;
  flashingTime?: number;
};

export const BigNumberValue: React.FC<BigNumberValueProps> = memo(function BigNumberValue({
  value,
  decimals,
  fractionDigits,
  keepTrailingZeros,
  keepCommas,
  percentage,
  compact,
  emptyValue,
  split,
  threshold,
  currency,
}) {
  const text = useMemo(() => {
    return value != null
      ? formatBigNumber(
          value,
          decimals,
          {
            fractionDigits,
            keepTrailingZeros,
            percentage,
            thousandGrouping: keepCommas,
            compact,
            currency,
          },
          threshold,
        )
      : emptyValue || '-';
  }, [
    compact,
    currency,
    decimals,
    emptyValue,
    fractionDigits,
    keepCommas,
    keepTrailingZeros,
    percentage,
    threshold,
    value,
  ]);
  const renderText = useMemo(() => {
    if (!split || !text) {
      return text;
    }
    const reg = /[d+.,]/;
    if (!reg.test(text)) {
      return text;
    }
    if (text.indexOf('.') === -1) {
      return text;
    }
    const pre = text.substring(0, text.indexOf('.'));
    const suf = text.substring(text.indexOf('.'), text.length);
    return (
      <>
        <span className="num_prefix">{pre}</span>
        <span className="num_suffix">{suf}</span>
      </>
    );
  }, [split, text]);

  return <>{renderText}</>;
});
