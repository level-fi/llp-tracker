import { isAddress } from 'ethers';
import { FormEvent, useCallback, useRef, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/icons/ic-logo.svg';
import { ReactComponent as IconWallet } from '../../assets/icons/ic-wallet.svg';
import { GotoApp } from '../../components/TopBar';

const Home: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const onSubmit = useCallback(
    (ev: FormEvent<HTMLFormElement>) => {
      ev.preventDefault();

      const queryElem = ev.currentTarget.elements.namedItem('query') as HTMLInputElement;
      const query = queryElem.value;
      if (!query) {
        queryElem.setCustomValidity('');
        return;
      }

      if (isAddress(query)) {
        navigate(query);
      } else {
        queryElem.setCustomValidity('invalid-address');
      }
    },
    [navigate],
  );

  const onKeyUp = useCallback((ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key !== 'Enter') {
      ev.currentTarget.setCustomValidity('');
    }
  }, []);

  return (
    <div className="relative">
      <div className="absolute top-0 left-0 right-0 pt-30px">
        <div className="container mx-auto flex flex-row-reverse px-20px">
          <GotoApp />
        </div>
      </div>
      <form
        onSubmit={onSubmit}
        className="flex items-center justify-center container mx-auto items-center flex-col h-screen px-30px"
      >
        <img src={logo} alt="Level LLP Tracker" width={320} />
        <div className="max-w-800px w-100% color-inherit mb-32px mt-50px relative">
          <IconWallet className="absolute text-24px left-24px top-16px" />
          <input
            type="search"
            autoComplete="off"
            name="query"
            ref={inputRef}
            className="block rd-10000px text-1rem color-inherit font-bold w-100% focus:outline-none pl-60px pr-20px py-15px b-1 b-solid border-color-#ffffff32 bg-#ffffff19"
            placeholder="0x..."
            onKeyUp={onKeyUp}
          />
        </div>
        <button className="rd-10000px uppercase bg-#FF45CA hover-bg-#c41692 color-white font-bold py-12px px-55px border-none text-16px">
          Search
        </button>
      </form>
    </div>
  );
};

export default Home;
