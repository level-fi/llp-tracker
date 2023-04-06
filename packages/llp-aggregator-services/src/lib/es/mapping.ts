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
  totalChange: {
    type: 'double',
  },
  isCashOut: {
    type: 'boolean',
  },
  relativeChange: {
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
  timestamp: {
    type: 'date',
  },
  isCashOut: {
    type: 'boolean',
  },
  raw: {
    properties: {
      lpAmount: {
        type: 'text',
      },
      lpAmountChange: {
        type: 'text',
      },
      price: {
        type: 'text',
      },
      value: {
        type: 'text',
      },
    },
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
  raw: {
    properties: {
      value: {
        type: 'text',
      },
    },
  },
}
