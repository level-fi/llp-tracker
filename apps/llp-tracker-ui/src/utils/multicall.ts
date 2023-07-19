import { Interface, JsonFragment, Fragment, Contract, JsonRpcApiProvider, FunctionFragment } from 'ethers';

const MulticallAbi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'target',
            type: 'address',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
        ],
        internalType: 'struct Multicall2.Call[]',
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate',
    outputs: [
      {
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256',
      },
      {
        internalType: 'bytes[]',
        name: 'returnData',
        type: 'bytes[]',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'target',
            type: 'address',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
        ],
        internalType: 'struct Multicall2.Call[]',
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'blockAndAggregate',
    outputs: [
      {
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'blockHash',
        type: 'bytes32',
      },
      {
        components: [
          {
            internalType: 'bool',
            name: 'success',
            type: 'bool',
          },
          {
            internalType: 'bytes',
            name: 'returnData',
            type: 'bytes',
          },
        ],
        internalType: 'struct Multicall2.Result[]',
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256',
      },
    ],
    name: 'getBlockHash',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'blockHash',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getBlockNumber',
    outputs: [
      {
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentBlockCoinbase',
    outputs: [
      {
        internalType: 'address',
        name: 'coinbase',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentBlockDifficulty',
    outputs: [
      {
        internalType: 'uint256',
        name: 'difficulty',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentBlockGasLimit',
    outputs: [
      {
        internalType: 'uint256',
        name: 'gaslimit',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentBlockTimestamp',
    outputs: [
      {
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'addr',
        type: 'address',
      },
    ],
    name: 'getEthBalance',
    outputs: [
      {
        internalType: 'uint256',
        name: 'balance',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getLastBlockHash',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'blockHash',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bool',
        name: 'requireSuccess',
        type: 'bool',
      },
      {
        components: [
          {
            internalType: 'address',
            name: 'target',
            type: 'address',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
        ],
        internalType: 'struct Multicall2.Call[]',
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'tryAggregate',
    outputs: [
      {
        components: [
          {
            internalType: 'bool',
            name: 'success',
            type: 'bool',
          },
          {
            internalType: 'bytes',
            name: 'returnData',
            type: 'bytes',
          },
        ],
        internalType: 'struct Multicall2.Result[]',
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bool',
        name: 'requireSuccess',
        type: 'bool',
      },
      {
        components: [
          {
            internalType: 'address',
            name: 'target',
            type: 'address',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
        ],
        internalType: 'struct Multicall2.Call[]',
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'tryBlockAndAggregate',
    outputs: [
      {
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'blockHash',
        type: 'bytes32',
      },
      {
        components: [
          {
            internalType: 'bool',
            name: 'success',
            type: 'bool',
          },
          {
            internalType: 'bytes',
            name: 'returnData',
            type: 'bytes',
          },
        ],
        internalType: 'struct Multicall2.Result[]',
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export type Call = {
  contract?: Contract;
  method?: string;
  target?: string;
  signature?: string;
  abi?: JsonFragment | Fragment;
  params?: any[];
};

const encodeCallData = (call: Call) => {
  const iface = call.contract
    ? call.contract.interface
    : call.abi
    ? new Interface([call.abi])
    : new Interface([`function ${call.signature}`]);
  const method = call.method ?? (iface.fragments[0] as FunctionFragment).name;
  if (!method) {
    throw new Error('Invalid fragment');
  }
  const callData = iface.encodeFunctionData(method, call.params || []);
  return callData;
};

export interface CallResult extends Array<any> {
  [x: string]: any;
}

const decodeReturnData = (call: Call, data: any) => {
  if (data == '0x') {
    return [];
  }
  const iface = call.contract
    ? call.contract.interface
    : call.abi
    ? new Interface([call.abi])
    : new Interface([`function ${call.signature}`]);
  const method = call.method ?? (iface.fragments[0] as FunctionFragment).name;
  if (!method) {
    throw new Error('Invalid fragment');
  }
  try {
    const result = iface.decodeFunctionResult(method, data);
    return result as CallResult;
  } catch (e) {
    console.warn('Can not decode result of call', {
      address: call.target || call.contract?.address,
      method: call.signature || call.method,
    });

    return [];
  }
};

const multicallInterface = new Interface(MulticallAbi);

export const multicall = async (
  provider: JsonRpcApiProvider,
  multicallAddress: string,
  calls: Call[],
  options?: { blockTag: number; requireSuccess?: boolean },
): Promise<CallResult[]> => {
  if (!calls || !calls.length) {
    return [];
  }

  const blockTag = options?.blockTag == null ? 'latest' : '0x' + options.blockTag.toString(16);
  try {
    const callData = calls.map((call) => {
      return [call.target || call.contract?.target, encodeCallData(call)] as [string, string];
    });

    const aggregateData = multicallInterface.encodeFunctionData('tryAggregate', [
      options?.requireSuccess || false,
      callData,
    ]);

    const response = await provider.send('eth_call', [
      {
        to: multicallAddress,
        data: aggregateData,
      },
      blockTag,
    ]);

    const returnData = multicallInterface.decodeFunctionResult('tryAggregate', response).returnData;

    return calls.map((call, index) => {
      const [success, returnDatum] = returnData[index];
      if (!success) {
        console.warn('The call ', call, 'failed and return null data');
        return [];
      } else {
        return decodeReturnData(call, returnDatum);
      }
    });
  } catch (e) {
    console.warn('Multicall error', e);
    throw new Error('Multicall failed');
  }
};

export const createMulticall = (provider: JsonRpcApiProvider, multicallAddress: string) => (call: Call[]) =>
  multicall(provider, multicallAddress, call);

export type Multicall = ReturnType<typeof createMulticall>;
