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

export function ComparativoEmpresas({ data }: Props) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: d.status.length > 30 ? d.status.substring(0, 30) + '...' : d.status,
    Registros: d.qtd,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Comparativo de Registros por Empresas
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={180} />
          <Tooltip />
          <Bar dataKey="Registros" fill="#2563eb">
            <LabelList dataKey="Registros" position="right" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}