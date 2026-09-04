'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { EventoDonutItem } from '../types';

interface Props {
  data?: EventoDonutItem[];
}

const COLORS = ['#3b82f6', '#60a5fa', '#f97316', '#22c55e', '#6b7280'];

export function EventosDonut({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        No. de Registros por Evento
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="qtd"
            nameKey="evento"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={60}
            label={({ evento, pct }) => `${evento} (${pct}%)`}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}