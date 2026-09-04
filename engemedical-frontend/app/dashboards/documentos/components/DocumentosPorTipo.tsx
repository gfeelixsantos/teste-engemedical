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
import type { VigenciaPorTipoItem } from '../types';

interface Props {
  data?: VigenciaPorTipoItem[];
}

export default function DocumentosPorTipo({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Nº de Documentos</h3>
        <div className="h-[250px] bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Nº de Documentos por Tipo</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="tipo" fontSize={12} />
          <YAxis fontSize={11} />
          <Tooltip />
          <Bar dataKey="vigentes" name="Vigentes" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="aVencer" name="A Vencer" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="vencidos" name="Vencidos" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Legend />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
