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
import type { EmpresaStatusItem } from '../types';

interface Props {
  data?: EmpresaStatusItem[];
}

const SkeletonChart = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-56 mx-auto mb-4" />
    <div className="h-72 bg-gray-100 rounded" />
  </div>
);

export function NaoConcluidosEmpresa({ data }: Props) {
  if (!data || data.length === 0) return <SkeletonChart />;

  const chartData = data.map((d) => ({
    name: d.empresa.length > 25 ? d.empresa.substring(0, 25) + '...' : d.empresa,
    Inconsistências: d.inconsistencias,
    Pendentes: d.pendente,
    Assinados: d.assinado,
    Excluídos: d.excluido,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Não Concluídos por Empresa
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis />
          <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
          <Legend />
          <Bar dataKey="Inconsistências" stackId="a" fill="#dc2626" />
          <Bar dataKey="Pendentes" stackId="a" fill="#eab308" />
          <Bar dataKey="Assinados" stackId="a" fill="#0d9488" />
          <Bar dataKey="Excluídos" stackId="a" fill="#374151" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
