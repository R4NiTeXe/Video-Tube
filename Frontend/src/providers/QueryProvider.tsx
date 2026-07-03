"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React, { useState } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // We use useState to ensure a new QueryClient is created for each user session
  // This is a best practice for Next.js App Router to avoid data leaking between users
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // Data remains fresh for 1 minute
            retry: 1, // Only retry failed requests once by default
            refetchOnWindowFocus: false, // Prevents aggressive refetching when switching tabs
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Devtools will only be visible in development mode */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
