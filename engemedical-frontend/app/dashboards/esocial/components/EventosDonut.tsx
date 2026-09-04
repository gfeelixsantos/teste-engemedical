'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { LayoutItem } from '../types';

interface Props {
  data?: LayoutItem[];
}

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0d9488', '#6b7280'];

const LAYOUT_NAMES: Record<string, string> = {
  S2210: 'S2210 - Admissional/Desligamento',
  S2220: 'S2220 - Monitoramento Saude',
  S2230: 'S2230 - Afastamento Temporario',
  S2240: 'S2240 - Condicoes Ambientais',
  S2221: 'S2221 - Reavaliacao',
  'Sem evento identificado': 'Sem Evento',
};

export function EventosDonut({ data }: Props) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: LAYOUT_NAMES[d.layout] || d.layout,
    value: d.qtd,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        No. de Registros por Evento
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="value"
            label={({ name, percent }) => `${name.split(' - ')[0]} ${(percent * 100).toFixed(0)}%`}
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