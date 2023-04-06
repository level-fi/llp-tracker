import { Config as bsc } from './bsc';
import { TokenInfo, TokenInfoProps } from './type';
export const config = bsc;
export const getTokenAddress = (tokenSymbol?: string) => {
  if (!tokenSymbol) {
    return;
  }
  return config?.tokens[tokenSymbol]?.address;
};

export const getTokenConfig = (tokenSymbol: string) => {
  if (!tokenSymbol) {
    return;
  }
  const tokenConfig = config?.tokens[tokenSymbol] as TokenInfo;

  return { ...(tokenConfig || {}), symbol: tokenSymbol } as TokenInfoProps;
};

export const getTokenByAddress = (tokenAddress: string) => {
  if (!tokenAddress) {
    return;
  }
  const tokens = config?.tokens;
  const tokenSymbol = Object.keys(tokens)?.find(
    (key) => tokens[key]?.address?.toLowerCase() === tokenAddress.toLowerCase(),
  );
  if (!tokenSymbol) {
    return;
  }
  return getTokenConfig(tokenSymbol);
};

export const getTrancheBySlug = (slug: string | undefined | null) => {
  if (slug != null) {
    return config.tranches.find((t) => t.slug == slug.toLowerCase()) || config.tranches[0];
  }
  return config.tranches[0];
};
