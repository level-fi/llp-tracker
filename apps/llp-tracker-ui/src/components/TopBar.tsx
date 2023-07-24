import * as React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/icons/ic-logo.svg';
import { ReactComponent as IconExternalLink } from '../assets/icons/ic-view-address.svg';
import { SearchAddress } from './SearchAddress';

const TopBar: React.FC = () => {
  return (
    <header className="w-100% bg-#1C1321">
      <div className="page-content h-64px flex items-center gap-25px">
        <Link to="/" className="inline-block">
          <img src={logo} width={120} height={32} />
        </Link>
        <div className="ml-auto display-none lg-display-block">
          <SearchAddress />
        </div>
        <GotoApp />
      </div>
    </header>
  );
};

export const GotoApp = () => {
  return (
    <a
      className="color-#FF45CA hover:color-#c41692 text-16px font-bold whitespace-nowrap flex items-center ml-auto lg-ml-initial"
      href="https://app.level.finance"
      target="_blank"
      rel="noreferrer noopener"
    >
      Go to App
      <IconExternalLink className="color-#ff45ca vertical-bottom ml-4px text-14px w-16px" />
    </a>
  );
};

export default TopBar;
