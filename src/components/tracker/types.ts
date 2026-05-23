import type { inferRouterOutputs } from "@trpc/server";

import type { ApplicationStatus } from "@/lib/status";
import type { AppRouter } from "@/server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;

export type DocumentItem = RouterOutput["documents"]["list"][number];
export type WatcherHealth = RouterOutput["watcher"]["health"];

export type ConcoursCase = {
  id: string;
  title: string;
  primary: DocumentItem;
  documents: DocumentItem[];
  totalSeats: number | null;
  radiologySeats: number | null;
  examDate: Date | string | null;
  deadline: Date | string | null;
  center: string | null;
  hasCandidateMatch: boolean;
  hasCandidateCheck: boolean;
  hasReview: boolean;
  hasConflict: boolean;
  isRadiologyRelevant: boolean;
  latestUpdate: DocumentItem;
};

export type DecisionDraft = {
  applicationStatus: ApplicationStatus;
  adminNotes: string;
};
