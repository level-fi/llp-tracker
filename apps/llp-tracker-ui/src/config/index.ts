import { Config as bsc } from './bsc';
import { Config as arbitrum } from './arbitrum';
import { ChainConfig, TokenInfo, TokenInfoProps } from './type';

export const configs = [bsc, arbitrum];
export const defaultChainConfig = configs[0];

export const getChainSpecifiedConfig = (chainId: number) => {
  return configs.filter((t) => t.chainId == chainId)[0];
};

export const getTokenAddress = (chainConfig: ChainConfig, tokenSymbol?: string) => {
  if (!tokenSymbol) {
    return;
  }
  return chainConfig.tokens[tokenSymbol]?.address;
};

export const getTokenConfig = (chainConfig: ChainConfig, tokenSymbol: string) => {
  const tokenConfig = chainConfig.tokens[tokenSymbol] as TokenInfo;

  return { ...(tokenConfig || {}), symbol: tokenSymbol } as TokenInfoProps;
};

export const getTokenByAddress = (chainConfig: ChainConfig, tokenAddress: string) => {
  if (!tokenAddress) {
    return;
  }
  const tokens = chainConfig.tokens;
  const tokenSymbol = Object.keys(tokens)?.find(
    (key) => tokens[key]?.address?.toLowerCase() === tokenAddress.toLowerCase(),
  );
  if (!tokenSymbol) {
    return;
  }
  return getTokenConfig(chainConfig, tokenSymbol);
};

export const getTrancheBySlug = (chainId: number, slug: string | undefined | null) => {
  const chainConfig = getChainSpecifiedConfig(chainId);
  if (slug != null) {
    return chainConfig.tranches.find((t) => t.slug == slug.toLowerCase());
  }
  return chainConfig.tranches[0];
};
