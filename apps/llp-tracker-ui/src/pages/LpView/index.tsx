import React, { useCallback, useState } from 'react';
import { LoaderFunction, redirect, useLoaderData, useSearchParams } from 'react-router-dom';
import { configs, defaultChainConfig, getChainSpecifiedConfig, getTrancheBySlug } from '../../config';
import { LLPAndBTCPrice } from './LLPAndBTCPrice';
import LLPValueChange from './LLPValueChange';
import { useQuery } from '@tanstack/react-query';
import { queryLiveFrame } from '../../utils/queries';
import { sub } from 'date-fns';
import TopBar from '../../components/TopBar';
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
import { formatNumber } from '../../utils/numbers';
import { chainIcons } from '../../config/common';
import c from 'classnames';

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
  const chainIdParam = searchParams.get('chainId');

  const start = startParam && !isNaN(+startParam) ? fromUnixTime(+startParam) : sub(new Date(), { months: 1 });
  const end = endParam && !isNaN(+endParam) ? fromUnixTime(+endParam) : new Date();
  const allChainSupport = configs.map((t) => t.chainId);
  const chainId = chainIdParam && allChainSupport.includes(+chainIdParam) ? +chainIdParam : defaultChainConfig.chainId;
  const tranche = getTrancheBySlug(chainId, trancheParam);
  return { start, end, tranche, chainId };
};

const LpView: React.FC = () => {
  const { account, filter } = useLoaderData() as {
    account: string;
    filter: {
      start: Date;
      end: Date;
      tranche: TrancheConfig;
      chainId: number;
    };
  };
  const [selectedChain, setSelectedChain] = useState(filter.chainId);
  const chainConfig = getChainSpecifiedConfig(selectedChain);
  const [searchParams, setSearchParam] = useSearchParams();
  const [page, setPage] = useState<number>(1);
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

  const allTranches = configs.flatMap((t) =>
    t.tranches.map((c) => {
      return { ...c, chainId: t.chainId };
    }),
  );
  return (
    <>
      <TopBar />
      <div className="w-100% mx-auto px-15px mt-30px display-block lg-display-none">
        <SearchAddress />
      </div>
      <div className="page-content pt-20px lg-pt-30px pb-30px">
        <div className="display-none lg-display-flex items-center mb-20px lg-mb-30px">
          <img src={iconWalletAlt} className="inline-block w-20px h-20px lg-w-32px lg-h-32px" />
          <h2 className="m-0 text-16px lg-text-24px font-900 ml-8px lg-ml-16px">{account}</h2>
          <div className="ml-10px mr-5px">
            <ButtonCopy text={account} />
          </div>
          <a
            href={`${chainConfig.explorerUrl}/address/${account}`}
            target="_blank"
            rel="noreferrer noopenner"
            className="color-#d9d9d966 hover:color-primary mx-5px px-5px"
          >
            <IconExternalLink />
          </a>
        </div>
        <div className="flex mb-10px xl-mb-10px items-baseline justify-between flex-col xl-flex-row xl-items-center">
          <div className="flex w-100% overflow-auto lg-overflow-initial">
            <nav className="gap-16px flex items-center w-fit nav-tab">
              {allTranches.map((t, index) => (
                <div
                  className="relative"
                  key={index}
                  onClick={() => {
                    setTranche(t.slug);
                    searchParams.set('chainId', t.chainId.toString());
                    setSearchParam(searchParams);
                    setSelectedChain(t.chainId);
                  }}
                >
                  <TrancheItem
                    chainId={t.chainId}
                    account={account}
                    active={t.slug == filter.tranche.slug && t.chainId == filter.chainId}
                    {...t}
                  />
                </div>
              ))}
            </nav>
          </div>
          <label className="flex h-42px mt-20px xl-mt-0" htmlFor="date-range">
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
        <SyncStatus chainId={selectedChain} lpAddress={filter.tranche.address} />
        <>
          <div className="gap-20px lg-grid grid-cols-[1fr_1fr_1fr] ">
            <div className="rd-10px bg-#36363D py-17px px-20px flex-grow-1 mb-20px">
              <LLPValueChange
                chainId={selectedChain}
                account={account}
                lpAddress={filter.tranche.address}
                start={filter.start}
                end={filter.end}
              />
            </div>
            <div className="rd-10px bg-#36363D py-17px px-20px flex-grow-1 mb-20px">
              <LLPAndBTCPrice
                chainId={selectedChain}
                trancheId={filter.tranche.id}
                lpAddress={filter.tranche.address}
                start={filter.start}
                end={filter.end}
              />
            </div>
            <div className="rd-10px bg-#36363D py-17px px-20px flex-grow-1 mb-20px">
              <FeeAPR
                chainId={selectedChain}
                account={account}
                lpAddress={filter.tranche.address}
                start={filter.start}
                end={filter.end}
              />
            </div>
          </div>
          <div className="rd-10px bg-#36363D p-20px">
            <TableLLPHistory
              chainId={selectedChain}
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

const TrancheItem: React.FC<
  TrancheConfig & {
    account: string;
    active?: boolean;
    chainId: number;
  }
> = ({ chainId, address, name, active, account }) => {
  const live = useQuery(queryLiveFrame(chainId, address, account, new Date()));
  return (
    <div className={`tab-item cursor-pointer color-#fff ${active ? 'tab-active' : ''}`}>
      <div className="tab-item-content flex items-center px-10px py-7x min-h-54px">
        <div className="flex items-center z-1">
          <img src={chainIcons[chainId]} className="mr-8px w-16px lg-w-20px z-1" />
          <div className="relative flex flex-col justify-center">
            <strong className="pb-2px block text-16px">{name.replace(' Tranche', '')}</strong>
            <div className={`value text-13px ${active ? 'c-#fff' : 'c-#ADABAB'}`}>
              {live.isLoading ? (
                <Spinner className="text-14px color-#fff" />
              ) : live.data?.data?.amount && live.data?.data?.price ? (
                formatNumber(live.data.data.amount * live.data.data.price, {
                  currency: 'USD',
                  fractionDigits: 2,
                  keepTrailingZeros: true,
                })
              ) : (
                '$0'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LpView;
