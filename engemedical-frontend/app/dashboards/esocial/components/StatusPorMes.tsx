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

const STATUS_COLORS: Record<string, string> = {
  concluido: '#22c55e',
  inconsistencias: '#991b1b',
  pendente: '#f97316',
  assinado: '#0d9488',
  excluido: '#374151',
};

export function StatusPorMes({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Distribuicao de Status dos Registros por Mes
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="concluido" name="Concluido" stackId="a" fill={STATUS_COLORS.concluido} />
          <Bar dataKey="inconsistencias" name="Inconsistencias" stackId="a" fill={STATUS_COLORS.inconsistencias} />
          <Bar dataKey="pendente" name="Pendente" stackId="a" fill={STATUS_COLORS.pendente} />
          <Bar dataKey="assinado" name="Assinado" stackId="a" fill={STATUS_COLORS.assinado} />
          <Bar dataKey="excluido" name="Excluido" stackId="a" fill={STATUS_COLORS.excluido} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}