'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { PorTipoExame } from '../types';

const COLOR_MAP: Record<string, string> = {
  'A Vencer': '#E69F00',
  'Em Dia': '#009E73',
  'Nunca Realizado': '#0072B2',
  'Sem Data de Resultado': '#CCCCCC',
  'Vencido': '#D55E00',
};

const SITUACOES = ['A Vencer', 'Em Dia', 'Nunca Realizado', 'Sem Data de Resultado', 'Vencido'];

export function TipoExameBarChart({ data }: { data: PorTipoExame[] }) {
  // Truncate long exam names for x-axis labels
  const formattedData = data.map((item) => ({
    ...item,
    shortName:
      item.tipoExame.length > 25
        ? `${item.tipoExame.substring(0, 22)}...`
        : item.tipoExame,
  }));

  return (
    <div className="w-full h-[300px]">
      {/* Legend Header */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-2 text-[11px] font-semibold text-gray-700">
        {SITUACOES.map((s) => (
          <div key={s} className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLOR_MAP[s] }}
            />
            <span>{s}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <BarChart
          data={formattedData}
          margin={{ top: 20, right: 10, left: -20, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="shortName"
            stroke="#64748B"
            fontSize={10}
            tickLine={false}
            interval={0}
            angle={-10}
            textAnchor="end"
          />
          <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              color: '#334155',
              fontSize: '11px',
            }}
          />
          {SITUACOES.map((situacao) => (
            <Bar
              key={situacao}
              dataKey={situacao}
              name={situacao}
              fill={COLOR_MAP[situacao]}
              radius={[3, 3, 0, 0]}
            >
              <LabelList
                dataKey={situacao}
                position="top"
                style={{ fontSize: '9px', fontWeight: 'bold', fill: '#475569' }}
                formatter={(v: number) => (v > 0 ? v : '')}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
