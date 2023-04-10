import React, { useCallback, useState } from 'react';
import { LoaderFunction, redirect, useLoaderData, useSearchParams } from 'react-router-dom';
import { config, getTrancheBySlug } from '../../config';
import { LLPAndBTCPrice } from './LLPAndBTCPrice';
import LLPValueChange from './LLPValueChange';
import { useQuery } from '@tanstack/react-query';
import { queryUserLpBalances, QUERY_LLP_PRICE } from '../../utils/queries';
import { sub } from 'date-fns';
import TopBar from '../../components/TopBar';
import { BigNumberValue } from '../../components/BigNumberValue';
import { VALUE_DECIMALS } from '../../utils/constant';
import iconWalletAlt from '../../assets/icons/ic-wallet-alt.png';
import { ReactComponent as IconCalendar } from '../../assets/icons/ic-calendar.svg';
import { ReactComponent as IconExternalLink } from '../../assets/icons/ic-view-address.svg';
import { isAddress } from 'ethers';
import DateRangePicker, { RangeType } from 'rsuite/DateRangePicker';
import { fromUnixTime, getUnixTime } from 'date-fns';
import Spinner from '../../components/Spinner';
import TableLLPHistory from './TableLLPHistory';
import { TrancheConfig } from '../../config/type';
import { SearchAddress } from '../../components/SearchAddress';
import ButtonCopy from '../../components/ButtonCopy';
import SyncStatus from './SyncStatus';
import { useIsMobile } from '../../utils/hooks/useWindowSize';
import FeeAPR from './FeeAPR';

export const loader: LoaderFunction = ({ params, request }) => {
  if (!isAddress(params.address?.toLowerCase() || '')) {
    return redirect('/');
  }

  const url = new URL(request.url);
  const filter = parseParams(url.searchParams);
  const account = params.address?.toLowerCase();

  return {
    account,
    filter,
  };
};

const PredefinedDateRanges: RangeType[] = [
  {
    label: 'Last 3 months',
    value: () => [sub(new Date(), { months: 3 }), new Date()],
  },
  {
    label: 'Last 30 days',
    value: () => [sub(new Date(), { days: 30 }), new Date()],
  },
  {
    label: 'Last 7 days',
    value: () => [sub(new Date(), { days: 7 }), new Date()],
  },
];

const parseParams = (searchParams: URLSearchParams) => {
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const trancheParam = searchParams.get('tranche');

  const start = startParam && !isNaN(+startParam) ? fromUnixTime(+startParam) : sub(new Date(), { months: 1 });
  const end = endParam && !isNaN(+endParam) ? fromUnixTime(+endParam) : new Date();
  const tranche = getTrancheBySlug(trancheParam);

  return { start, end, tranche };
};

