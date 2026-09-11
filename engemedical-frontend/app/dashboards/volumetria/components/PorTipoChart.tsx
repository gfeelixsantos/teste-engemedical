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
import type { PorTipoCompromissoGrouped } from '../types';

interface Props {
  data: PorTipoCompromissoGrouped[];
}

/* ── Smartrics brand palette ── */
const SITUACAO_COLORS: Record<string, string> = {
  AguardandoAtendimento: '#a6ce39', // ENGE Green
  Atendido: '#0698C2',              // ENGE Blue
  NaoAtendido: '#ef4444',           // red
};

export function PorTipoChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Compromissos por Tipo
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="tipoCompromisso" tick={{ fontSize: 9 }} interval={0} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
          <Legend />
          <Bar dataKey="AguardandoAtendimento" name="Aguardando" stackId="a" fill={SITUACAO_COLORS.AguardandoAtendimento} />
          <Bar dataKey="Atendido" name="Atendido" stackId="a" fill={SITUACAO_COLORS.Atendido} />
          <Bar dataKey="NaoAtendido" name="Não Atendido" stackId="a" fill={SITUACAO_COLORS.NaoAtendido} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
