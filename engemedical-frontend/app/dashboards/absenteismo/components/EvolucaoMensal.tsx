'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PorMesLinha } from '../types';

interface Props {
  data?: PorMesLinha[];
  isLoading?: boolean;
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-56 mb-4" />
      <div className="flex items-end gap-2 h-[300px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col gap-1 justify-end">
            <div
              className="bg-gray-200 rounded w-full"
              style={{ height: `${30 + Math.random() * 50}%` }}
            />
            <div
              className="bg-gray-100 rounded w-full"
              style={{ height: `${20 + Math.random() * 40}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EvolucaoMensal({ data, isLoading }: Props) {
  if (isLoading || !data || data.length === 0) {
    return <SkeletonChart />;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Evolução Mensal — Dias Perdidos vs Atestados
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="diasPerdidos" name="Dias Perdidos" fill="#E8601C" />
          <Bar dataKey="atestados" name="Atestados" fill="#D32F2F" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
