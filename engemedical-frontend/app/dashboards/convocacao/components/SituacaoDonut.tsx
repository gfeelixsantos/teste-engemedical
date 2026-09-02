'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS: Record<string, string> = {
  'Em Dia': '#10b981',
  'A Vencer': '#f59e0b',
  Vencido: '#ef4444',
  'Nunca Realizado': '#8b5cf6',
  'Sem Data de Resultado': '#94a3b8',
};

interface Props {
  data: Array<{ situacao: string; funcionarios: number; exames: number }>;
}

export function SituacaoDonut({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.situacao,
    value: d.exames,
    funcionarios: d.funcionarios,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={COLORS[entry.name] || '#94a3b8'}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) =>
              value.toLocaleString('pt-BR')
            }
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
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
                ({entry.value.toLocaleString('pt-BR')})
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
