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

const SITUACAO_COLORS: Record<string, string> = {
  'A Vencer': '#f97316',
  'Em Dia': '#10b981',
  'Nunca Realizado': '#3b82f6',
  'Sem Data de Resultado': '#94a3b8',
  Vencido: '#ef4444',
};

interface Props {
  data: Array<{
    tipoExame: string;
    'Em Dia': number;
    'A Vencer': number;
    Vencido: number;
    'Nunca Realizado': number;
    'Sem Data de Resultado': number;
  }>;
}

export function TipoExameBarChart({ data }: Props) {
  // Truncar nomes longos dos tipos de exame
  const chartData = data.map((d) => ({
    ...d,
    tipoExame:
      d.tipoExame.length > 40
        ? d.tipoExame.substring(0, 37) + '...'
        : d.tipoExame,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis
          dataKey="tipoExame"
          tick={{ fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            value.toLocaleString('pt-BR'),
            name,
          ]}
          contentStyle={{ fontSize: 11 }}
        />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="A Vencer" stackId="a" fill={SITUACAO_COLORS['A Vencer']} />
        <Bar dataKey="Em Dia" stackId="a" fill={SITUACAO_COLORS['Em Dia']} />
        <Bar dataKey="Nunca Realizado" stackId="a" fill={SITUACAO_COLORS['Nunca Realizado']} />
        <Bar dataKey="Sem Data de Resultado" stackId="a" fill={SITUACAO_COLORS['Sem Data de Resultado']} />
        <Bar dataKey="Vencido" stackId="a" fill={SITUACAO_COLORS['Vencido']} />
      </BarChart>
    </ResponsiveContainer>
  );
}
