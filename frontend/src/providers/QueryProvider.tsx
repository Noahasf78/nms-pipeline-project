'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Initialize QueryClient inside useState to ensure it is only created once per session
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false, // Prevents aggressive refetching when switching tabs
            retry: 1, // Number of retry attempts on network failure
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Devtools helper for debugging cache states during development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}