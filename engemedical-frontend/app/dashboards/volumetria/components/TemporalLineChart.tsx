'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PorAnoLine } from '../types';

interface Props {
  data: PorAnoLine[];
}

/* ── Smartrics brand palette ── */
const COLORS = {
  agendamentos: '#28B1CF', // ENGE Blue
  atendidos: '#a6ce39',    // ENGE Green
  exames: '#f59e0b',       // amber
};

export function TemporalLineChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
        <Legend />
        <Line
          type="monotone"
          dataKey="agendamentos"
          name="Agendamentos"
          stroke={COLORS.agendamentos}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="atendidos"
          name="Atendimentos"
          stroke={COLORS.atendidos}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="exames"
          name="Exames"
          stroke={COLORS.exames}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
