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
import type { PorMesLinha } from '../types';
import { ChartGradients } from '../../components/shared/ChartGradients';
import { RichChartTooltip } from '../../components/shared/RichChartTooltip';

interface AbsenteismoGeralProps {
  porMes?: PorMesLinha[];
  atestadosFeminino?: number;
  atestadosMasculino?: number;
  isLoading?: boolean;
}

const FALLBACK_MES: PorMesLinha[] = [
  { mes: 'janeiro', mesNum: 1, diasPerdidos: 114, atestados: 46 },
  { mes: 'fevereiro', mesNum: 2, diasPerdidos: 130, atestados: 57 },
  { mes: 'março', mesNum: 3, diasPerdidos: 127, atestados: 45 },
  { mes: 'abril', mesNum: 4, diasPerdidos: 160, atestados: 64 },
  { mes: 'maio', mesNum: 5, diasPerdidos: 94, atestados: 15 },
  { mes: 'junho', mesNum: 6, diasPerdidos: 60, atestados: 2 },
  { mes: 'julho', mesNum: 7, diasPerdidos: 80, atestados: 14 },
  { mes: 'agosto', mesNum: 8, diasPerdidos: 43, atestados: 23 },
  { mes: 'setembro', mesNum: 9, diasPerdidos: 22, atestados: 17 },
];

export function AbsenteismoGeralSection({
  porMes,
  atestadosFeminino = 24,
  atestadosMasculino = 29,
  isLoading,
}: AbsenteismoGeralProps) {
  const chartData = (porMes && porMes.length > 0) ? porMes : FALLBACK_MES;
  const totalDiasPerdidos = chartData.reduce((acc, curr) => acc + (curr.diasPerdidos || 0), 0);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6 h-[350px] animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6 relative overflow-hidden">
      <ChartGradients />
      <h2 className="text-base font-bold text-gray-800 text-center uppercase tracking-wide mb-6">
        Análise de Absenteísmo Geral
      </h2>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Indicadores de Gênero na Esquerda (Feminino / Masculino) */}
        <div className="flex flex-col gap-6 min-w-[140px] pl-4 border-r border-gray-100 pr-6">
          {/* Feminino */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-pink-500 flex items-center justify-center text-pink-500 font-bold text-xl shadow-sm">
              ♀
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-600 uppercase">Feminino</div>
              <div className="text-2xl font-black text-teal-800">{atestadosFeminino}</div>
            </div>
          </div>

          {/* Masculino */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-500 font-bold text-xl shadow-sm">
              ♂
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-600 uppercase">Masculino</div>
              <div className="text-2xl font-black text-teal-800">{atestadosMasculino}</div>
            </div>
          </div>
        </div>

        {/* Gráfico Central: Distribuição de Dias Perdidos vs Atestados por Período */}
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Distribuição de Dias Perdidos vs Atestados por Período
            </h3>
            <div className="flex items-center gap-4 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#086b94] inline-block shadow-sm" />
                Nº de Dias Perdidos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block shadow-sm" />
                Nº de Atestados
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis hide />
              <Tooltip content={<RichChartTooltip totalSum={totalDiasPerdidos} />} />
              <Bar dataKey="diasPerdidos" name="Dias Perdidos" fill="url(#gradCyan)" radius={[4, 4, 0, 0]} barSize={26}>
                <LabelList dataKey="diasPerdidos" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#086b94' }} />
              </Bar>
              <Bar dataKey="atestados" name="Atestados" fill="url(#gradEmerald)" radius={[4, 4, 0, 0]} barSize={26}>
                <LabelList dataKey="atestados" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#10b981' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="text-center text-[10px] text-gray-400 font-semibold -mt-2">2026</div>
        </div>
      </div>
    </div>
  );
}

