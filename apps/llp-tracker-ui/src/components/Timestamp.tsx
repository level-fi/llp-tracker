import format from 'date-fns/format';
import fromUnixTime from 'date-fns/fromUnixTime';
import React, { memo } from 'react';

export type TimestampProps = {
  value: number;
  formatter?: string;
};

export const Timestamp: React.FC<TimestampProps> = memo(function Timestamp({ value, formatter }) {
  const text = value && formatter ? format(fromUnixTime(value), formatter ? formatter : 'dd/MM/yyyy HH:mm:ss O') : '';
  return <>{text}</>;
});
