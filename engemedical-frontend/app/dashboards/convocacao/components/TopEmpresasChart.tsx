'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  data: Array<{
    empresa: string;
    exames: number;
    funcionariosAVencer: number;
    percentAVencer: number;
  }>;
}

export function TopEmpresasChart({ data }: Props) {
  const top10 = data
    .sort((a, b) => b.exames - a.exames)
    .slice(0, 10)
    .map((d) => ({
      name:
        d.empresa.length > 30
          ? d.empresa.substring(0, 27) + '...'
          : d.empresa,
      Exames: d.exames,
    }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        layout="vertical"
        data={top10}
        margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
      >
        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          dataKey="name"
          type="category"
          width={150}
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Exames']}
        />
        <Bar dataKey="Exames" fill="#3b82f6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
