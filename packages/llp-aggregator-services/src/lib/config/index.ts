export default () => ({
  app: {
    port: +process.env.API_PORT || 3001,
  },
  worker: {
    port: +process.env.WORKER_PORT || 3002,
  },
  endpoint: {
    snapshot: process.env.SNAPSHOT_ENDPOINT,
  },
  cronStartDate: process.env.CRON_START_DATE,
  prefix: process.env.PREFIX,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: +process.env.REDIS_PORT || 6379,
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PWD,
  },
  decimals: {
    amount: process.env.DECIMALS_AMOUNT || 18,
    value: process.env.DECIMALS_VALUE || 30,
    fee: process.env.DECIMALS_FEE || 12,
    pnl: process.env.DECIMALS_PNL || 12,
  },
  es: {
    cloud: process.env.ES_CLOUD,
    apiKey: process.env.ES_APIKEY,
    node: process.env.ES_NODE,
    username: process.env.ES_NAME,
    password: process.env.ES_PWD,
    indicies: {
      aggregatedData: process.env.ES_INDICIES_AGGREGATED_DATA,
      perShares: process.env.ES_INDICIES_PERSHARES,
      checkPoint: process.env.ES_INDICIES_CHECKPOINT,
    },
  },
  crawler: {
    checkPoint: process.env.CRAWLER_CHECKPOINT,
    perShares: process.env.CRAWLER_PER_SHARES,
    maxQuery: +process.env.CRAWLER_MAX_QUERY || 5,
    pageSize: +process.env.CRAWLER_PAGE_SIZE || 1000,
  },
  scheduler: {
    timeFrame: process.env.SCHEDULER_TIMEFRAME,
    timeFrameMaxWalletsLength:
      +process.env.SCHEDULER_TIMEFRAME_MAX_WALLETS_LENGTH,
    checkPoint: process.env.SCHEDULER_CHECKPOINT,
  },
  chainConfig: {
    chainId: process.env.CHAINID,
    tranches: process.env.CHAINCONFIG_TRANCHES,
  },
})
