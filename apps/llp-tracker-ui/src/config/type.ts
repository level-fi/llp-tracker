export type ChainConfig = {
  chainId: number;
  chainName: string;
  etherscanName: string;
  rpcUrl: string;
  multicall: string;
  explorerUrl: string;
  tranches: TrancheConfig[];
  pool: string;
  minichef: string;
  tokens: {
    [symbol: string]: TokenInfo;
  };
  api: {
    tracker: string;
    live: string;
  }
  graph: {
    analytics: string,
    levelMaster: string
  }
};

export type SnapshotConfig = {
  ens: string;
  url: string;
  graphql: string;
};

export type TokenInfo = {
  symbol?: string;
  address: string;
  name?: string;
  shortName?: string;
  decimals: number;
  logo?: string;
  threshold?: number;
  priceThreshold?: number;
  fractionDigits?: number;
  priceFractionDigits?: number;
};

export type TokenInfoProps = TokenInfo & {
  symbol: string;
};

export type TrancheConfig = {
  id: number;
  address: string;
  name: string;
  lp: string;
  slug: string;
};
