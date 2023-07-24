import {
  AggreatedData,
  AggreatedDataHistory,
  Checkpoint,
  PERSHARES_TYPE,
} from "../type";
import { UtilService } from "../util";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import { gql, GraphQLClient } from "graphql-request";
import * as cronParser from "cron-parser";
import { RedisService } from "../queue";
import { TrancheService } from "../tranche";

@Injectable()
export class TimeframeService {
  private readonly logger = new Logger(TimeframeService.name);

  constructor(
    private readonly utilService: UtilService,
    private readonly esService: ElasticsearchService,
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
    private readonly trancheService: TrancheService
  ) {}

  get graphqlEndpoint(): string {
    return this.config.get("endpoint.snapshot");
  }

  get graphqlClient(): GraphQLClient {
    return new GraphQLClient(this.graphqlEndpoint);
  }

  get expression() {
    return this.config.get<string>("scheduler.checkPoint");
  }

  async syncedStats(tranche: string) {
    const checkPointExist = await this.esService.indices.exists({
      index: [
        this.utilService.checkPointIndex,
        this.utilService.perSharesIndex,
      ],
    });
    if (!checkPointExist) {
      return;
    }
    const queries = gql`
      query ($tranche: String!) {
        walletTrancheHistories(
          first: 1
          orderBy: index
          orderDirection: desc
          where: { tranche: $tranche }
        ) {
          index
        }
        feePerShares(
          first: 1
          orderBy: index
          orderDirection: desc
          where: { tranche: $tranche }
        ) {
          index
        }
        pnlPerShares(
          first: 1
          orderBy: index
          orderDirection: desc
          where: { tranche: $tranche }
        ) {
          index
        }
      }
    `;
    const [
      checkPointCounter,
      perShareCounter,
      { walletTrancheHistories, feePerShares, pnlPerShares },
    ] = await Promise.all([
      this.esService.count({
        index: this.utilService.checkPointIndex,
        query: {
          term: {
            tranche: tranche,
          },
        },
      }),
      this.esService.search({
        size: 0,
        track_total_hits: true,
        index: this.utilService.perSharesIndex,
        query: {
          term: {
            tranche: tranche,
          },
        },
        aggregations: {
          byType: {
            terms: {
              field: "type",
            },
          },
        },
      }),
      this.graphqlClient.request<{
        walletTrancheHistories;
        feePerShares;
        pnlPerShares;
      }>(queries, {
        tranche: tranche,
      }),
    ]);
    // es stats
    const numberOfCheckpoint = checkPointCounter.count;
    const numberOfFee: number = perShareCounter.aggregations?.["byType"]?.[
      "buckets"
    ]?.find((c) => c.key == PERSHARES_TYPE.FEE)?.doc_count;
    const numberOfPnL: number = perShareCounter.aggregations?.["byType"]?.[
      "buckets"
    ]?.find((c) => c.key == PERSHARES_TYPE.PNL)?.doc_count;

    // subgraph stats
    const graphNumberOfCheckpoint = walletTrancheHistories?.[0]?.index;
    const graphNumberOfFee = feePerShares?.[0]?.index;
    const graphNumberOfPnl = pnlPerShares?.[0]?.index;

    this.logger.debug(`[syncedStats] ${tranche} check for ready build
    subgraph stats:
        checkPoints:    ${graphNumberOfCheckpoint}
        fee:            ${graphNumberOfFee}
        pnl:            ${graphNumberOfPnl}
    es stats:
        checkPoints:    ${numberOfCheckpoint}
        fee:            ${numberOfFee}
        pnl:            ${numberOfPnL}
`);

    return {
      es: {
        checkPoint: numberOfCheckpoint,
        fee: numberOfFee,
        pnl: numberOfPnL,
      },
      graph: {
        checkPoint: graphNumberOfCheckpoint,
        fee: graphNumberOfFee,
        pnl: graphNumberOfPnl,
      },
    };
  }

