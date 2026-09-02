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
  data: Array<{ unidade: string; exames: number; foraDoPrazo: number }>;
}

export function UnidadesChart({ data }: Props) {
  const top10 = data
    .sort((a, b) => b.foraDoPrazo - a.foraDoPrazo)
    .slice(0, 10)
    .map((d) => ({
      name:
        d.unidade.length > 30
          ? d.unidade.substring(0, 27) + '...'
          : d.unidade,
      'Fora do Prazo': d.foraDoPrazo,
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
          formatter={(value: number) => [
            value.toLocaleString('pt-BR'),
            'Fora do Prazo',
          ]}
        />
        <Bar dataKey="Fora do Prazo" fill="#ef4444" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
