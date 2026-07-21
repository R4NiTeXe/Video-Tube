"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
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

  const [showDevtools, setShowDevtools] = useState(false);
  const [Devtools, setDevtools] = useState<React.ComponentType<{ initialIsOpen?: boolean }> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      import("@tanstack/react-query-devtools").then((mod) => {
        setDevtools(() => mod.ReactQueryDevtools);
        setShowDevtools(true);
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevtools && Devtools && <Devtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
