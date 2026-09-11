'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { StatusItem } from '../types';

interface Props {
  data?: StatusItem[];
}

const SkeletonChart = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-52 mx-auto mb-4" />
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-5 bg-gray-200 rounded flex-1" />
        </div>
      ))}
    </div>
  </div>
);

export function ComparativoEmpresas({ data }: Props) {
  if (!data || data.length === 0) return <SkeletonChart />;

  const chartData = data.map((d) => ({
    name: d.status.length > 30 ? d.status.substring(0, 30) + '...' : d.status,
    Registros: d.qtd,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Comparativo entre Empresas
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
          <Bar dataKey="Registros" fill="#2563eb" barSize={20}>
            <LabelList dataKey="Registros" position="right" style={{ fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
