"use client";

import { create } from "zustand";

export type TrackerFilter = "radiology" | "all" | "review";

type FilterState = {
  filter: TrackerFilter;
  setFilter: (filter: TrackerFilter) => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  filter: "radiology",
  setFilter: (filter) => set({ filter }),
}));
