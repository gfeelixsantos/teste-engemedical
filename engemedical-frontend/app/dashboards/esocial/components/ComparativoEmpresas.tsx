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
import type { ComparativoEmpresaItem } from '../types';

interface Props {
  data?: ComparativoEmpresaItem[];
}

export function ComparativoEmpresas({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Comparativo de Registros por Empresas
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="empresa" width={200} />
          <Tooltip />
          <Bar dataKey="totalRegistros" name="Registros" fill="#3b82f6">
            <LabelList
              dataKey="pctConcluido"
              position="right"
              formatter={(value: number) => `${value}%`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}