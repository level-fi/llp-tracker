import { useCallback, useRef, useState } from 'react';
import { copyTextToClipboard } from '../utils/clipboard';
import { ReactComponent as IconCopy } from '../assets/icons/ic-copy.svg';

const ButtonCopy: React.FC<{ text: string }> = ({ text }) => {
  const [showPopover, setShowPopover] = useState('');
  const timer = useRef<any>();

  const onClick = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      setShowPopover('');
    }
    try {
      copyTextToClipboard(text);
      setShowPopover('Copied to clipboard');
    } catch {
      setShowPopover('Failed to copy');
    } finally {
      timer.current = setTimeout(() => {
        setShowPopover('');
      }, 3000);
    }
  }, [text]);

  return (
    <div className="relative">
      <button type="button" className="b-none bg-transparent p-5x flex items-center" onClick={onClick}>
        <IconCopy className="color-#d9d9d966 hover:color-primary" />
      </button>
      {showPopover && (
        <div className="popover absolute p-5px text-12px rd-5px min-w-10em border-none bg-#241B29 top-10 0% fade-out">
          {showPopover}
        </div>
      )}
    </div>
  );
};

export default ButtonCopy;
