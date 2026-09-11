'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { PorSituacaoItem } from '../types';

/* ── Smartrics / Engemedical brand colors for situacao ── */
const SITUACAO_COLORS: Record<string, string> = {
  Atendido: '#0698C2',            // ENGE Blue
  NaoAtendido: '#ef4444',         // red
  AguardandoAtendimento: '#a6ce39', // ENGE Green
  Cancelado: '#94a3b8',           // slate
  NaoCompareceu: '#f97316',       // orange
};

const SITUACAO_LABELS: Record<string, string> = {
  Atendido: 'Atendido',
  NaoAtendido: 'Não Atendido',
  AguardandoAtendimento: 'Aguardando',
  Cancelado: 'Cancelado',
  NaoCompareceu: 'Não Compareceu',
};

const SITUACAO_ORDER = [
  'Atendido',
  'AguardandoAtendimento',
  'NaoAtendido',
  'NaoCompareceu',
  'Cancelado',
];

interface Props {
  data: PorSituacaoItem[];
}

export function SituacaoDonut({ data }: Props) {
  const sorted = [...data].sort((a, b) => {
    const ia = SITUACAO_ORDER.indexOf(a.situacao);
    const ib = SITUACAO_ORDER.indexOf(b.situacao);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const total = sorted.reduce((sum, d) => sum + d.quantidade, 0);

  const chartData = sorted.map((d) => ({
    name: SITUACAO_LABELS[d.situacao] || d.situacao,
    rawKey: d.situacao,
    value: d.quantidade,
    percent: total > 0 ? ((d.quantidade / total) * 100).toFixed(1) : '0',
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${percent}%`}
            labelLine={false}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.rawKey}
                fill={SITUACAO_COLORS[entry.rawKey] || '#94a3b8'}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              value.toLocaleString('pt-BR'),
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
        {chartData.map((entry) => (
          <div key={entry.rawKey} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: SITUACAO_COLORS[entry.rawKey] || '#94a3b8' }}
            />
            <span className="text-xs text-gray-600">
              {entry.name}{' '}
              <span className="text-gray-400">
                ({entry.value.toLocaleString('pt-BR')} — {entry.percent}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
