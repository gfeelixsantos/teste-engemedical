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

interface EmpresaItem {
  empresa: string;
  exames: number;
  funcionariosAVencer: number;
  percentAVencer: number;
}

export function TopEmpresasBarChart({ data = [] }: { data?: EmpresaItem[] }) {
  const safeData = Array.isArray(data) ? data : [];
  const formatted = safeData.map((d) => ({
    ...d,
    shortEmpresa:
      d.empresa.length > 20 ? `${d.empresa.substring(0, 17)}...` : d.empresa,
    label: `${d.funcionariosAVencer} ${d.percentAVencer}%`,
  }));

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={formatted}
          margin={{ top: 5, right: 55, left: 10, bottom: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="shortEmpresa"
            stroke="#475569"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              color: '#334155',
              fontSize: '11px',
            }}
            formatter={(val: number, name: string, item: any) => [
              `${val} func (${item.payload.percentAVencer}% )`,
              item.payload.empresa,
            ]}
          />
          <Bar dataKey="funcionariosAVencer" fill="#E69F00" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="label"
              position="right"
              style={{ fontSize: '10px', fontWeight: 'bold', fill: '#475569' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
