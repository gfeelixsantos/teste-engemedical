'use client';

import CountUp from 'react-countup';
import type { DocumentosKPIs } from '../types';

interface HeaderKpisProps {
  kpis?: DocumentosKPIs;
  totalAcoesPgr?: number;
}

export function HeaderKpisDocumentos({ kpis, totalAcoesPgr = 4 }: HeaderKpisProps) {
  const docsAtivos = kpis?.totalDocumentos ?? 31;
  const totalPGR = kpis?.totalPGR ?? 16;
  const totalPCMSO = kpis?.totalPCMSO ?? 15;
  const vigentes = kpis?.vigentes ?? 28;
  const aVencer = kpis?.aVencer ?? 0;
  const vencidos = kpis?.vencidos ?? 3;

  return (
    <div className="space-y-4 mb-6">
      {/* Top Bar Branding + 6 KPIs principales */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        {/* 6 Top Cards em Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 w-full xl:w-auto">
          {/* Card 1 */}
          <div className="bg-slate-100/80 rounded-xl px-4 py-2.5 text-center min-w-[120px]">
            <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
              <CountUp end={docsAtivos} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Documentos Ativos
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-100/80 rounded-xl px-4 py-2.5 text-center min-w-[110px]">
            <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
              <CountUp end={totalPGR} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Total de PGR
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-100/80 rounded-xl px-4 py-2.5 text-center min-w-[120px]">
            <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
              <CountUp end={totalPCMSO} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Total de PCMSO
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-100/80 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
            <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
              <CountUp end={vigentes} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Vigentes
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-slate-100/80 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
            <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
              <CountUp end={aVencer} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              À Vencer
            </div>
          </div>

          {/* Card 6 */}
          <div className="bg-slate-100/80 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
            <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
              <CountUp end={vencidos} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Vencidos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
