import { Outlet } from 'react-router-dom';

export const RootWrapper = () => {
  return (
    <div className="h-screen">
      <Outlet />
    </div>
  );
};

export default RootWrapper;
