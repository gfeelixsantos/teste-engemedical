'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PorCidBar } from '../types';

interface Props {
  data?: PorCidBar[];
}

export function CidsChart({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Distribuicao por CID
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="cid" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="atestados" name="Atestados" fill="#005F83" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}