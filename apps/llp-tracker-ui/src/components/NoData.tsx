import { ReactNode } from 'react';

export const NoData: React.FC<{ children: ReactNode; absolute?: boolean }> = ({ children, absolute }) => (
  <div
    className={`${
      absolute ? 'absolute top-0 bottom-0 left-0 right-0' : 'min-h-80px'
    } flex items-center justify-center color-#b9b9b9`}
  >
    {children}
  </div>
);
