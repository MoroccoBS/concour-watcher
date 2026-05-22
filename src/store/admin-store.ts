"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AdminState = {
  adminToken: string;
  setAdminToken: (token: string) => void;
  clearAdminToken: () => void;
};

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      adminToken: "",
      setAdminToken: (adminToken) => set({ adminToken }),
      clearAdminToken: () => set({ adminToken: "" }),
    }),
    { name: "cncr-admin" },
  ),
);
