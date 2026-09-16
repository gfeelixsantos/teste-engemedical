'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PorCidBar } from '../types';

interface Props {
  data?: PorCidBar[];
  isLoading?: boolean;
}

const COLORS = [
  '#E8601C',
  '#D32F2F',
  '#F44336',
  '#FF5722',
  '#C62828',
  '#FF8A65',
  '#E65100',
  '#FF5252',
  '#BF360C',
  '#FF6E40',
];

function SkeletonChart() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
      <div className="h-[300px] flex items-center justify-center">
        <div className="w-48 h-48 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

export function CidsChart({ data, isLoading }: Props) {
  if (isLoading || !data || data.length === 0) {
    return <SkeletonChart />;
  }

  const chartData = data.map((d) => ({
    name: d.cid,
    value: d.atestados,
    cid: d.cid,
    descricao: d.descricao,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Distribuição por CID
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            dataKey="value"
            nameKey="cid"
            label={({ cid }) => cid}
            labelLine={true}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: number, _name: string, props: any) => [
              `${value} atestados`,
              `${props?.payload?.cid} — ${props?.payload?.descricao}`,
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
