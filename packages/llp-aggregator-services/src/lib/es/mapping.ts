import { MappingProperty } from '@elastic/elasticsearch/lib/api/types'

export const aggregatedDataMapping: Record<string, MappingProperty> = {
  wallet: {
    type: 'keyword',
    index: true,
  },
  tranche: {
    type: 'keyword',
    index: true,
  },
  from: {
    type: 'date',
  },
  to: {
    type: 'date',
  },
  amount: {
    type: 'double',
  },
  amountChange: {
    type: 'double',
  },
  price: {
    type: 'double',
  },
  value: {
    type: 'double',
  },
  totalChange: {
    type: 'double',
  },
  relativeChange: {
    type: 'double',
  },
  nominalApr: {
    type: 'double',
  },
  netApr: {
    type: 'double',
  },
  valueMovement: {
    properties: {
      fee: {
        type: 'double',
      },
      pnl: {
        type: 'double',
      },
      price: {
        type: 'double',
      },
      valueChange: {
        type: 'double',
      },
    },
  },
  histories: {
    properties: {
      isCron: {
        type: 'boolean',
      },
      timestamp: {
        type: 'date',
      },
      amount: {
        type: 'double',
      },
      amountChange: {
        type: 'double',
      },
      price: {
        type: 'double',
      },
      value: {
        type: 'double',
      },
      block: {
        type: 'long',
      },
      tx: {
        type: 'keyword',
      },
      isRemove: {
        type: 'boolean',
      },
      totalChange: {
        type: 'double',
      },
      valueMovement: {
        properties: {
          fee: {
            type: 'double',
          },
          pnl: {
            type: 'double',
          },
          price: {
            type: 'double',
          },
          valueChange: {
            type: 'double',
          },
        },
      },
    },
  },
}

export const checkPointMapping: Record<string, MappingProperty> = {
  wallet: {
    type: 'keyword',
    index: true,
  },
  tranche: {
    type: 'keyword',
    index: true,
  },
  lpAmount: {
    type: 'double',
  },
  lpAmountChange: {
    type: 'double',
  },
  value: {
    type: 'double',
  },
  price: {
    type: 'double',
  },
  block: {
    type: 'long',
  },
  timestamp: {
    type: 'date',
  },
  isRemove: {
    type: 'boolean',
  },
  tx: {
    type: 'keyword',
  },
}

export const perSharesMapping: Record<string, MappingProperty> = {
  type: {
    type: 'keyword',
  },
  tranche: {
    type: 'keyword',
    index: true,
  },
  timestamp: {
    type: 'date',
  },
  createdDate: {
    type: 'date',
  },
  value: {
    type: 'double',
  },
}
