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
import type { StatusItem } from '../types';

interface Props {
  data?: StatusItem[];
}

const COLORS: Record<string, string> = {
  Concluido: '#22c55e',
  Assinado: '#22c55e',
  Inconsistencias: '#dc2626',
  Pendente: '#eab308',
  Excluido: '#374151',
  Processando: '#3b82f6',
  Reprocessar: '#6366f1',
  Ignorado: '#9ca3af',
};

const SkeletonChart = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-48 mx-auto mb-4" />
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-6 bg-gray-200 rounded flex-1" />
        </div>
      ))}
    </div>
  </div>
);

export function StatusXmlChart({ data }: Props) {
  if (!data || data.length === 0) return <SkeletonChart />;

  const total = data.reduce((sum, d) => sum + d.qtd, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Status do XML
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="status" width={140} />
          <Tooltip
            formatter={(value: number, _name: string, props?: { payload?: StatusItem }) => {
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              const label = props?.payload?.status || '';
              return [`${value.toLocaleString('pt-BR')} (${pct}%)`, label];
            }}
          />
          <Bar dataKey="qtd" name="Quantidade" barSize={24}>
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
              style={{ fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
