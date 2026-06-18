import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { cache } from "react";
import { appRouter, createContext } from "@/server/trpc";
import { makeQueryClient } from "./query-client";

export const getQueryClient = cache(makeQueryClient);

const createCaller = cache(async () =>
  appRouter.createCaller(await createContext()),
);

export const { trpc, HydrateClient } = createHydrationHelpers<typeof appRouter>(
  await createCaller(),
  getQueryClient,
);
