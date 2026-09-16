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
import type { VigenciaPorUnidadeItem } from '../types';

interface Props {
  data?: VigenciaPorUnidadeItem[];
  title?: string;
}

export default function VigenciaPorUnidade({ data, title }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-md">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{title || 'Vigência por Unidade'}</h3>
        <div className="h-[350px] bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.unidade.length > 30 ? d.unidade.substring(0, 30) + '...' : d.unidade,
    vigentes: d.vigentes,
    aVencer: d.aVencer,
    vencidos: d.vencidos,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-md">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title || 'Vigência por Unidade'}</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" fontSize={11} />
          <YAxis dataKey="name" type="category" width={200} fontSize={10} />
          <Tooltip />
          <Bar dataKey="vigentes" name="Vigentes" fill="#22c55e" stackId="a" />
          <Bar dataKey="aVencer" name="A Vencer" fill="#f59e0b" stackId="a" />
          <Bar dataKey="vencidos" name="Vencidos" fill="#ef4444" stackId="a" radius={[0, 4, 4, 0]} />
          <Legend />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
