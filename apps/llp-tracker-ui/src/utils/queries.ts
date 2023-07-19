import { Call } from './multicall';
import { getChainSpecifiedConfig } from '../config';
import {
  FeeAprInfo,
  LiquidityDataModel,
  LiquidityTracking,
  LiquidityTrackingModel,
  PagedQueryResult,
  QueryResult,
  SyncStatus,
} from '../models/Liquidity';
import { endOfDay, getUnixTime, startOfDay } from 'date-fns';
import { gql } from 'graphql-request';
import { getGraphClient, getOrCreateMulticall } from './protocol';
import { TokenLVLSchema } from './type';

export const QUERY_LLP_PRICE = (chainId: number) => ({
  queryKey: ['pool', 'lpPrice', 'chainId', chainId],
  enabled: !!chainId,
  queryFn: async () => {
    const config = getChainSpecifiedConfig(chainId);
    const multicall = getOrCreateMulticall(chainId, config.multicall);
    const calls: Call[] = config.tranches.flatMap((t) => [
      {
        target: config.pool,
        signature: 'getTrancheValue(address, bool) returns (uint256)',
        params: [t.address, true],
      },
      {
        target: config.pool,
        signature: 'getTrancheValue(address, bool) returns (uint256)',
        params: [t.address, false],
      },
      {
        target: t.address,
        signature: 'totalSupply() returns (uint256)',
        params: [],
      },
    ]);

    const res = await multicall(calls);

    return Object.fromEntries(
      config.tranches.map((tranche, i) => {
        const [[maxValue], [minValue], [supply]] = res.slice(3 * i, 3 * (i + 1)) as [[bigint], [bigint], [bigint]];
        return [tranche.address, (maxValue + minValue) / supply / 2n];
      }),
    );
  },
});

export const queryUserLpBalances = (chainId: number, user: string | undefined | null) => ({
  queryKey: ['pool', 'chainId', chainId, 'userInfo', user],
  enabled: !!chainId && !!user,
  queryFn: async () => {
    const config = getChainSpecifiedConfig(chainId);
    const multicall = getOrCreateMulticall(chainId, config?.multicall);
    const calls = config.tranches.flatMap((tranche) => [
      {
        target: config.minichef,
        signature: 'userInfo(uint256,address) returns (uint256 amount, int256 rewardDebt)',
        params: [tranche.id, user],
      },
      {
        target: tranche.address,
        signature: 'balanceOf(address) returns (uint256)',
        params: [user],
      },
    ]);

    const response = (await multicall(calls)) as bigint[][];

    const pairs = Object.fromEntries(
      config.tranches.map((tranche, i) => {
        const [[amount], [balance]] = response.slice(2 * i, 2 * (i + 2));
        return [tranche.address, amount + balance];
      }),
    );

    return pairs;
  },
});

export const createUrl = (base: string, params: Record<string, any>) => {
  const url = new URL(base);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v.toString()));
  return url.toString();
};

export const queryUserLiquidity = (chainId: number, lpAddress: string, user: string, start: Date, end: Date) => ({
  queryKey: ['fetch', 'chainId', chainId, 'userLiquidity', lpAddress, user, getUnixTime(start), getUnixTime(end)],
  enabled: !!chainId && !!lpAddress && !!user,
  queryFn: async () => {
    const config = getChainSpecifiedConfig(chainId);
    const params = {
      wallet: user,
      tranche: lpAddress,
      page: 1,
      size: 1000,
      sort: 'asc',
      from: getUnixTime(startOfDay(start)),
      to: getUnixTime(endOfDay(end)),
    };

    const res = await fetch(createUrl(`${config.api.tracker}/charts/liquidity`, params));
    if (!res.ok) {
      throw new Error('API request failed');
    }
    return (await res.json()) as PagedQueryResult<LiquidityDataModel>;
  },
});

