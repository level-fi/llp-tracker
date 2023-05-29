import { Call, createMulticall } from './multicall';
import { JsonRpcProvider } from 'ethers';
import { config } from '../config';
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
import { gql, GraphQLClient } from 'graphql-request';

const rpcProvider = new JsonRpcProvider(config.rpcUrl);

const multicall = createMulticall(rpcProvider, config.multicall);

export const QUERY_LLP_PRICE = {
  queryKey: ['pool', 'lpPrice'],
  queryFn: async () => {
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
};

export const queryUserLpBalances = (user: string | undefined | null) => ({
  queryKey: ['pool', 'userInfo', user],
  enabled: !!user,
  queryFn: async () => {
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

export const queryUserLiquidity = (lpAddress: string, user: string, start: Date, end: Date) => ({
  queryKey: ['fetch', 'userLiquidity', lpAddress, user, getUnixTime(start), getUnixTime(end)],
  enabled: !!lpAddress && !!user,
  queryFn: async () => {
    const params = {
      wallet: user,
      tranche: lpAddress,
      page: 1,
      size: 1000,
      sort: 'asc',
      from: getUnixTime(startOfDay(start)),
      to: getUnixTime(endOfDay(end)),
    };

    const res = await fetch(createUrl(`${config?.api.tracker}/charts/liquidity`, params));
    if (!res.ok) {
      throw new Error('API request failed');
    }
    return (await res.json()) as PagedQueryResult<LiquidityDataModel>;
  },
});

export const queryLiquidityTracking = (tranche: string, user: string, start: Date, end: Date) => ({
  queryKey: ['fetch', 'liquidityTracking', tranche, user, getUnixTime(start), getUnixTime(end)],
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
    const url = createUrl(`${config?.api.tracker}/charts/tracking`, params);
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
  tranche: string,
  user: string,
  page: number,
  quantity: number,
  start: Date,
  end: Date,
) => ({
  queryKey: ['fetch', 'timeFrames', tranche, user, page, quantity, getUnixTime(start), getUnixTime(end)],
  queryFn: async () => {
    const params = {
      wallet: user,
      tranche,
      page,
      size: quantity,
      from: getUnixTime(startOfDay(start)),
      to: getUnixTime(endOfDay(end)),
      sort: 'desc',
    };
    const response = await fetch(createUrl(`${config?.api.tracker}/time-frames`, params));
    if (!response.ok) {
      throw new Error('API request failed');
    }

    return (await response.json()) as PagedQueryResult<LiquidityTrackingModel>;
  },
  enabled: !!page && !!quantity && !!user && !!tranche,
});

export const queryLiveFrame = (tranche: string, user: string, end: Date) => {
  const now = new Date();
  const enable =
    end.getFullYear() === now.getFullYear() && end.getMonth() === now.getMonth() && end.getDate() === now.getDate();
  return {
    queryKey: ['fetch', 'liveFrame', tranche, user, enable],
    queryFn: async () => {
      const params = {
        wallet: user,
        tranche,
      };
      const response = await fetch(createUrl(`${config?.api.tracker}/time-frames/live`, params));
      if (!response.ok) {
        throw new Error('API request failed');
      }
      return (await response.json()) as QueryResult<LiquidityTrackingModel>;
    },
    enabled: !!user && !!tranche && enable,
  };
};

export const querySyncStatus = (lpAddress: string) => ({
  queryKey: ['fetch', 'status', lpAddress],
  enabled: !!lpAddress,
  queryFn: async () => {
    const params = {
      tranche: lpAddress,
    };

    const res = await fetch(createUrl(`${config?.api.tracker}/status`, params));
    if (!res.ok) {
      throw new Error('API request failed');
    }
    return (await res.json()) as QueryResult<SyncStatus>;
  },
});

export const queryFeeAPR = (tranche: string, user: string, start: Date, end: Date) => ({
  queryKey: ['fetch', 'feeAPR', tranche, user, getUnixTime(start), getUnixTime(end)],
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
    const url = createUrl(`${config?.api.tracker}/charts/apr`, params);
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

const graphQlClient = new GraphQLClient(config.graph.analytics);

export const queryLLPAndBTCPrice = (tranche: string, start: Date, end: Date) => ({
  queryKey: ['graph', 'llpVsBtc', tranche, getUnixTime(start), getUnixTime(end)],
  queryFn: async () => {
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

    return await graphQlClient.request<{
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

export const queryLvlPrices = () => ({
  queryKey: ['fetch', 'lvlPrices'],
  queryFn: async () => {
    const response = await fetch(`${config?.api.live}/lvl-prices`);
    if (!response.ok) {
      throw new Error('API request failed');
    }
    return await response.json();
  },
});

const levelMasterGraphQlClient = new GraphQLClient(config.graph.levelMaster);
export const queryLevelMasterRewardHistory = () => ({
  queryKey: ['graph', 'levelMasterReward'],
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
    const payload = await levelMasterGraphQlClient.request<{
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
