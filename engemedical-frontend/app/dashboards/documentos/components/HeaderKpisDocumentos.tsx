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
    <div className="mb-6 flex justify-center">
      {/* Top Bar Branding + 6 KPIs principales */}
      <div className="flex justify-center">
        {/* 6 Top Cards em Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 justify-center gap-3">
          {/* Card 1 */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-center shadow-md min-w-[120px]">
            <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
              <CountUp end={docsAtivos} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Documentos Ativos
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-center shadow-md min-w-[110px]">
            <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
              <CountUp end={totalPGR} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Total de PGR
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-center shadow-md min-w-[120px]">
            <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
              <CountUp end={totalPCMSO} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Total de PCMSO
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-center shadow-md min-w-[100px]">
            <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
              <CountUp end={vigentes} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Vigentes
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-center shadow-md min-w-[100px]">
            <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
              <CountUp end={aVencer} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              À Vencer
            </div>
          </div>

          {/* Card 6 */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-center shadow-md min-w-[100px]">
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
