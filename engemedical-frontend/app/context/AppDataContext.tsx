"use client";

import React, { createContext, useContext, useState } from "react";

import { Scheduling } from "@/lib/scheduling/interface/scheduling";

export interface AppData {
  atendimentos: Scheduling[];
}

interface AppDataContextType {
  data: AppData | null;
  setData: (data: AppData) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{
  children: React.ReactNode;
  initialData: AppData | null;
}> = ({ children, initialData }) => {
  const [data, setData] = useState<AppData | null>(initialData);

  return (
    <AppDataContext.Provider value={{ data, setData }}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);

  if (!context)
    throw new Error("useAppData must be used within an AppDataProvider");

  return context;
};
