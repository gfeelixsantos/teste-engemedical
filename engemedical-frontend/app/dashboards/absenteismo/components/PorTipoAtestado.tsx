'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PorTipoBar } from '../types';

interface Props {
  data?: PorTipoBar[];
  isLoading?: boolean;
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-44 mb-4" />
      <div className="space-y-3 h-[300px] flex flex-col justify-center">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 bg-gray-200 rounded w-28" />
            <div
              className="h-6 bg-gray-200 rounded"
              style={{ width: `${30 + Math.random() * 50}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PorTipoAtestado({ data, isLoading }: Props) {
  if (isLoading || !data || data.length === 0) {
    return <SkeletonChart />;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Por Tipo de Atestado
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="tipo" width={140} />
          <Tooltip />
          <Bar dataKey="atestados" name="Atestados" fill="#D32F2F" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
