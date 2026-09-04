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

export function StatusPorMes({ data }: Props) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    mes: d.mes,
    Concluido: d.concluido,
    Inconsistencias: d.inconsistencias,
    Pendente: d.pendente,
    Excluido: d.excluido,
    Assinado: d.assinado,
    Outros: d.outros,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Distribuicao de Status dos Registros por Mes
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Concluido" stackId="a" fill="#22c55e" />
          <Bar dataKey="Inconsistencias" stackId="a" fill="#991b1b" />
          <Bar dataKey="Pendente" stackId="a" fill="#f97316" />
          <Bar dataKey="Excluido" stackId="a" fill="#374151" />
          <Bar dataKey="Assinado" stackId="a" fill="#0d9488" />
          <Bar dataKey="Outros" stackId="a" fill="#6b7280" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}