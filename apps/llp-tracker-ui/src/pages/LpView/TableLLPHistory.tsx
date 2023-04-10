import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Timestamp } from '../../components/Timestamp';
import { formatNumber, FormatOption } from '../../utils/numbers';
import { queryTimeFrames } from '../../utils/queries';
import { ReactComponent as IconDoubleArrowRight } from '../../assets/icons/ic-double-arrow-right.svg';
import { ReactComponent as IconDoubleArrowLeft } from '../../assets/icons/ic-double-arrow-left.svg';
import { ReactComponent as IconDoubleChevronUp } from '../../assets/icons/ic-double-chevron-up.svg';
import { ReactComponent as IconDoubleChevronDown } from '../../assets/icons/ic-double-chevron-down.svg';
import { NoData } from '../../components/NoData';
import Spinner from '../../components/Spinner';
import Tooltip from '../../components/Tooltip';
import { DataTableLoader } from './DataTableLoader';
import { LiquidityTrackingModel } from '../../models/Liquidity';
import { percentFormatter } from '../../utils/helpers';
import { format, fromUnixTime } from 'date-fns';

const genPages = (curr: number, total: number, show: number) => {
  let min: number;
  let max: number;

  if (curr <= Math.floor(total - show / 2)) {
    min = Math.max(1, Math.floor(curr - show / 2));
    max = Math.min(min + show - 1, total);
  } else {
    (max = total), (min = Math.max(1, max - show + 1));
  }
  const arr = [];
  for (let i = min; i <= max; i++) {
    arr.push(i);
  }
  return arr;
};

