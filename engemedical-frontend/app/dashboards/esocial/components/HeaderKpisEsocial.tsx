'use client';

import CountUp from 'react-countup';

interface HeaderKpisProps {
  totalEmpresas?: number;
  pctInconsistentes?: number;
  totalRegistrosXml?: number;
}

export function HeaderKpisEsocial({
  totalEmpresas = 1644,
  pctInconsistentes = 33,
  totalRegistrosXml = 85901,
}: HeaderKpisProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
        {/* KPI 1 */}
        <div className="bg-slate-100/80 rounded-xl px-5 py-2.5 text-center min-w-[140px]">
          <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
            <CountUp end={totalEmpresas} separator="." />
          </div>
          <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
            Nº de Empresas
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-100/80 rounded-xl px-5 py-2.5 text-center min-w-[160px]">
          <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
            <CountUp end={pctInconsistentes} suffix="%" />
          </div>
          <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
            % Registros Inconsistentes
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-100/80 rounded-xl px-5 py-2.5 text-center min-w-[150px]">
          <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
            <CountUp end={totalRegistrosXml} separator="." />
          </div>
          <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
            Nº de Registros (XML)
          </div>
        </div>
      </div>
    </div>
  );
}
