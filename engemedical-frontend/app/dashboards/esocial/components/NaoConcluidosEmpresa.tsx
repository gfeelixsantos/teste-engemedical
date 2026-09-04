'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { NaoConcluidoEmpresaItem } from '../types';

interface Props {
  data?: NaoConcluidoEmpresaItem[];
}

export function NaoConcluidosEmpresa({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Valor de Eventos eSocial por Empresa
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="empresa" width={200} />
          <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
          <Bar dataKey="valor" name="Valor (R$)" fill="#8b5cf6">
            <LabelList
              dataKey="valor"
              position="right"
              formatter={(value: number) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}