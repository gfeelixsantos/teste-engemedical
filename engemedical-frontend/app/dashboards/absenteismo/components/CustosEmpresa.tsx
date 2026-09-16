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
import type { PorEmpresaBar } from '../types';

interface Props {
  data?: PorEmpresaBar[];
  isLoading?: boolean;
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-52 mb-4" />
      <div className="space-y-3 h-[300px] flex flex-col justify-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div
              className="h-6 bg-gray-200 rounded"
              style={{ width: `${40 + Math.random() * 40}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustosEmpresa({ data, isLoading }: Props) {
  if (isLoading || !data || data.length === 0) {
    return <SkeletonChart />;
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Custo por Empresa
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={formatCurrency} />
          <YAxis type="category" dataKey="empresa" width={150} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Bar dataKey="custoTotal" name="Custo Total" fill="#E8601C" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
