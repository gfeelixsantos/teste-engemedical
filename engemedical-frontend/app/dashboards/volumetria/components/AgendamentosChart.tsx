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
import type { PorAgendaBar } from '../types';

interface Props {
  data: PorAgendaBar[];
}

/* ── Smartrics brand palette ── */
const COLORS = {
  agendamentos: '#28B1CF', // ENGE Blue
  atendidos: '#a6ce39',    // ENGE Green
  naoAtendidos: '#ef4444', // red
};

export function AgendamentosChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Agendamentos vs Atendimentos por Mês
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="nomeAgenda" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
          <Legend />
          <Bar dataKey="agendamentos" name="Agendamentos" fill={COLORS.agendamentos} radius={[3, 3, 0, 0]} />
          <Bar dataKey="atendidos" name="Atendidos" fill={COLORS.atendidos} radius={[3, 3, 0, 0]} />
          <Bar dataKey="naoAtendidos" name="Não Atendidos" fill={COLORS.naoAtendidos} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
