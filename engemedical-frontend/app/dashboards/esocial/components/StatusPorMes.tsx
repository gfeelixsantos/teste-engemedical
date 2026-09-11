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
import type { StatusMesItem } from '../types';

interface Props {
  data?: StatusMesItem[];
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
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-52 mx-auto mb-4" />
    <div className="h-72 bg-gray-100 rounded" />
  </div>
);

export function StatusPorMes({ data }: Props) {
  if (!data || data.length === 0) return <SkeletonChart />;

  const chartData = data.map((d) => ({
    mes: formatMesPtBr(d.mes),
    Concluídos: d.concluido,
    Inconsistências: d.inconsistencias,
    Pendentes: d.pendente,
    Excluídos: d.excluido,
    Assinados: d.assinado,
    Outros: d.outros,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Status por Mês
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
          <Legend />
          <Bar dataKey="Concluídos" stackId="a" fill="#22c55e" />
          <Bar dataKey="Inconsistências" stackId="a" fill="#dc2626" />
          <Bar dataKey="Pendentes" stackId="a" fill="#eab308" />
          <Bar dataKey="Assinados" stackId="a" fill="#0d9488" />
          <Bar dataKey="Excluídos" stackId="a" fill="#374151" />
          <Bar dataKey="Outros" stackId="a" fill="#6b7280" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
