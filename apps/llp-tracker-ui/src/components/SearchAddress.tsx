import React, { useCallback, FormEvent, useLayoutEffect, useRef, KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReactComponent as IconSearch } from '../assets/icons/ic-wallet.svg';
import { isAddress } from '../utils/addresses';

export const SearchAddress: React.FC = () => {
  const { address } = useParams();
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();

  useLayoutEffect(() => {
    if (address) {
      (formRef.current?.elements.namedItem('query') as HTMLInputElement).value = address;
    }
  }, [address]);

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
        navigate('/' + query);
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
    <form ref={formRef} onSubmit={onSubmit} className="invalid:border-color-red flex items-center ">
      <div className="flex rd-lt-10px rd-lb-10px b-1 b-solid border-color-#ffffff32 w-32em max-w-550px bg-#ffffff19 color-inherit text-14px items-center">
        <IconSearch className="ml-10px mr-10px color-inherit" />
        <input
          type="search"
          autoComplete="off"
          className="block w-100% h-38px b-none bg-transparent outline-none font-bold color-inherit"
          placeholder="Enter or paste address..."
          name="query"
          onKeyUp={onKeyUp}
        />
      </div>
      <button
        type="submit"
        className="h-40px flex items-center uppercase bg-#FF45CA hover-bg-#c41692 color-white px-12px lg-px-20px font-bold border-none rd-rt-10px rd-rb-10px"
      >
        Search
      </button>
    </form>
  );
};
