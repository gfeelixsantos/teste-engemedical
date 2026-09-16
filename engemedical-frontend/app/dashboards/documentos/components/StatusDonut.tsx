'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { StatusDocumentoItem } from '../types';

interface Props {
  data?: StatusDocumentoItem[];
}

const STATUS_COLORS: Record<string, string> = {
  Ativo: '#22c55e',
  INATIVO: '#ef4444',
  Inativo: '#ef4444',
};

export default function StatusDonut({ data }: Props) {
  if (!data || data.length === 0 || data.every((d) => d.quantidade === 0)) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-md">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Status dos Documentos</h3>
        <div className="h-[250px] bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.quantidade, 0);

  const chartData = data.map((d) => ({
    name: d.status,
    value: d.quantidade,
    color: STATUS_COLORS[d.status] || '#6b7280',
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Status dos Documentos</h3>
        {data.length === 1 && data[0].status === 'Ativo' && (
          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
            Ativo
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            dataKey="value"
            label={({ name, value }) =>
              `${name}: ${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`
            }
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
