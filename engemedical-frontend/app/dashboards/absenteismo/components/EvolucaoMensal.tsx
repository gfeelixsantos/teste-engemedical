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
import type { PorMesLinha } from '../types';

interface Props {
  data?: PorMesLinha[];
}

export function EvolucaoMensal({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Evolucao Mensal - Dias Perdidos vs Atestados
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="diasPerdidos" name="Dias Perdidos" fill="#005F83" />
          <Bar dataKey="atestados" name="Atestados" fill="#009A17" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}