  async isReadyForAggreate(tranche: string) {
    const checkPointExist = await this.esService.indices.exists({
      index: [
        this.utilService.checkPointIndex,
        this.utilService.perSharesIndex,
      ],
    });
    if (!checkPointExist) {
      return;
    }
    // FETCH total checkPoint
    const [checkPointCounter, { walletTrancheHistories }] = await Promise.all([
      this.esService.count({
        index: this.utilService.checkPointIndex,
        query: {
          term: {
            tranche: tranche,
          },
        },
      }),
      this.graphqlClient.request<{
        walletTrancheHistories;
      }>(
        gql`
          query ($tranche: String!) {
            walletTrancheHistories(
              first: 1
              orderBy: index
              orderDirection: desc
              where: { tranche: $tranche }
            ) {
              index
              snapshotAtTimestamp
            }
          }
        `,
        {
          tranche: tranche,
        }
      ),
    ]);
    const totalGraphCheckpoint = walletTrancheHistories?.[0]?.index;
    const totalESCheckpoint = checkPointCounter.count;
    if (totalGraphCheckpoint > totalESCheckpoint) {
      return false;
    }
    //
    const lastGraphTimestamp = walletTrancheHistories?.[0]?.snapshotAtTimestamp;
    const [{ feePerShares, pnlPerShares }, perShareCounter] = await Promise.all(
      [
        this.graphqlClient.request<{
          feePerShares;
          pnlPerShares;
        }>(
          gql`
            query ($tranche: String!, $timestamp: Int!) {
              feePerShares(
                first: 1
                orderBy: index
                orderDirection: desc
                where: { tranche: $tranche, timestamp_lte: $timestamp }
              ) {
                index
              }
              pnlPerShares(
                first: 1
                orderBy: index
                orderDirection: desc
                where: { tranche: $tranche, timestamp_lte: $timestamp }
              ) {
                index
              }
            }
          `,
          {
            tranche: tranche,
            timestamp: lastGraphTimestamp,
          }
        ),
        this.esService.search({
          size: 0,
          track_total_hits: true,
          index: this.utilService.perSharesIndex,
          query: {
            bool: {
              must: [
                {
                  term: {
                    tranche: tranche,
                  },
                },
                {
                  range: {
                    timestamp: {
                      lte: lastGraphTimestamp,
                    },
                  },
                },
              ],
            },
          },
          aggregations: {
            byType: {
              terms: {
                field: "type",
              },
            },
          },
        }),
      ]
    );
    const numberOfFee: number = perShareCounter.aggregations?.["byType"]?.[
      "buckets"
    ]?.find((c) => c.key == PERSHARES_TYPE.FEE)?.doc_count;
    const numberOfPnL: number = perShareCounter.aggregations?.["byType"]?.[
      "buckets"
    ]?.find((c) => c.key == PERSHARES_TYPE.PNL)?.doc_count;

    const graphNumberOfFee = feePerShares?.[0]?.index;
    const graphNumberOfPnl = pnlPerShares?.[0]?.index;

    this.logger.debug(`[isReadyForAggreate] ${tranche} check for ready build
    subgraph stats:
        checkPoints:    ${totalGraphCheckpoint}
        fee:            ${graphNumberOfFee}
        pnl:            ${graphNumberOfPnl}
    es stats:
        checkPoints:    ${totalESCheckpoint}
        fee:            ${numberOfFee}
        pnl:            ${numberOfPnL}
`);

    return numberOfFee >= graphNumberOfFee && numberOfPnL >= graphNumberOfPnl;
  }

  generateCronCheckpoints(timeseries: number[]): number[] {
    if (!timeseries.length) {
      return [];
    }
    const startDate = new Date(Math.min(...timeseries) * 1000);
    const endDate = new Date(Math.max(...timeseries) * 1000);
    const interval = cronParser.parseExpression(this.expression, {
      currentDate: startDate,
      endDate: endDate,
      iterator: true,
    });
    const results: number[] = [];
    while (interval.hasNext()) {
      const current = interval.next();
      results.push(Math.floor(current.value.getTime() / 1000));
      if (current.done) {
        break;
      }
    }
    return results;
  }

  getNextCronCheckpoint(timestamp: number): number {
    const startDate = new Date(timestamp * 1000);
    const interval = cronParser.parseExpression(this.expression, {
      currentDate: startDate,
      iterator: true,
    });
    const nextCronDate = interval.next();
    return Math.floor(nextCronDate.value.getTime() / 1000);
  }

  getPrevCronCheckpoint(timestamp: number): number {
    const startDate = new Date(timestamp * 1000);
    const interval = cronParser.parseExpression(this.expression, {
      currentDate: startDate,
      iterator: true,
    });
    const prevCronDate = interval.prev();
    return Math.floor(prevCronDate.value.getTime() / 1000);
  }

