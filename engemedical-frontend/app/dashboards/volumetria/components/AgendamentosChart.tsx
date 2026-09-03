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
  Cell,
} from 'recharts';
import type { PorAgendaBar } from '../types';

interface Props {
  data: PorAgendaBar[];
}

const COLORS = {
  agendamentos: '#3b82f6',
  atendidos: '#10b981',
  naoAtendidos: '#ef4444',
};

export function AgendamentosChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Nº de Agendamentos vs Atendimentos
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="nomeAgenda" tick={{ fontSize: 9 }} interval={0} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
          <Legend />
          <Bar dataKey="agendamentos" name="Agendamentos" fill={COLORS.agendamentos} />
          <Bar dataKey="atendidos" name="Atendidos" fill={COLORS.atendidos} />
          <Bar dataKey="naoAtendidos" name="Não Atendidos" fill={COLORS.naoAtendidos} />
          {data.map((_, i) => (
            <Cell key={`bar-${i}`} fill={COLORS.agendamentos} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}