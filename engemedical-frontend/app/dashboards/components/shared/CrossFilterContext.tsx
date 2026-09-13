'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CrossFilterContextType {
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
  clearFilter: () => void;
}

const CrossFilterContext = createContext<CrossFilterContextType>({
  activeCategory: null,
  setActiveCategory: () => {},
  clearFilter: () => {},
});

export function CrossFilterProvider({ children }: { children: ReactNode }) {
  const [activeCategory, setActiveCategoryState] = useState<string | null>(null);

  const setActiveCategory = (category: string | null) => {
    setActiveCategoryState((prev) => (prev === category ? null : category));
  };

  const clearFilter = () => setActiveCategoryState(null);

  return (
    <CrossFilterContext.Provider value={{ activeCategory, setActiveCategory, clearFilter }}>
      {children}
    </CrossFilterContext.Provider>
  );
}

export function useCrossFilter() {
  return useContext(CrossFilterContext);
}
