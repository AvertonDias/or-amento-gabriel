"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DirtyStateContextType {
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
}

const DirtyStateContext = createContext<DirtyStateContextType | undefined>(undefined);

export function DirtyStateProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);

  const value = { isDirty, setIsDirty };

  return (
    <DirtyStateContext.Provider value={value}>
      {children}
    </DirtyStateContext.Provider>
  );
}

export function useDirtyState() {
  const context = useContext(DirtyStateContext);
  if (context === undefined) {
    throw new Error('useDirtyState must be used within a DirtyStateProvider');
  }
  return context;
}
