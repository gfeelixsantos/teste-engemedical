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
import type { NaoConcluidoEmpresaItem } from '../types';

interface Props {
  data?: NaoConcluidoEmpresaItem[];
}

const STATUS_COLORS: Record<string, string> = {
  inconsistencias: '#991b1b',
  pendente: '#f97316',
  assinado: '#0d9488',
  excluido: '#374151',
};

export function NaoConcluidosEmpresa({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Analise de Registros por Empresa
      </h3>
      <p className="text-sm text-gray-500 text-center mb-4">
        Distribuicao de Registros Nao Concluidos por Empresa
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="empresa" angle={-45} textAnchor="end" height={150} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="inconsistencias" name="Inconsistencias" stackId="a" fill={STATUS_COLORS.inconsistencias} />
          <Bar dataKey="pendente" name="Pendente" stackId="a" fill={STATUS_COLORS.pendente} />
          <Bar dataKey="assinado" name="Assinado" stackId="a" fill={STATUS_COLORS.assinado} />
          <Bar dataKey="excluido" name="Excluido" stackId="a" fill={STATUS_COLORS.excluido} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}