const LpView: React.FC = () => {
  const { account, filter } = useLoaderData() as {
    account: string;
    filter: {
      start: Date;
      end: Date;
      tranche: TrancheConfig;
    };
  };
  const [searchParams, setSearchParam] = useSearchParams();
  const [page, setPage] = useState<number>(1);
  const { data: lpPrices, isLoading: isLoadingPrice } = useQuery(QUERY_LLP_PRICE);
  const { data: lpBalances, isLoading: isLoadingBalance } = useQuery(queryUserLpBalances(account));
  const isMobile = useIsMobile();
  const onSetDate = useCallback(
    (ev: [Date, Date] | null) => {
      if (!ev) {
        return;
      }
      searchParams.set('start', getUnixTime(ev[0]).toString());
      searchParams.set('end', getUnixTime(ev[1]).toString());
      setSearchParam(searchParams);
      setPage(1);
    },
    [searchParams, setSearchParam],
  );

  const setTranche = useCallback(
    (tranche: string) => {
      searchParams.set('tranche', tranche);
      setSearchParam(searchParams);
      setPage(1);
    },
    [setSearchParam, searchParams],
  );

  return (
    <>
      <TopBar />
      <div className="container px-15px mx-auto mt-30px display-block lg-display-none">
        <SearchAddress />
      </div>

      <div className="container mx-auto pt-30px pb-30px px-15px">
        <div className="items-center mb-20px lg-mb-30px display-none lg-display-flex">
          <img src={iconWalletAlt} className="inline-block w-20px h-20px lg-w-32px lg-h-32px" />
          <h2 className="m-0 text-16px lg-text-24px font-900 ml-8px lg-ml-16px">{account}</h2>
          <div className="ml-10px mr-5px">
            <ButtonCopy text={account} />
          </div>
          <a
            href={`${config.explorerUrl}/address/${account}`}
            target="_blank"
            rel="noreferrer noopenner"
            className="color-#d9d9d966 hover:color-primary mx-5px px-5px"
          >
            <IconExternalLink />
          </a>
        </div>
        <div className="flex mb-10px lg-mb-10px items-baseline justify-between flex-col lg-flex-row lg-items-center">
          <div className="flex">
            <nav className="gap-20px flex items-center w-fit nav-tab">
              {config.tranches.map((t) => (
                <div
                  key={t.address}
                  className={`tab-item cursor-pointer color-#fff ${t.slug == filter.tranche.slug ? 'tab-active' : ''}`}
                  onClick={() => setTranche(t.slug)}
                >
                  <div className="tab-item-content px-10px lg-px-16px py-10px min-h-70px">
                    <div className="relative">
                      <strong className="pb-8px block text-16px">{t.name}</strong>
                      <div className="text-14px">
                        {isLoadingPrice || isLoadingBalance ? (
                          <Spinner className="text-16px color-#fffd" />
                        ) : lpBalances && lpPrices ? (
                          <BigNumberValue
                            value={lpBalances[t.address] * lpPrices[t.address]}
                            decimals={VALUE_DECIMALS}
                            keepCommas
                            currency="USD"
                          />
                        ) : (
                          <>-</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </nav>
          </div>
          <label className="flex h-42px mt-20px lg-mt-0" htmlFor="date-range">
            <div className="b-none rd-tl-10px flex items-center p-x-15px rd-bl-10px bg-#421E54">
              <IconCalendar />
            </div>
            <div className="b-none rd-tr-10px rd-br-10px bg-#241B29 flex items-center custom-daterange-picker">
              <DateRangePicker
                onChange={onSetDate}
                name="date-range"
                id="date-range"
                defaultValue={[filter.start, filter.end]}
                placement={isMobile ? 'bottomStart' : 'bottomEnd'}
                appearance="subtle"
                ranges={PredefinedDateRanges}
                showOneCalendar={isMobile}
              />
            </div>
          </label>
        </div>
        <SyncStatus lpAddress={filter.tranche.address} />
        <>
          <div className="gap-20px lg-grid grid-cols-[1fr_1fr_1fr] ">
            <div className="rd-10px bg-#36363D py-17px px-20px flex-grow-1 mb-20px">
              <LLPValueChange
                account={account}
                lpAddress={filter.tranche.address}
                start={filter.start}
                end={filter.end}
              />
            </div>
            <div className="rd-10px bg-#36363D py-17px px-20px flex-grow-1 mb-20px">
              <LLPAndBTCPrice lpAddress={filter.tranche.address} start={filter.start} end={filter.end} />
            </div>
            <div className="rd-10px bg-#36363D py-17px px-20px flex-grow-1 mb-20px">
              <FeeAPR account={account} lpAddress={filter.tranche.address} start={filter.start} end={filter.end} />
            </div>
          </div>
          <div className="rd-10px bg-#36363D p-20px">
            <TableLLPHistory
              account={account}
              tranche={filter.tranche.address}
              start={filter.start}
              end={filter.end}
              page={page}
              onChangePage={setPage}
            />
          </div>
        </>
      </div>
    </>
  );
};

export default LpView;
