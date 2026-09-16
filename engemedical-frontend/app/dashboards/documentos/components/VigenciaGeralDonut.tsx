'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data?: { label: string; value: number; color: string }[];
}

export default function VigenciaGeralDonut({ data }: Props) {
  if (!data || data.every((d) => d.value === 0)) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-md">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Vigência dos Contratos</h3>
        <div className="h-[250px] bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-md">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Vigência dos Contratos</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            dataKey="value"
            label={({ label, value }) => `${label}: ${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
