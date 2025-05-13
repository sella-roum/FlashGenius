"use client";

import type React from "react";
import { useRef, type ReactNode } from "react";
import { type StoreApi } from "zustand";

import { type Store, StoreContext, initializeStore } from "@/lib/store";

export const ZustandProvider = ({ children }: { children: ReactNode }) => {
  const storeRef = useRef<StoreApi<Store>>();
  if (!storeRef.current) {
    storeRef.current = initializeStore({}); // Initialize with potentially empty initial state
  }

  return (
    <StoreContext.Provider value={storeRef.current}>
      {children}
    </StoreContext.Provider>
  );
};