  async fetchPerShares(
    tranche: string,
    from: number,
    to: number,
    noUserAction: boolean
  ) {
    if (noUserAction) {
      this.logger.debug(
        `[fetchFeePerShares][REDIS] fetch fee per shares with: tranche ${tranche}, from ${from}, to ${to}`
      );
      const [feePerShare, pnlPerShares] = await Promise.all([
        this.redisService.client.get(
          this.utilService.getTranchePerSharesSummaryKey(
            this.utilService.getFeePerSharesLastSyncedKey(tranche),
            to
          )
        ),
        this.redisService.client.get(
          this.utilService.getTranchePerSharesSummaryKey(
            this.utilService.getPnLPerSharesLastSyncedKey(tranche),
            to
          )
        ),
      ]);
      if (feePerShare && pnlPerShares) {
        return {
          feePerShares: parseFloat(feePerShare),
          pnlPerShares: parseFloat(pnlPerShares),
        };
      }
    }
    this.logger.debug(
      `[fetchFeePerShares][ES] fetch fee per shares with: tranche ${tranche}, from ${from}, to ${to}`
    );
    const existing = await this.esService.indices.exists({
      index: this.utilService.perSharesIndex,
    });
    if (!existing) {
      return;
    }
    const results = await this.esService.search({
      index: this.utilService.perSharesIndex,
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          must: [
            {
              term: {
                tranche: tranche,
              },
            },
            {
              range: {
                timestamp: {
                  gte: from,
                  lt: to,
                },
              },
            },
          ],
        },
      },
      aggs: {
        fee: {
          filter: {
            term: {
              type: PERSHARES_TYPE.FEE,
            },
          },
          aggs: {
            perShares: {
              sum: { field: "value" },
            },
          },
        },
        pnl: {
          filter: {
            term: {
              type: PERSHARES_TYPE.PNL,
            },
          },
          aggs: {
            perShares: {
              sum: { field: "value" },
            },
          },
        },
      },
    });
    return {
      feePerShares:
        results.aggregations?.["fee"]?.["perShares"]?.["value"] || 0,
      pnlPerShares:
        results.aggregations?.["pnl"]?.["perShares"]?.["value"] || 0,
    };
  }

  async getWalletCheckpoints(tranche: string, wallet: string) {
    const userActionPoints = await this.redisService.client.zrangebyscore(
      this.utilService.getTimestampKey(tranche, wallet),
      0,
      "+inf"
    );
    const parsedUserActionPoints = userActionPoints
      .map((c) => parseInt(c))
      .filter((c) => !isNaN(c));

    if (!parsedUserActionPoints.length) {
      return [];
    }

    const stillHasLiquidity = await this.isWalletHasLiquidity(tranche, wallet);

    const cronPoints = await this.redisService.client.zrangebyscore(
      this.utilService.getCronCheckpointKey(),
      Math.min(...parsedUserActionPoints),
      stillHasLiquidity ? "+inf" : Math.max(...parsedUserActionPoints)
    );
    const parsedCronPoints = cronPoints
      .map((c) => parseInt(c))
      .filter((c) => !isNaN(c));

    return [...parsedCronPoints, ...parsedUserActionPoints];
  }

  async isWalletHasLiquidity(tranche: string, wallet: string) {
    const exist = await this.esService.indices.exists({
      index: this.utilService.checkPointIndex,
    });
    if (!exist) {
      return false;
    }
    const last = await this.esService.search<Checkpoint>({
      index: this.utilService.checkPointIndex,
      size: 1,
      query: {
        bool: {
          must: [
            {
              term: {
                tranche: tranche,
              },
            },
            {
              term: {
                wallet: wallet,
              },
            },
          ],
        },
      },
      sort: {
        timestamp: "desc",
      },
    });
    return !!last.hits.hits?.[0]?._source?.lpAmount;
  }

  async fetchLiquidityBasedCheckpoints(
    tranche: string,
    wallet: string,
    timestamps: number[]
  ) {
    const existing = await this.esService.indices.exists({
      index: this.utilService.checkPointIndex,
    });
    if (!existing) {
      return [];
    }
    const checkPoints: Checkpoint[] = [];
    // TODO: mem issue
    const size = 50;
    const total = timestamps.length;
    for (let i = 0; i < total; i += size) {
      const splicedTimestamps = timestamps.slice(i, i + size);
      const items = await this.esService.search<Checkpoint>({
        index: this.utilService.checkPointIndex,
        size: size,
        query: {
          bool: {
            must: [
              {
                term: {
                  tranche: tranche,
                },
              },
              {
                term: {
                  wallet: wallet,
                },
              },
              {
                bool: {
                  should: splicedTimestamps.map((timestamp) => ({
                    term: {
                      timestamp: timestamp,
                    },
                  })),
                },
              },
            ],
          },
        },
      });
      checkPoints.push(...items.hits.hits?.map((c) => c._source));
    }
    return checkPoints;
  }

  async fetchCheckpointsData(
    tranche: string,
    wallet: string,
    timestamps: number[]
  ) {
    // FOR SURE
    timestamps.sort();
    this.logger.debug(
      `[fetchCheckpoints] fetch checkPoint data of tranche ${tranche} with ${wallet}`
    );
    const checkPoints = await this.fetchLiquidityBasedCheckpoints(
      tranche,
      wallet,
      timestamps
    );
    const results: Checkpoint[][] = [];
    // pointer will grow up when wallet remove all liquidity at checkPoint
    let pointer = 0;
    for (const timestamp of timestamps) {
      if (!results[pointer]) {
        results[pointer] = [];
      }

      const checkPoint = checkPoints.find((c) => c.timestamp === timestamp);
      if (checkPoint) {
        results[pointer].push(checkPoint);
        if (!checkPoint.lpAmount) {
          pointer++;
        }
        continue;
      }

      if (!results[pointer].length) {
        continue;
      }

      const lastAction = results[pointer][results[pointer].length - 1];
      const price = await this.trancheService.getLPPrice(tranche, timestamp);
      const amount = lastAction.lpAmount;
      const value = price ? price * amount : 0;
      const cronCheckpoint: Checkpoint = {
        isCron: true,
        lpAmount: amount,
        lpAmountChange: 0,
        price: price,
        timestamp: timestamp,
        tranche: tranche,
        wallet: wallet,
        value: value,
        isRemove: false,
        block: 0,
        tx: undefined,
      };
      results[pointer].push(cronCheckpoint);
    }
    return results;
  }

  aggreateData(
    tranche: string,
    wallet: string,
    histories: AggreatedDataHistory[]
  ): AggreatedData[] {
    if (histories.length <= 1) {
      return [];
    }

    histories.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
    const results: AggreatedData[] = [];
    let data: AggreatedData = undefined;
    let avgValue = 0;
    for (let i = 0; i < histories.length; i++) {
      const item = histories[i];
      if (!i && item.isCron) {
        continue;
      }

      if (!data) {
        data = {
          wallet: wallet,
          tranche: tranche,
          from: item.timestamp,
          to: item.timestamp,
          amount: item.amount,
          amountChange: item.amountChange,
          price: item.price,
          value: item.value,
          totalChange: item.totalChange,
          valueMovement: {
            fee: item.valueMovement.fee,
            pnl: item.valueMovement.pnl,
            price: item.valueMovement.price,
            valueChange: item.valueMovement.valueChange,
          },
          histories: [{ ...JSON.parse(JSON.stringify(item)) }],
        };

        let lastTime: number;
        if (results.length) {
          lastTime = results[results.length - 1].to;
        } else if (histories[i - 1]?.isCron) {
          lastTime = histories[i - 1].timestamp;
        }

        if (lastTime) {
          data.from = lastTime;
          avgValue +=
            (item.timestamp - data.from) *
            (item.value - item.valueMovement.valueChange);
        }
      } else {
        avgValue +=
          (item.timestamp - data.to) *
          (item.value - item.valueMovement.valueChange);
        data.amountChange += item.amountChange;
        data.totalChange += item.totalChange;
        data.valueMovement.fee += item.valueMovement.fee;
        data.valueMovement.pnl += item.valueMovement.pnl;
        data.valueMovement.price += item.valueMovement.price;
        data.valueMovement.valueChange += item.valueMovement.valueChange;
        data.histories.push({ ...JSON.parse(JSON.stringify(item)) });
      }
      if (item.isCron || (results.length && !item.amount)) {
        data.to = item.timestamp;
        data.amount = item.amount;
        data.price = item.price;
        data.value = item.value;
        data.relativeChange = data.value
          ? (data.totalChange * 100) / data.value
          : -100;

        const avgLiq = avgValue / (data.to - data.from);
        data.nomialApr = (data.valueMovement.fee / avgLiq) * 100;
        data.netApr =
          ((data.valueMovement.fee + data.valueMovement.pnl) / avgLiq) * 100;

        results.push({ ...data });
        data = undefined;
        avgValue = 0;
      }
    }
    return results;
  }

  async aggreateDataHistories(
    tranche: string,
    cpStart: Checkpoint,
    cpEnd: Checkpoint
  ): Promise<AggreatedDataHistory> {
    const perShares = cpStart
      ? await this.fetchPerShares(
          tranche,
          cpStart.timestamp,
          cpEnd.timestamp,
          cpStart.isCron && cpEnd.isCron
        )
      : {
          feePerShares: 0,
          pnlPerShares: 0,
        };
    if (!perShares) {
      return;
    }
    // FOR SURE
    const totalChange = cpStart ? cpEnd.value - cpStart.value : cpEnd.value;
    const amount = !cpStart
      ? 0
      : cpEnd.isRemove
      ? cpEnd.lpAmount - cpEnd.lpAmountChange
      : cpEnd.lpAmount + cpEnd.lpAmountChange;
    const fee = amount * perShares.feePerShares;
    const pnl = amount * perShares.pnlPerShares * -1;
    const valueChange = cpStart
      ? cpEnd.lpAmountChange * cpEnd.price
      : cpEnd.value;
    const price = totalChange - fee - pnl - valueChange;

    return {
      isCron: !!cpEnd.isCron,
      isRemove: cpEnd.isRemove,
      amount: cpEnd.lpAmount,
      amountChange: cpEnd.lpAmountChange,
      block: cpEnd.block,
      timestamp: cpEnd.timestamp,
      value: cpEnd.value,
      price: cpEnd.price,
      totalChange: totalChange,
      valueMovement: {
        fee: fee,
        pnl: pnl,
        price: price,
        valueChange: valueChange,
      },
      tx: cpEnd.tx,
    };
  }

  async buildLiveCheckpoint(
    tranche: string,
    wallet: string,
    histories: AggreatedDataHistory[],
  ) {
    const lastHistory = histories[histories.length - 1]
    if (!lastHistory) {
      return
    }
    const cpStart: Checkpoint = {
      isCron: lastHistory.isCron,
      wallet: wallet,
      tranche: tranche,
      lpAmount: lastHistory.amount,
      lpAmountChange: lastHistory.amountChange,
      value: lastHistory.value,
      price: lastHistory.price,
      block: lastHistory.block,
      isRemove: lastHistory.isRemove,
      timestamp: lastHistory.timestamp,
      tx: lastHistory.tx,
    }
    const now = Math.floor(Date.now() / 1000)
    const timestamp = this.getNextCronCheckpoint(now)
    const price = await this.trancheService.getLPPrice(tranche, timestamp)
    const lpChange = await this.aggregateAmountChange(
      wallet,
      tranche,
      cpStart.timestamp,
      timestamp,
    )
    const cpEnd: Checkpoint = {
      isCron: true,
      wallet: wallet,
      tranche: tranche,
      lpAmount: lpChange?.amount || lastHistory.amount,
      lpAmountChange: lpChange?.amountChange || 0,
      value: (lpChange?.amount || lastHistory.amount) * price,
      price: price,
      block: undefined,
      isRemove: false,
      timestamp: timestamp,
      tx: undefined,
    }
    if (!cpStart.lpAmount && !cpEnd.lpAmount) {
      return
    }
    const newHistoryItem = await this.aggreateDataHistories(
      tranche,
      cpStart,
      cpEnd,
    )
    const newHistories = lastHistory.isCron
      ? [lastHistory, newHistoryItem]
      : [...histories, newHistoryItem]
    return this.aggreateData(tranche, wallet, newHistories)[0]
  }

  async aggregateAmountChange(
    wallet: string,
    tranche: string,
    start: number,
    end: number,
  ) {
    const existing = await this.esService.indices.exists({
      index: this.utilService.checkPointIndex,
    })
    if (!existing) {
      return
    }
    const checkpoints = await this.esService.search<Checkpoint>({
      index: this.utilService.checkPointIndex,
      query: {
        bool: {
          must: [
            {
              term: {
                wallet: wallet,
              },
            },
            {
              term: {
                tranche: tranche,
              },
            },
            {
              range: {
                timestamp: {
                  gt: start,
                  lte: end,
                },
              },
            },
          ],
        },
      },
      sort: {
        timestamp: 'desc',
      },
    })
    return {
      amount: checkpoints.hits.hits?.[0]?._source?.lpAmount,
      amountChange: checkpoints.hits.hits?.reduce(
        (total, current) => total + (current?._source?.lpAmountChange || 0),
        0,
      ),
    }
  }
}
