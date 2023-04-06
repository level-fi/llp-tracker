import { useQuery } from '@tanstack/react-query';
import { formatDistance } from 'date-fns';
import { Link } from 'react-router-dom';
import { config } from '../../config';
import { querySyncStatus } from '../../utils/queries';

const SyncStatus: React.FC<{ lpAddress: string }> = ({ lpAddress }) => {
  const { data: syncStatus, isLoading } = useQuery(querySyncStatus(lpAddress));

  if (isLoading || !syncStatus || !syncStatus.data?.timestamp) {
    return <div className="relative flex mb-15px">
      <div className="lg-ml-auto c-#adabab top-10px right-20px">&nbsp;</div>
    </div>
  }

  const distance = formatDistance(syncStatus.data?.timestamp * 1000, new Date(), { addSuffix: true });

  return (
    <div className="relative flex mb-15px">
      <div className="lg-ml-auto c-#adabab top-10px right-20px">
        Updated {distance} at block{' '}
        <Link
          to={`${config.explorerUrl}/block/${syncStatus?.data.block}`}
          className="c-#fff hover-color-#FF45CA active-color-#FF45CA"
          target="_blank"
          rel="noreferrer noopener"
        >
          {syncStatus.data.block}
        </Link>
      </div>
    </div>
  );
};
export default SyncStatus;
