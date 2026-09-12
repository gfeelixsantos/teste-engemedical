'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SituacaoItem {
  situacao: string;
  funcionarios: number;
  exames: number;
  percentual: number;
}

const COLOR_MAP: Record<string, string> = {
  'A Vencer': '#E69F00',
  'Em Dia': '#009E73',
  'Nunca Realizado': '#0072B2',
  'Sem Data de Resultado': '#CCCCCC',
  'Vencido': '#D55E00',
};

const ORDER = ['A Vencer', 'Em Dia', 'Nunca Realizado', 'Sem Data de Resultado', 'Vencido'];

export function SituacaoDonut({ data }: { data: SituacaoItem[] }) {
  const sortedData = [...data].sort(
    (a, b) => ORDER.indexOf(a.situacao) - ORDER.indexOf(b.situacao),
  );

  return (
    <div className="w-full h-[280px] flex flex-col items-center">
      {/* Legend on Top */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-2 text-[11px] font-semibold text-gray-700">
        {ORDER.map((s) => (
          <div key={s} className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLOR_MAP[s] || '#64748B' }}
            />
            <span>{s}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={sortedData}
            dataKey="exames"
            nameKey="situacao"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            label={({ situacao, exames, percentual }) =>
              `${exames.toLocaleString('pt-BR')} (${percentual ? percentual.toFixed(2) : 0}%)`
            }
            labelLine={{ strokeWidth: 1, stroke: '#94A3B8' }}
          >
            {sortedData.map((entry) => (
              <Cell
                key={entry.situacao}
                fill={COLOR_MAP[entry.situacao] || '#64748B'}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E293B',
              borderRadius: '8px',
              border: 'none',
              color: '#FFF',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => [
              `${value.toLocaleString('pt-BR')} exames`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