export const queryLiquidityTracking = (chainId: number, tranche: string, user: string, start: Date, end: Date) => ({
  queryKey: ['fetch', 'chainId', chainId, 'liquidityTracking', tranche, user, getUnixTime(start), getUnixTime(end)],
  enabled: !!chainId,
  queryFn: async () => {
    const config = getChainSpecifiedConfig(chainId);
    const params = {
      wallet: user,
      tranche,
      page: 1,
      size: 1000,
      from: getUnixTime(startOfDay(start)),
      to: getUnixTime(endOfDay(end)),
      sort: 'asc',
    };
    const url = createUrl(`${config.api.tracker}/charts/tracking`, params);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('API fetch failed');
    }
    const payload = (await response.json()) as PagedQueryResult<{
      valueMovement: {
        fee: number;
        pnl: number;
        price: number;
        valueChange: number;
      };
      totalChange: number;
      timestamp: number;
      value: number;
    }>;
    return payload?.data?.map((t) => {
      return {
        value: t.value,
        feeReturn: t.valueMovement.fee,
        pnlReturn: t.valueMovement.pnl,
        assetPriceChange: t.valueMovement.price,
        liquidityChange: t.valueMovement.valueChange,
        totalChange: t.totalChange,
        timestamp: t.timestamp,
      } as LiquidityTracking;
    });
  },
});

export const queryTimeFrames = (
  chainId: number,
  tranche: string,
  user: string,
  page: number,
  quantity: number,
  start: Date,
  end: Date,
) => ({
  queryKey: [
    'fetch',
    'chainId',
    chainId,
    'timeFrames',
    tranche,
    user,
    page,
    quantity,
    getUnixTime(start),
    getUnixTime(end),
  ],
  enabled: !!chainId && !!page && !!quantity && !!user && !!tranche,
  queryFn: async () => {
    const config = getChainSpecifiedConfig(chainId);
    const params = {
      wallet: user,
      tranche,
      page,
      size: quantity,
      from: getUnixTime(startOfDay(start)),
      to: getUnixTime(endOfDay(end)),
      sort: 'desc',
    };
    const response = await fetch(createUrl(`${config.api.tracker}/time-frames`, params));
    if (!response.ok) {
      throw new Error('API request failed');
    }

    return (await response.json()) as PagedQueryResult<LiquidityTrackingModel>;
  },
});

export const queryLiveFrame = (chainId: number, tranche: string, user: string, end: Date) => {
  const now = new Date();
  const enable =
    end.getFullYear() === now.getFullYear() && end.getMonth() === now.getMonth() && end.getDate() === now.getDate();
  return {
    queryKey: ['fetch', 'chainId', chainId, 'liveFrame', tranche, user, enable],
    enabled: !!chainId && !!user && !!tranche && enable,
    queryFn: async () => {
      const config = getChainSpecifiedConfig(chainId);
      const params = {
        wallet: user,
        tranche,
      };
      const response = await fetch(createUrl(`${config.api.tracker}/time-frames/live`, params));
      if (!response.ok) {
        throw new Error('API request failed');
      }
      return (await response.json()) as QueryResult<LiquidityTrackingModel>;
    },
  };
};

export const querySyncStatus = (chainId: number, lpAddress: string) => ({
  queryKey: ['fetch', 'chainId', chainId, 'status', lpAddress],
  enabled: !!chainId && !!lpAddress,
  queryFn: async () => {
    const params = {
      tranche: lpAddress,
    };
    const config = getChainSpecifiedConfig(chainId);
    const res = await fetch(createUrl(`${config.api.tracker}/status`, params));
    if (!res.ok) {
      throw new Error('API request failed');
    }
    return (await res.json()) as QueryResult<SyncStatus>;
  },
});

export const queryFeeAPR = (chainId: number, tranche: string, user: string, start: Date, end: Date) => ({
  queryKey: ['fetch', 'chainId', chainId, 'feeAPR', tranche, user, getUnixTime(start), getUnixTime(end)],
  enabled: !!chainId,
  queryFn: async () => {
    const params = {
      wallet: user,
      tranche,
      page: 1,
      size: 1000,
      from: getUnixTime(startOfDay(start)),
      to: getUnixTime(endOfDay(end)),
      sort: 'asc',
    };
    const config = getChainSpecifiedConfig(chainId);
    const url = createUrl(`${config.api.tracker}/charts/apr`, params);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('API fetch failed');
    }
    const payload = (await response.json()) as PagedQueryResult<{
      timestamp: number;
      nominalApr: number;
      netApr: number;
    }>;
    return payload.data.map((t) => {
      return {
        nominalApr: t.nominalApr,
        netApr: t.netApr,
        timestamp: t.timestamp,
      } as FeeAprInfo;
    });
  },
});

