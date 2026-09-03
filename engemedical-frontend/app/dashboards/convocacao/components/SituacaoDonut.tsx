'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Cores exatas do Smartrics
const COLORS: Record<string, string> = {
  'A Vencer': '#f97316',       // laranja
  'Em Dia': '#10b981',         // verde
  'Nunca Realizado': '#3b82f6', // azul
  'Sem Data de Resultado': '#94a3b8', // cinza
  Vencido: '#ef4444',          // vermelho
};

const SITUACAO_ORDER = [
  'Em Dia',
  'A Vencer',
  'Vencido',
  'Nunca Realizado',
  'Sem Data de Resultado',
];

interface Props {
  data: Array<{ situacao: string; funcionarios: number; exames: number }>;
}

export function SituacaoDonut({ data }: Props) {
  // Ordenar conforme Smartrics
  const sorted = [...data].sort((a, b) => {
    const ia = SITUACAO_ORDER.indexOf(a.situacao);
    const ib = SITUACAO_ORDER.indexOf(b.situacao);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const total = sorted.reduce((sum, d) => sum + d.exames, 0);

  const chartData = sorted.map((d) => ({
    name: d.situacao,
    value: d.exames,
    percent: total > 0 ? ((d.exames / total) * 100).toFixed(2) : '0',
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${percent}%`}
            labelLine={false}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={COLORS[entry.name] || '#94a3b8'}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string, props: { payload?: { percent?: string } }) => [
              `${value.toLocaleString('pt-BR')} (${props.payload?.percent || 0}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[entry.name] || '#94a3b8' }}
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
