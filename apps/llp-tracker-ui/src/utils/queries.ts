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
import { getUnixTime } from 'date-fns';
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
  enable: !!user,
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
  enable: !!lpAddress && !!user,
  queryFn: async () => {
    const params = {
      wallet: user,
      tranche: lpAddress,
      page: 1,
      size: 1000,
      sort: 'asc',
      from: getUnixTime(start),
      to: getUnixTime(end),
    };

    const res = await fetch(createUrl(`${config?.llpTrackingApi}/charts/liquidity`, params));
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
      from: getUnixTime(start),
      to: getUnixTime(end),
      sort: 'asc',
    };
    const url = createUrl(`${config?.llpTrackingApi}/charts/tracking`, params);
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
    return payload.data.map((t) => {
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
      from: getUnixTime(start),
      to: getUnixTime(end),
      sort: 'desc',
    };
    const response = await fetch(createUrl(`${config?.llpTrackingApi}/time-frames`, params));
    if (!response.ok) {
      throw new Error('API request failed');
    }

    return (await response.json()) as PagedQueryResult<LiquidityTrackingModel>;
  },
  enable: !!page && !!quantity && !!user && !!tranche,
});

export const querySyncStatus = (lpAddress: string) => ({
  queryKey: ['fetch', 'status', lpAddress],
  enable: !!lpAddress,
  queryFn: async () => {
    const params = {
      tranche: lpAddress,
    };

    const res = await fetch(createUrl(`${config?.llpTrackingApi}/status`, params));
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
      from: getUnixTime(start),
      to: getUnixTime(end),
      sort: 'asc',
    };
    const url = createUrl(`${config?.llpTrackingApi}/charts/apr`, params);
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


const graphQlClient = new GraphQLClient(config.graphAnalytics);

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
      start: getUnixTime(start),
      end: getUnixTime(end),
    });
  },
});
