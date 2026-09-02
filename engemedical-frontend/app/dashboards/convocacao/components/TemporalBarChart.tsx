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

interface Props {
  data: Array<{
    ano: number;
    mes: string;
    funcionarios: number;
    exames: number;
  }>;
}

export function TemporalBarChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: `${d.mes}/${d.ano}`,
    Funcionários: d.funcionarios,
    Exames: d.exames,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
          }
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            value.toLocaleString('pt-BR'),
            name,
          ]}
        />
        <Legend />
        <Bar dataKey="Funcionários" fill="#3b82f6" radius={[2, 2, 0, 0]} />
        <Bar dataKey="Exames" fill="#06b6d4" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
