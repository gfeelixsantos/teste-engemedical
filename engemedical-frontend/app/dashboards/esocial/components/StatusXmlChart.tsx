'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { StatusXmlItem } from '../types';

interface Props {
  data?: StatusXmlItem[];
}

const COLORS: Record<string, string> = {
  Concluido: '#22c55e',
  Inconsistencias: '#991b1b',
  Pendente: '#f97316',
  Excluido: '#374151',
  Assinado: '#0d9488',
};

export function StatusXmlChart({ data }: Props) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.qtd, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Status dos Arquivos XML
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="status" width={120} />
          <Tooltip />
          <Bar dataKey="qtd" name="Quantidade">
            {data.map((entry) => (
              <Cell key={entry.status} fill={COLORS[entry.status] || '#6b7280'} />
            ))}
            <LabelList
              dataKey="qtd"
              position="right"
              formatter={(value: number) => {
                const pct = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
                return `${value.toLocaleString('pt-BR')} (${pct}%)`;
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}