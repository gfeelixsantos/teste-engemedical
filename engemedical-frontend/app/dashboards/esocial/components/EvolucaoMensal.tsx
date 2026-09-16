'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { EvolucaoMensalItem } from '../types';

interface Props {
  data?: EvolucaoMensalItem[];
}

const MONTHS_PT: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function formatMesPtBr(mes: string): string {
  if (!mes || mes.length < 7) return mes;
  const [ano, month] = mes.split('-');
  return `${MONTHS_PT[month] || month}/${ano?.slice(-2) || ''}`;
}

const SkeletonChart = () => (
  <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-48 mx-auto mb-4" />
    <div className="h-64 bg-gray-100 rounded" />
  </div>
);

export function EvolucaoMensal({ data }: Props) {
  if (!data || data.length === 0) return <SkeletonChart />;

  const chartData = data.map((d) => ({
    ...d,
    mesLabel: formatMesPtBr(d.mes),
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Evolução Mensal de Eventos
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip
            labelFormatter={(label) => `Mês: ${label}`}
            formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Eventos']}
          />
          <Line
            type="monotone"
            dataKey="qtd"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: '#2563eb', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
