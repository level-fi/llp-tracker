import React, { useMemo, useReducer } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { queryLLPAndBTCPrice } from '../../utils/queries';
import { useQuery } from '@tanstack/react-query';
import { NoData } from '../../components/NoData';
import { formatNumber } from '../../utils/numbers';
import { unixTimeToDate } from '../../utils/times';
import Spinner from '../../components/Spinner';
import { ChartSyncData, ChartSyncActive } from '../../models/Chart';

type ChartInfoStat = {
  timestamp: number;
  llpPrice: number;
  btcPrice: number;
};

const currencyFormatter = (value: any) => {
  return formatNumber(value, { currency: 'USD', compact: false, fractionDigits: 0 });
};

const tooltipValueAndAmountFormatter = (value: any, _: any, item: any): string => {
  if (item && item.dataKey === 'amount') {
    return formatNumber(value, { compact: false, fractionDigits: 2 });
  }
  if ((item && item.dataKey === 'value') || (item && item.dataKey === 'totalChange')) {
    return formatNumber(value, { currency: 'USD', fractionDigits: 0 });
  }
  if (item && item.dataKey === 'llpPrice') {
    return formatNumber(value, { currency: 'USD', fractionDigits: 3 });
  }
  return formatNumber(value, { currency: 'USD', fractionDigits: 0 });
};

const tooltipLLPPriceFormatter = (value: any): string => {
  return formatNumber(value, { currency: 'USD', fractionDigits: 2 });
};

const tooltipLabelFormatter = unixTimeToDate('MMMM dd yyyy HH:mm');

const xAxisDateTimeFormatter = unixTimeToDate('dd/MM');

const syncMethod = (chartData: ChartSyncData[], active: ChartSyncActive) => {
  if (!chartData?.length || !active) {
    return;
  }
  for (let i = 0; i < chartData.length; i++) {
    if (active.activeLabel === chartData[i].value) {
      return i;
    }
    if (i && active.activeLabel < chartData[i].value) {
      return i - 1;
    }
  }
};

export const LLPAndBTCPrice: React.FC<{
  lpAddress: string;
  start: Date;
  end: Date;
  userLiquidityInTranche?: bigint;
}> = ({ lpAddress, start, end }) => {
  const llpVsBtc = useQuery(queryLLPAndBTCPrice(lpAddress, start, end));

  const chartData = useMemo(() => {
    if (!llpVsBtc.data) {
      return [];
    }

    const btcPrice = new Map(llpVsBtc.data.priceStats.map((t) => [t.timestamp, t]));
    return llpVsBtc.data.trancheStats?.map((p) => {
      const btcPriceItem = btcPrice.get(p.timestamp);
      return {
        timestamp: +p.timestamp,
        llpPrice: parseFloat(p.llpPrice),
        btcPrice: btcPriceItem ? parseFloat(btcPriceItem.value) / 1e12 : '',
      } as ChartInfoStat;
    });
  }, [llpVsBtc.data]);

  const [disabled, setDisabled] = useReducer((a: Record<string, boolean>, b: string) => {
    return {
      ...a,
      [b]: !a[b],
    };
  }, {});

  return (
    <div className="relative min-h-380px">
      <h4 className="m-0 mb-20px text-16px">LLP Price</h4>
      <div className="">
        {llpVsBtc.isLoading ? (
          <div className="p-y-50px flex justify-center">
            <Spinner className="text-32px" />
          </div>
        ) : (
          <>
            {chartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={chartData}
                  margin={{ right: 2, left: 0, top: 10 }}
                  syncId="trackingChart"
                  syncMethod={syncMethod}
                >
                  <CartesianGrid strokeWidth={1} stroke={'#3C4046'} />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={tooltipLLPPriceFormatter}
                    dataKey="llpPrice"
                    width={37}
                    domain={[(dataMin: number) => dataMin * 0.95, (dataMax: number) => dataMax * 1.05]}
                    stroke={'#adabab'}
                  />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={xAxisDateTimeFormatter}
                    minTickGap={20}
                    stroke={'#adabab'}
                  />
                  <Tooltip
                    formatter={tooltipValueAndAmountFormatter}
                    labelFormatter={tooltipLabelFormatter}
                    contentStyle={{
                      backgroundColor: '#3e3e4d',
                      textAlign: 'left',
                      border: 'none',
                      borderRadius: '5px',
                      boxShadow: '0px 2px 13px rgba(0, 0, 0, 0.3)',
                    }}
                    itemStyle={{
                      paddingTop: 4,
                      fontSize: 12,
                    }}
                    labelStyle={{
                      fontSize: 12,
                      color: '#b9b9b9',
                      paddingBottom: 2,
                    }}
                  />
                  <Legend onClick={(e) => setDisabled(e.dataKey)} />
                  <Line
                    yAxisId="left"
                    type="linear"
                    dot={false}
                    strokeWidth={2}
                    stroke={'#0ECB81'}
                    dataKey="llpPrice"
                    name="LLP Price"
                    hide={disabled.llpPrice}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <NoData absolute>No data.</NoData>
            )}
          </>
        )}
      </div>
    </div>
  );
};
