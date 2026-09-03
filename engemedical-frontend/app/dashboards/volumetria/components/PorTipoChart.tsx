'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PorTipoCompromissoGrouped } from '../types';

interface Props {
  data: PorTipoCompromissoGrouped[];
}

const SITUACAO_COLORS: Record<string, string> = {
  'Aguardando Atendimento': '#f97316',
  'Atendido': '#10b981',
  'Não Atendido': '#ef4444',
};

export function PorTipoChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Tipo de Compromisso × Situ.
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="tipoCompromisso" tick={{ fontSize: 9 }} interval={0} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
          <Bar dataKey="Aguardando Atendimento" stackId="a" fill={SITUACAO_COLORS['Aguardando Atendimento']} />
          <Bar dataKey="Atendido" stackId="a" fill={SITUACAO_COLORS['Atendido']} />
          <Bar dataKey="Não Atendido" stackId="a" fill={SITUACAO_COLORS['Não Atendido']} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}