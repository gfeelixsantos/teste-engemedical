'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PorEmpresaBar } from '../types';

interface Props {
  data?: PorEmpresaBar[];
}

export function CustosEmpresa({ data }: Props) {
  if (!data || data.length === 0) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Custos de Afastamentos por Empresa
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={formatCurrency} />
          <YAxis type="category" dataKey="empresa" width={150} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Bar dataKey="custoTotal" name="Custo Total" fill="#008000" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}