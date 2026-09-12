'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

interface UnidadeItem {
  unidade: string;
  exames: number;
  foraDoPrazo: number;
}

export function UnidadesPendenciasBarChart({ data = [] }: { data?: UnidadeItem[] }) {
  const safeData = Array.isArray(data) ? data : [];
  const formatted = safeData.map((d) => ({
    ...d,
    shortUnidade:
      d.unidade.length > 20 ? `${d.unidade.substring(0, 17)}...` : d.unidade,
  }));

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={formatted}
          margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="shortUnidade"
            stroke="#475569"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E293B',
              borderRadius: '8px',
              border: 'none',
              color: '#FFF',
              fontSize: '11px',
            }}
            formatter={(val: number, name: string, item: any) => [
              `${val} pendências`,
              item.payload.unidade,
            ]}
          />
          <Bar dataKey="foraDoPrazo" fill="#EF4444" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="foraDoPrazo"
              position="right"
              style={{ fontSize: '10px', fontWeight: 'bold', fill: '#475569' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
