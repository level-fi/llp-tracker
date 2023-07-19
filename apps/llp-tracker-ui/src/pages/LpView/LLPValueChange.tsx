import React, { useCallback, useMemo } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Timestamp } from '../../components/Timestamp';
import { formatNumber } from '../../utils/numbers';
import { useQuery } from '@tanstack/react-query';
import { queryLiquidityTracking, queryLiveFrame } from '../../utils/queries';
import { NoData } from '../../components/NoData';
import { unixTimeToDate } from '../../utils/times';
import { currencyFormatter } from '../../utils/helpers';
import { TooltipProps } from 'recharts/types/component/Tooltip';
import Spinner from '../../components/Spinner';
import { ChartSyncActive, ChartSyncData } from '../../models/Chart';
import { ReactComponent as IconDoubleChevronUp } from '../../assets/icons/ic-double-chevron-up.svg';
import { ReactComponent as IconDoubleChevronDown } from '../../assets/icons/ic-double-chevron-down.svg';
import { LiquidityTracking } from '../../models/Liquidity';

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

const LLPValueChange: React.FC<{ chainId: number; account: string; lpAddress: string; start: Date; end: Date }> = ({
  chainId,
  account,
  lpAddress,
  start,
  end,
}) => {
  const liquidityTracking = useQuery(queryLiquidityTracking(chainId, lpAddress, account, start, end));
  const live = useQuery(queryLiveFrame(chainId, lpAddress, account, end));
  const chartData = useMemo(() => {
    if (liquidityTracking.isLoading || liquidityTracking.error || !liquidityTracking.data) {
      return [];
    }
    const data = [...liquidityTracking.data];
    if (live.data?.data) {
      data.push({
        value: live.data.data.value,
        feeReturn: live.data.data.valueMovement.fee,
        pnlReturn: live.data.data.valueMovement.pnl,
        assetPriceChange: live.data.data.valueMovement.price,
        liquidityChange: live.data.data.valueMovement.valueChange,
        totalChange: live.data.data.totalChange,
        timestamp: live.data.data.to,
      } as LiquidityTracking);
    }
    return data;
  }, [liquidityTracking, live]);

  return (
    <div className="relative min-h-380px">
      <h4 className="m-0 mb-20px text-16px">LLP Value</h4>
      {liquidityTracking.isLoading ? (
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
                  dataKey="value"
                  tickFormatter={currencyFormatter}
                  domain={[(dataMin: number) => dataMin * 0.8, (dataMax: number) => dataMax * 1.2]}
                  width={40}
                  stroke={'#adabab'}
                />
                <XAxis dataKey="timestamp" tickFormatter={xAxisDateTimeFormatter} minTickGap={20} stroke={'#adabab'} />
                <Tooltip content={CustomTooltip} />
                <Legend />
                <Line type="linear" dot={false} strokeWidth={2} stroke={'#FF45CA'} dataKey="value" name="LLP Value" />
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

const CustomTooltip: React.FC<TooltipProps<any, any>> = ({ active, label, payload }) => {
  const renderClass = useCallback((value: number) => {
    if (value > 0) {
      return 'positive increase';
    } else if (value < 0) {
      return 'negative';
    }
    return '';
  }, []);
  return (
    <div className="shadow-lg min-w-280px bg-#3e3e4d p-10px rd-5px color-#adabab text-12px">
      {active && payload && payload[0] && payload[0].payload && (
        <div>
          <div className="flex items-center justify-between mb-5px">
            <div>
              <div className="label mb-5px color-#ababab font-700">Total Value</div>
              <div className="text-10px">
                <Timestamp value={label || 0} formatter="MMMM d yyyy HH:mm" />
              </div>
            </div>
            <div className="text-16px mb-10px color-white font-700">
              <span
                className={`mr-3px ${
                  payload[0].payload?.totalChange == 0
                    ? ''
                    : payload[0].payload?.totalChange > 0
                    ? 'positive'
                    : 'negative'
                }`}
              >
                {formatNumber(payload[0].payload?.value, { currency: 'USD', compact: false, fractionDigits: 0 })}
              </span>
              {payload[0].payload?.totalChange == 0 ? (
                <></>
              ) : payload[0].payload.totalChange > 0 ? (
                <IconDoubleChevronUp />
              ) : (
                <IconDoubleChevronDown />
              )}
            </div>
          </div>

          <div className="bg-#343442 rd-5px px-10px pt-0 pb-10px ">
            <div className="flex justify-between py-9px change b-0 b-b-1px border-dashed b-#4E5260">
              Total Changes
              <span className={`font-500 ${renderClass(payload[0].payload.totalChange)}`}>
                {formatNumber(payload[0].payload.totalChange, { currency: 'USD', compact: false, fractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between py-5px pt-8px">
              Add or Remove
              <span className={`font-500 ${renderClass(payload[0].payload.liquidityChange)}`}>
                {formatNumber(payload[0].payload.liquidityChange, {
                  currency: 'USD',
                  compact: false,
                  fractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between py-5px">
              Fee Received
              <span className={`font-500 ${renderClass(payload[0].payload.feeReturn)}`}>
                {formatNumber(payload[0].payload.feeReturn, { currency: 'USD', compact: false, fractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between py-5px">
              PnL vs Trader
              <span className={`font-500 ${renderClass(payload[0].payload.pnlReturn)}`}>
                {formatNumber(payload[0].payload.pnlReturn, { currency: 'USD', compact: false, fractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between py-5px">
              Underlying Assets
              <span className={`font-500 ${renderClass(payload[0].payload.assetPriceChange)}`}>
                {formatNumber(payload[0].payload.assetPriceChange, {
                  currency: 'USD',
                  compact: false,
                  fractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LLPValueChange;
