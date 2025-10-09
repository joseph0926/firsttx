import { StrictMode } from 'react';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { router } from './router';
import './index.css';
import { createFirstTxRoot } from '@firsttx/prepaint';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createFirstTxRoot(
  document.getElementById('root')!,
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" expand={false} richColors closeButton />
    </QueryClientProvider>
  </StrictMode>,
  {
    transition: true,
  },
);
