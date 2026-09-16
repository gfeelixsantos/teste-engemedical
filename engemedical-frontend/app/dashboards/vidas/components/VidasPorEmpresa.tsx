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
import type { CustoPorVidaItem } from '../types';

interface Props {
  data?: CustoPorVidaItem[];
}

export default function VidasPorEmpresa({ data }: Props) {
  const chartData = (data || []).map((d) => ({
    name: d.empresa.length > 25 ? d.empresa.substring(0, 25) + '...' : d.empresa,
    vidas: d.qtdVidas,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-md">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Vidas Ativas – Top Empresas</h3>
      {data ? (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" fontSize={11} />
            <YAxis dataKey="name" type="category" width={180} fontSize={10} />
            <Tooltip />
            <Bar dataKey="vidas" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18}>
              <LabelList dataKey="vidas" position="right" fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[350px] bg-gray-100 rounded animate-pulse" />
      )}
    </div>
  );
}
