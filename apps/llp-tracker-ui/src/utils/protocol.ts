import { GraphQLClient } from 'graphql-request';
import { getChainSpecifiedConfig } from '../config';
import { GraphQL } from '../config/type';
import { JsonRpcProvider } from 'ethers';
import { Multicall, createMulticall } from './multicall';

const Instantiated = new Map<string, unknown>();
const RpcProviders = new Map<number, JsonRpcProvider>();
const MulticallInst = new Map<number, Multicall>();

export const getGraphClient = (chainId: number) => {
  const key = `graph:${chainId}`;
  let instance = Instantiated.get(key);
  if (Instantiated.has(key)) {
    return instance as GraphQL;
  }
  const chainConfig = getChainSpecifiedConfig(chainId);
  instance = {
    analyticsClient: new GraphQLClient(`${chainConfig.graph.analytics}`),
    levelMasterClient: new GraphQLClient(`${chainConfig.graph.levelMaster}`),
  };
  Instantiated.set(key, instance);

  return instance as GraphQL;
};

export const getOrCreateRpcProvider = (chainId: number): JsonRpcProvider => {
  let instance = RpcProviders.get(chainId);
  if (instance) {
    return instance;
  }
  const url = getChainSpecifiedConfig(chainId).rpcUrl;
  if (!url) {
    throw new Error(`No RPC URL configured for ${chainId}`);
  }
  instance = new JsonRpcProvider(url);
  RpcProviders.set(chainId, instance);

  return instance;
};

export const getOrCreateMulticall = (chainId: number, multicallAddr: string): Multicall => {
  let instance = MulticallInst.get(chainId);
  if (instance) {
    return instance;
  }
  const provider = getOrCreateRpcProvider(chainId);
  instance = createMulticall(provider, multicallAddr);

  MulticallInst.set(chainId, instance);
  return instance;
};
