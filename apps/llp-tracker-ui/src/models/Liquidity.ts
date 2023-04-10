export type ValueMovementModel = {
  fee: number;
  pnl: number;
  price: number;
  valueChange: number;
};
export type LiquidityTrackingModel = {
  amount: number;
  amountChange: number;
  from: number;
  to: number;
  price: number;
  tranche: string;
  valueMovement: ValueMovementModel;
  totalChange: number;
  wallet: string;
  relativeChange: number;
  nominalApr: number;
  netApr: number;
};
export type LiquidityDataModel = {
  amount: number;
  value: number;
  timestamp: number;
};

export type LiquidityTracking = {
  price: number;
  amount: number;
  value: number;
  feeReturn: number;
  pnlReturn: number;
  assetPriceChange: number;
  liquidityChange: number;
  totalChange: number;
  timestamp: number;
};

export type UserInfoLiquidity = {
  trancheAddress: string;
  amount?: bigint;
  balance?: bigint;
};

export type PagedQueryResult<T> = {
  data: T[];
  page: {
    current: number;
    size: number;
    total: number;
    totalItems: number;
  };
};

export type QueryResult<T> = {
  data: T;
};

export type SyncStatus = {
  block: number;
  timestamp: number;
};

export type FeeAprInfo = {
  nominalApr: number;
  netApr: number;
  timestamp: number;
};
