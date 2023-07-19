import React, { useMemo } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber } from '../../utils/numbers';
import { useQuery } from '@tanstack/react-query';
import { queryFeeAPR, queryLiveFrame } from '../../utils/queries';
import { NoData } from '../../components/NoData';
import { unixTimeToDate } from '../../utils/times';
import { percentFormatter } from '../../utils/helpers';
import Spinner from '../../components/Spinner';
import { ChartSyncActive, ChartSyncData } from '../../models/Chart';
import { FeeAprInfo } from '../../models/Liquidity';

const xAxisDateTimeFormatter = unixTimeToDate('dd/MM');

const syncMethod = (chartData: ChartSyncData[], active: ChartSyncActive) => {
  if (!chartData?.length || !active) {
    return;
  }
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (active.activeLabel >= chartData[i].value) {
      return i;
    }
  }
};

const tooltipPercentFormatter = (value: any, _: any, item: any): string => {
  if ((item && item.dataKey === 'nominalApr') || item.dataKey === 'netApr') {
    return `${formatNumber(value, { compact: true, fractionDigits: 2 })}%`;
  }
  return formatNumber(value, { currency: 'USD', fractionDigits: 0 });
};

const tooltipLabelFormatter = unixTimeToDate('MMMM dd yyyy HH:mm');

const FeeAPR: React.FC<{ chainId: number; account: string; lpAddress: string; start: Date; end: Date }> = ({
  chainId,
  account,
  lpAddress,
  start,
  end,
}) => {
  const feeAprQuery = useQuery(queryFeeAPR(chainId, lpAddress, account, start, end));
  const live = useQuery(queryLiveFrame(chainId, lpAddress, account, end));
  const chartData = useMemo(() => {
    if (feeAprQuery.isLoading || !feeAprQuery.data) {
      return [];
    }
    const data = [...feeAprQuery.data];
    if (live.data?.data) {
      data.push({
        netApr: live.data.data.netApr,
        nominalApr: live.data.data.nominalApr,
        timestamp: live.data.data.to,
      } as FeeAprInfo);
    }
    return data;
  }, [feeAprQuery, live]);
  return (
    <div className="relative min-h-380px">
      <h4 className="m-0 mb-20px text-16px">Daily Return</h4>
      {feeAprQuery.isLoading ? (
        <div className="p-y-50px flex justify-center">
          <Spinner className="text-32px" />
        </div>
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={320}>
            {chartData && chartData?.length ? (
              <LineChart
                data={chartData}
                margin={{ right: 10, left: 0, top: 10 }}
                layout={'horizontal'}
                syncId="trackingChart"
                syncMethod={syncMethod}
              >
                <CartesianGrid strokeWidth={1} stroke={'#3C4046'} />
                <YAxis
                  tickFormatter={percentFormatter}
                  width={40}
                  stroke={'#adabab'}
                  domain={['dataMin - 0.35', 'dataMax + 0.35']}
                />
                <XAxis dataKey="timestamp" tickFormatter={xAxisDateTimeFormatter} minTickGap={20} stroke={'#adabab'} />
                <Tooltip
                  formatter={tooltipPercentFormatter}
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
                <Legend />
                <Line
                  type="linear"
                  dot={false}
                  strokeWidth={2}
                  stroke={'#0091FF'}
                  dataKey="nominalApr"
                  name="Nominal Return"
                />
                <Line type="linear" dot={false} strokeWidth={2} stroke={'#FFD339'} dataKey="netApr" name="Net Return" />
              </LineChart>
            ) : (
              <NoData absolute>No data.</NoData>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
export default FeeAPR;
