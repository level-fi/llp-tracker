import { formatNumber } from "./numbers";

export const currencyFormatter = (value: any) => {
  return formatNumber(value, { currency: 'USD', compact: true, fractionDigits: 0 });
};
