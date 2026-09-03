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
import type { PorAnoLine } from '../types';

interface Props {
  data: PorAnoLine[];
}

export function TemporalLineChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis dataKey="ano" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
          }
        />
        <Tooltip formatter={(value: number, name: string) => [value.toLocaleString('pt-BR'), name]} />
        <Line
          type="monotone"
          dataKey="agendamentos"
          name="Nº de Agendamentos"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="atendidos"
          name="Nº de Atendimentos"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="exames"
          name="Total de Exames"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}