const TableLLPHistory: React.FC<{
  account: string;
  tranche: string;
  start: Date;
  end: Date;
  page: number;
  onChangePage: (p: number) => void;
}> = ({ account, tranche, start, end, page, onChangePage }) => {
  const [quantity, setQuantity] = useState(10);
  const history = useQuery(queryTimeFrames(tranche, account, page, quantity, start, end));

  const pages = useMemo(() => {
    if (!history.data || !history.data.page) {
      return [];
    }

    return genPages(page, history.data.page.total, 10);
  }, [history.data, page]);

  const nextPage = () => {
    onChangePage(history.data ? Math.min(history.data.page.total, page + 1) : 1);
  };

  const prevPage = () => {
    onChangePage(Math.max(page - 1, 1));
  };

  if (history.isLoading && !history.data) {
    return <DataTableLoader rows={quantity} />;
  }

  if (history.error) {
    return <NoData>Error occurred. Please try again.</NoData>;
  }

  if (!history.data || !history.data.page?.totalItems) {
    return <NoData>No records found.</NoData>;
  }

  return (
    <div className="relative">
      {history.isLoading && (
        <div className="absolute t-0 b-0 w-100% h-100% bg-#fff3 flex justify-center">
          <Spinner className="text-32px" />
        </div>
      )}
      <table className="w-100% border-collapse display-none lg-display-table">
        <thead className="color-#ADABAB text-12px">
          <tr>
            <th className="font-400 pt-0 pb-12px px-10px text-left">Time</th>
            <th className="font-400 pt-0 pb-12px px-10px text-right ">Liquidity</th>
            <th className="font-400 pt-0 pb-12px px-10px text-right b-solid b-0 b-r-1 b-transparent">LLP Value</th>
            <th className="font-400 pt-0 pb-12px px-10px text-right">
              <div className="flex items-center justify-end">
                Add or Remove <Tooltip content={'Users add or remove liquidity'} />
              </div>
            </th>
            <th className="font-400 pt-0 pb-12px px-10px text-right">
              <div className="flex items-center justify-end">
                Fee Received <Tooltip content={'Fees received from trading activities'} />
              </div>
            </th>
            <th className="font-400 pt-0 pb-12px px-10px text-right ">
              <div className="flex items-center justify-end">
                PnL vs Trader <Tooltip content={'Profit or Loss against Traders'} />
              </div>
            </th>
            <th className="font-400 pt-0 pb-12px px-10px text-right ">
              <div className="flex items-center justify-end">
                Underlying Assets <Tooltip content={'Changes in valuation of underlying assets'} />
              </div>
            </th>
            <th className="font-400 pt-0 pb-12px px-10px text-right ">Total Changes</th>
            <th className="font-400 pt-0 pb-12px px-10px text-right ">
              <div className="flex items-center justify-end">
                Nominal APR <Tooltip content={'Nominal APR Daily = Fee Received / LLP Value * 100'} />
              </div>
            </th>
            <th className="font-400 pt-0 pb-12px px-10px text-right ">
              <div className="flex items-center justify-end">
                Net APR <Tooltip content={'Net APR Daily = (Fee Received + PnL vs Trader) / LLP Value * 100'} />
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-#29292C">
          {history.data?.data.map((row: LiquidityTrackingModel, i) => (
            <tr key={i} className="b-t-1 b-#36363D text-14px hover:bg-#36363Ddd">
              <td className="b-0 b-t-1px b-solid py-12px px-10px b-#36363D text-14px">
                <Tooltip
                  content={`${
                    row?.from > 0 ? `From ${format(fromUnixTime(row?.from), 'MMM d, yyyy HH:mm O')} to` : 'Start '
                  } ${format(fromUnixTime(row?.to), 'MMM d, yyyy HH:mm O')}`}
                >
                  {row?.isLive ? 'Current' : <Timestamp value={row?.to} formatter={'MMM d, yyyy'} />}
                </Tooltip>
              </td>
              <td className="text-right b-0 b-t-1px b-solid py-12px px-10px b-#36363D text-14px">
                {formatNumber(row.amount, { fractionDigits: 2, keepTrailingZeros: true })}
              </td>
              <td className="text-right b-0 b-t-1px b-solid py-12px px-10px b-#36363D text-14px b-r-1">
                <span className={row?.totalChange == 0 ? '' : row?.totalChange > 0 ? 'positive' : 'negative'}>
                  {formatNumber(row.amount * row.price, {
                    currency: 'USD',
                    fractionDigits: 2,
                    keepTrailingZeros: true,
                  })}
                </span>
                <div className="inline-block w-16px text-right">
                  {row?.totalChange == 0 ? (
                    <></>
                  ) : row.totalChange > 0 ? (
                    <IconDoubleChevronUp />
                  ) : (
                    <IconDoubleChevronDown />
                  )}
                </div>
              </td>
              <td className="text-right b-0 b-t-1px b-solid py-12px px-10px b-#36363D text-14px">
                <CurrencyView value={row.valueMovement.valueChange} />
              </td>
              <td className="text-right b-0 b-t-1px b-solid py-12px px-10px b-#36363D text-14px">
                <CurrencyView value={row.valueMovement.fee} />
              </td>
              <td className="text-right b-0 b-t-1px b-solid py-12px px-10px b-#36363D text-14px">
                <CurrencyView value={row?.valueMovement?.pnl} />
              </td>
              <td className="text-right b-0 b-t-1px b-solid py-12px px-10px b-#36363D text-14px">
                <CurrencyView value={row?.valueMovement?.price} />
              </td>
              <td className={`text-right b-0 b-t-1px b-solid py-12px px-10px b-#36363D text-14px`}>
                <CurrencyView value={row?.totalChange} />
              </td>
              <td className={`text-right b-0 b-t-1px b-solid py-12px px-10px b-#36363D text-14px`}>
                <CurrencyView value={row?.nominalApr} percentage={true} />
              </td>
              <td className={`text-right b-0 b-t-1px b-solid py-12px px-10px b-#36363D text-14px`}>
                <CurrencyView value={row?.netApr} percentage={true} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="display-block lg-display-none">
        {history.data?.data.map((row: LiquidityTrackingModel, i) => {
          return (
            <div className="py-10px px-15px mb-10px bg-#29292C" key={i}>
              <div className="py-5px flex justify-between">
                <div>Time</div>
                <Tooltip
                  content={`${
                    row?.from > 0 ? `From ${format(fromUnixTime(row?.from), 'MMM d, yyyy HH:mm O')} to` : 'Start '
                  } ${format(fromUnixTime(row?.to), 'MMM d, yyyy HH:mm O')}`}
                >
                  {row?.isLive ? 'Current' : <Timestamp value={row?.to} formatter={'MMM d, yyyy'} />}
                </Tooltip>
              </div>
              <div className="py-5px flex justify-between">
                <div>Liquidity</div>
                <div>{formatNumber(row.amount, { fractionDigits: 2, keepTrailingZeros: true })}</div>
              </div>
              <div className="py-5px flex justify-between b-b-1 b-solid b-#36363D b-0">
                <div>LLP Value</div>
                <div>
                  <span className={row?.totalChange == 0 ? '' : row?.totalChange > 0 ? 'positive' : 'negative'}>
                    {formatNumber(row.amount * row.price, {
                      currency: 'USD',
                      fractionDigits: 2,
                      keepTrailingZeros: true,
                    })}
                  </span>
                  <div className="inline-block w-16px text-right">
                    {row?.totalChange == 0 ? (
                      <></>
                    ) : row.totalChange > 0 ? (
                      <IconDoubleChevronUp />
                    ) : (
                      <IconDoubleChevronDown />
                    )}
                  </div>
                </div>
              </div>
              <div className="py-5px flex justify-between">
                <div className="flex items-center">
                  Add or Remove <Tooltip content={'Users add or remove liquidity'} />
                </div>
                <div>
                  <CurrencyView value={row.valueMovement.valueChange} />
                </div>
              </div>
              <div className="py-5px flex justify-between">
                <div className="flex items-center">
                  Fee Received <Tooltip content={'Fees received from trading activities'} />
                </div>
                <div>
                  <CurrencyView value={row?.valueMovement?.fee} />
                </div>
              </div>
              <div className="py-5px flex justify-between">
                <div className="flex items-center">
                  PnL vs Trader <Tooltip content={'Profit or Loss against Traders'} />
                </div>
                <div>
                  <CurrencyView value={row?.valueMovement?.pnl} />
                </div>
              </div>
              <div className="py-5px flex justify-between">
                <div className="flex items-center">
                  Underlying Assets <Tooltip content={'Changes in valuation of underlying assets'} />
                </div>
                <div>
                  <CurrencyView value={row?.valueMovement?.price} />
                </div>
              </div>
              <div className="py-5px flex justify-between">
                <div>Total Changes</div>
                <div>
                  <CurrencyView value={row?.totalChange} />
                </div>
              </div>
              <div className="py-5px flex justify-between">
                <div className="flex items-center">
                  Nominal APR <Tooltip content={'Nominal APR Daily = Fee Received / LLP Value * 100'} />
                </div>
                <div>
                  <CurrencyView value={row?.nominalApr} percentage={true} />
                </div>
              </div>
              <div className="py-5px flex justify-between">
                <div className="flex items-center">
                  Net APR{' '}
                  <Tooltip
                    content={
                      <div>
                        Net APR Daily = (Fee Received + PnL vs Trader) / <br /> LLP Value * 100
                      </div>
                    }
                  />
                </div>
                <div>
                  <CurrencyView value={row?.netApr} percentage={true} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex mt-20px">
        <label className="items-center gap-5px text-14px display-none lg-display-flex">
          <span>Showing</span>
          <select
            value={quantity}
            onChange={(ev) => {
              setQuantity(+ev.currentTarget.value);
              onChangePage(1);
            }}
            className="bg-#29292C p-2px border-none color-inherit outline-none cursor-pointer"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span>of {history.data.page?.totalItems || 0} records</span>
        </label>

        <ul className="list-none m-0 p-0 flex items-center ml-auto text-14px">
          <li className="mr-8px ">
            <button
              type="button"
              disabled={page == 1}
              onClick={prevPage}
              className="btn-pagination b-solid b-1px b-#b9b9b9aa bg-transparent rd-3px"
            >
              <IconDoubleArrowLeft />
            </button>
          </li>
          {pages.map((t) => (
            <li
              className={`cursor-pointer w-1.2em text-center p-5px w-30px hover:color-primary ${
                t == page ? 'color-primary' : 'color-#b9b9b9'
              }`}
              key={t}
              onClick={() => onChangePage(t)}
            >
              {t}
            </li>
          ))}
          <li className="ml-8px">
            <button
              type="button"
              disabled={page >= pages.length}
              onClick={nextPage}
              className="btn-pagination b-solid b-1px b-#b9b9b9aa bg-transparent rd-3px"
            >
              <IconDoubleArrowRight />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

const CurrencyView = ({
  value,
  percentage,
  options,
}: {
  value: number;
  percentage?: boolean;
  options?: Partial<FormatOption>;
}) => {
  return (
    <span className={value == 0 ? '' : value > 0 ? 'positive' : 'negative'}>
      {value == 0 ? '' : value > 0 ? '+' : ''}
      {percentage
        ? `${formatNumber(value, {
            fractionDigits: 2,
            keepTrailingZeros: true,
            thousandGrouping: true,
            ...options,
          })}%`
        : `${formatNumber(value, {
            currency: 'USD',
            fractionDigits: 2,
            keepTrailingZeros: true,
            thousandGrouping: true,
            ...options,
          })}`}
    </span>
  );
};

export default TableLLPHistory;
