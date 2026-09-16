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
    <div className="mb-4 flex justify-center">
      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 justify-center gap-3">
        {/* KPI 1 */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-2.5 text-center shadow-md min-w-[140px]">
          <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
            <CountUp end={totalEmpresas} separator="." />
          </div>
          <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
            Nº de Empresas
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-2.5 text-center shadow-md min-w-[160px]">
          <div className="text-xl font-extrabold text-teal-700 leading-none mb-1">
            <CountUp end={pctInconsistentes} suffix="%" />
          </div>
          <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
            % Registros Inconsistentes
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-2.5 text-center shadow-md min-w-[150px]">
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
