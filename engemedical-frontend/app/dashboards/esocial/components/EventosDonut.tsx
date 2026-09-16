'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { LayoutItem } from '../types';

interface Props {
  data?: LayoutItem[];
}

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0d9488', '#6b7280'];

const LAYOUT_LABELS: Record<string, string> = {
  S2210: 'S2210',
  S2220: 'S2220',
  S2230: 'S2230',
  S2240: 'S2240',
  S2221: 'S2221',
  'Sem evento identificado': 'Sem Evento',
};

const SkeletonChart = () => (
  <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-40 mx-auto mb-4" />
    <div className="flex items-center justify-center">
      <div className="w-48 h-48 bg-gray-200 rounded-full" />
    </div>
  </div>
);

export function EventosDonut({ data }: Props) {
  if (!data || data.length === 0) return <SkeletonChart />;

  const chartData = data.map((d) => ({
    name: LAYOUT_LABELS[d.layout] || d.layout,
    value: d.qtd,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Eventos por Tipo
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={100}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
