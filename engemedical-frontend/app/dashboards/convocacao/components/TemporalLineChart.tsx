'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PorAno, ConvocacaoKPIs } from '../types';

interface TemporalLineChartProps {
  data: PorAno[];
  kpis: ConvocacaoKPIs;
}

export function TemporalLineChart({ data, kpis }: TemporalLineChartProps) {
  const anoAtual = new Date().getFullYear();

  const formatXAxis = (ano: number) => {
    if (ano === anoAtual - 1) return `${ano} (Passado)`;
    if (ano === anoAtual)     return `${ano} (Atual)`;
    if (ano === anoAtual + 1) return `${ano} (Próximo)`;
    return String(ano);
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 w-full h-full">
      <div className="flex-1 w-full h-[240px]">
        {/* Custom Legend Header */}
        <div className="flex items-center justify-center gap-6 mb-2 text-xs font-medium text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0072B2]" />
            <span>Nº Funcionários</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#009E73]" />
            <span>Total de Exames</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="ano"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              tickFormatter={formatXAxis}
            />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                color: '#334155',
                fontSize: '12px',
              }}
              labelFormatter={(ano: number) => formatXAxis(ano)}
              formatter={(value: number) => value.toLocaleString('pt-BR')}
            />
            <Line
              type="monotone"
              dataKey="funcionarios"
              name="Nº Funcionários"
              stroke="#0072B2"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#0072B2' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="exames"
              name="Total de Exames"
              stroke="#009E73"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#009E73' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Side Stats */}
      <div className="flex lg:flex-col justify-around lg:justify-center items-center lg:items-end gap-4 min-w-[140px] border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">
        <div className="text-center lg:text-right">
          <span className="text-xs font-bold text-gray-700 block mb-0.5">Exames Em Dia</span>
          <span className="text-xl font-black text-[#009E73]">
            {kpis.examesDentroDoPrazo.toLocaleString('pt-BR')}
          </span>
        </div>
        <div className="text-center lg:text-right">
          <span className="text-xs font-bold text-gray-700 block mb-0.5">Exames Vencidos</span>
          <span className="text-xl font-black text-[#D55E00]">
            {kpis.examesForaDoPrazo.toLocaleString('pt-BR')}
          </span>
        </div>
      </div>
    </div>
  );
}
