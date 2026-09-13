'use client';

import CountUp from 'react-countup';
import type { AbsenteismoKPIs } from '../types';

interface HeaderKpisProps {
  kpis?: AbsenteismoKPIs;
  isLoading?: boolean;
}

export function HeaderKpisAbsenteismo({ kpis, isLoading }: HeaderKpisProps) {
  const numFuncionarios = kpis?.totalFuncionarios ?? 53;
  const numAtestados = kpis?.totalAtestados ?? 265;
  const numDiasPerdidos = kpis?.totalDiasPerdidos ?? 830;
  const taxaFrequencia = kpis?.taxaFrequencia ?? 0.02;
  const taxaGravidade = kpis?.taxaGravidade ?? 3.13;
  const indiceAbsenteismo = kpis?.indiceAbsenteismo ?? 5.18;

  if (isLoading) {
    return (
      <div className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse shadow-sm mb-6" />
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Top Bar Branding + 6 KPIs principales */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        {/* 6 Top Cards em Grid (Idênticos à Imagem 1) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 w-full xl:w-auto">
          {/* Card 1 */}
          <div className="bg-slate-100/80 rounded-xl px-4 py-2.5 text-center min-w-[110px]">
            <div className="text-xl font-extrabold text-teal-800 leading-none mb-1">
              <CountUp end={numFuncionarios} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Nº Funcionários
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-100/80 rounded-xl px-4 py-2.5 text-center min-w-[110px]">
            <div className="text-xl font-extrabold text-teal-800 leading-none mb-1">
              <CountUp end={numAtestados} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Nº de Atestados
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-100/80 rounded-xl px-4 py-2.5 text-center min-w-[120px]">
            <div className="text-xl font-extrabold text-teal-800 leading-none mb-1">
              <CountUp end={numDiasPerdidos} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Nº de Dias Perdidos
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-100/80 rounded-xl px-4 py-2.5 text-center min-w-[110px]">
            <div className="text-xl font-extrabold text-teal-800 leading-none mb-1">
              <CountUp end={taxaFrequencia} decimals={2} decimal="," />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Taxa de Frequência
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-slate-100/80 rounded-xl px-4 py-2.5 text-center min-w-[110px]">
            <div className="text-xl font-extrabold text-teal-800 leading-none mb-1">
              <CountUp end={taxaGravidade} decimals={2} decimal="," />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Taxa de Gravidade
            </div>
          </div>

          {/* Card 6 */}
          <div className="bg-slate-100/80 rounded-xl px-4 py-2.5 text-center min-w-[130px]">
            <div className="text-xl font-extrabold text-teal-800 leading-none mb-1">
              <CountUp end={indiceAbsenteismo} decimals={2} decimal="," suffix="%" />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider truncate">
              Índice Médio de Absenteí...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
