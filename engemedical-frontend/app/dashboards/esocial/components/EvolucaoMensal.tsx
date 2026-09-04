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

export function EvolucaoMensal({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Evolucao Mensal de Registros
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="qtd" name="Registros" stroke="#1f2937" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}