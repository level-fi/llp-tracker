import * as React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LpView, { loader as lpViewLoader } from './pages/LpView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './pages/Home';
import RootWrapper from './components/RootWrapper';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootWrapper />,
    children: [
      {
        path: '',
        element: <Home />,
      },
      {
        path: ':address',
        element: <LpView />,
        loader: lpViewLoader,
        children: [{
          path: '',
          element: <span />,
        }]
      },
    ],
  },
]);

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router}></RouterProvider>
    </QueryClientProvider>
  );
};

export default App;
