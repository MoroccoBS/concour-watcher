"use client";

import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import superjson from "superjson";

import type { AppRouter } from "@/server/trpc";
import { useAdminStore } from "@/store/admin-store";
import { makeQueryClient } from "./query-client";

export const trpc = createTRPCReact<AppRouter>();

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const adminToken = useAdminStore((state) => state.adminToken);
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          headers() {
            const token = useAdminStore.getState().adminToken;
            return token ? { "x-admin-token": token } : {};
          },
        }),
      ],
    }),
  );

  void adminToken;

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
