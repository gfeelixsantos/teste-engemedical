'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { Status10Faixa } from '../types';

export function Status10BarChart({ data = [] }: { data?: Status10Faixa[] }) {
  const safeData = Array.isArray(data) ? data : [];
  const formatted = safeData.map((d) => ({
    ...d,
    shortStatus:
      d.status.length > 12 ? `${d.status.substring(0, 10)}...` : d.status,
  }));

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formatted}
          margin={{ top: 20, right: 10, left: -25, bottom: 45 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="shortStatus"
            stroke="#64748B"
            fontSize={9}
            tickLine={false}
            interval={0}
            angle={-35}
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
            formatter={(val: number, name: string, item: any) => [
              `${val.toLocaleString('pt-BR')} funcionários (${item.payload.exames ? item.payload.exames.toLocaleString('pt-BR') : 0} exames)`,
              item.payload.status,
            ]}
          />
          <Bar dataKey="funcionarios" radius={[3, 3, 0, 0]}>
            <LabelList
              dataKey="funcionarios"
              position="top"
              style={{ fontSize: '10px', fontWeight: 'bold', fill: '#334155' }}
              formatter={(v: number) => (v > 0 ? v.toLocaleString('pt-BR') : '')}
            />
            {formatted.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.cor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
