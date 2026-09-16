'use client';

import CountUp from 'react-countup';
import type { ConvocacaoKPIs } from '../types';

export function KpiCards({ kpis }: { kpis: ConvocacaoKPIs }) {
  const formatNumber = (num: number) =>
    num.toLocaleString('pt-BR');

  const formatPercent = (num: number) =>
    num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 justify-center gap-3">
      {/* Total de Exames */}
      <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-md border border-gray-100">
        <span className="text-2xl font-black text-[#0F172A] tracking-tight">
          <CountUp end={kpis.totalExames} duration={1.2} formattingFn={formatNumber} />
        </span>
        <span className="text-xs font-semibold text-gray-500 mt-1">
          Total de Exames
        </span>
      </div>

      {/* Nº Funcionários Convocados */}
      <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-md border border-gray-100">
        <span className="text-2xl font-black text-[#0F172A] tracking-tight">
          <CountUp end={kpis.totalFuncionariosConvocados} duration={1.2} formattingFn={formatNumber} />
        </span>
        <span className="text-xs font-semibold text-gray-500 mt-1">
          Nº Funcionários Convocados
        </span>
      </div>

      {/* % Funcionários com Exames em Dia */}
      <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-md border border-gray-100">
        <span className="text-2xl font-black text-[#0F172A] tracking-tight">
          <CountUp end={kpis.percentFuncionariosEmDia} duration={1.2} decimals={1} formattingFn={formatPercent} />
        </span>
        <span className="text-xs font-semibold text-gray-500 mt-1">
          % Funcionários com Exames em Dia
        </span>
      </div>

      {/* % Conformidade Total de Exames */}
      <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-md border border-gray-100">
        <span className="text-2xl font-black text-[#0F172A] tracking-tight">
          <CountUp end={kpis.percentConformidadeTotal} duration={1.2} decimals={1} formattingFn={formatPercent} />
        </span>
        <span className="text-xs font-semibold text-gray-500 mt-1">
          % Conformidade Total de Exames
        </span>
      </div>
    </div>
  );
}