export const queryLLPAndBTCPrice = (chainId: number, tranche: string, start: Date, end: Date) => ({
  queryKey: ['graph', 'chainId', chainId, 'llpVsBtc', tranche, getUnixTime(start), getUnixTime(end)],
  enabled: !!chainId,
  queryFn: async () => {
    const config = getChainSpecifiedConfig(chainId);
    const btc = config.tokens.BTC;
    const query = gql`
      query priceInfo($lpToken: Bytes!, $token: Bytes!, $start: Int!, $end: Int!) {
        trancheStats(
          where: { tranche: $lpToken, timestamp_gte: $start, timestamp_lte: $end, period: daily }
          orderBy: timestamp
          orderDirection: asc
          subgraphError: allow
        ) {
          timestamp
          llpPrice
          llpSupply
          tranche
        }
        priceStats(
          where: { token: $token, timestamp_gte: $start, timestamp_lte: $end, period: daily }
          orderBy: timestamp
          orderDirection: asc
          subgraphError: allow
          first: 1000
        ) {
          timestamp
          token
          value
        }
      }
    `;
    const { analyticsClient } = getGraphClient(chainId);
    return await analyticsClient.request<{
      trancheStats: {
        timestamp: number;
        llpSupply: string;
        llpPrice: string;
      }[];
      priceStats: {
        timestamp: number;
        token: string;
        value: string;
      }[];
    }>(query, {
      lpToken: tranche.toLowerCase(),
      token: btc.address.toLowerCase(),
      start: getUnixTime(startOfDay(start)),
      end: getUnixTime(endOfDay(end)),
    });
  },
});

export const queryLvlPrices = (chainId: number) => ({
  queryKey: ['fetch', 'lvlPrices'],
  queryFn: async () => {
    const config = getChainSpecifiedConfig(chainId);
    const response = await fetch(`${config.api.live}/lvl-prices`);
    if (!response.ok) {
      throw new Error('API request failed');
    }
    return await response.json();
  },
});

export const queryLvlPrice = (chainId: number) => ({
  queryKey: ['fetch', 'lvlPrice'],
  enabled: !!chainId,
  queryFn: async () => {
    const config = getChainSpecifiedConfig(chainId);
    const response = await fetch(`${config?.api.live}/v2/token/lvl`);
    if (!response.ok) {
      throw new Error('lvl price request failed');
    }
    const parsed = TokenLVLSchema.parse(await response.json());
    return BigInt(parsed.price.price);
  },
});


export const queryLevelMasterRewardHistory = (chainId: number) => ({
  queryKey: ['graph', 'chainId', chainId, 'levelMasterReward'],
  enabled: !!chainId,
  queryFn: async () => {
    const query = gql`
      query rewardPerSecondHistoriesQuery {
        levelMasterRewardHistories(where: { rewardPerSecond_gt: "0" }, orderBy: timestamp, orderDirection: desc) {
          id
          masterChef
          rewardPerSecond
          timestamp
        }
        levelMasterPoolInfoDailies(orderBy: timestamp, orderDirection: desc) {
          id
          masterChef
          timestamp
          totalAllocPoint
          allocPoints
        }
      }
    `;
    const { levelMasterClient } = getGraphClient(chainId);
    const payload = await levelMasterClient.request<{
      levelMasterRewardHistories: {
        id: string;
        masterChef: string;
        rewardPerSecond: bigint;
        timestamp: number;
      }[];
      levelMasterPoolInfoDailies: {
        id: string;
        masterChef: string;
        timestamp: number;
        totalAllocPoint: bigint;
        allocPoints: bigint[];
      }[];
    }>(query);
    return {
      levelMasterPoolInfoDailies: payload.levelMasterPoolInfoDailies.map((t) => {
        return {
          id: t.id,
          masterChef: t.masterChef,
          timestamp: t.timestamp as number,
          totalAllocPoint: BigInt(t.totalAllocPoint),
          allocPoints: t.allocPoints.map((a) => BigInt(a)),
        };
      }),
      levelMasterRewardHistories: payload.levelMasterRewardHistories.map((t) => {
        return {
          id: t.id,
          masterChef: t.masterChef,
          rewardPerSecond: BigInt(t.rewardPerSecond),
          timestamp: t.timestamp as number,
        };
      }),
    };
  },
});
