'use client';

import CountUp from 'react-countup';
import type { ProfissionaisKPIs } from '../types';

interface Props {
  kpis?: ProfissionaisKPIs;
  isLoading?: boolean;
}

export function HeaderKpisProfissionais({ kpis, isLoading }: Props) {
  const agendamentos = kpis?.totalAgendamentos ?? 24;
  const atendimentos = kpis?.totalAtendimentos ?? 25;
  const mediaExames = kpis?.mediaPorAgendamento ?? 1.04;
  const funcionarios = kpis?.totalFuncionarios ?? 23;

  if (isLoading) {
    return (
      <div className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse shadow-sm mb-4" />
    );
  }

  return (
    <div className="space-y-4 mb-4">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        {/* 4 Cards do Topo (Idênticos ao Power BI da Imagem 1) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full xl:w-auto">
          {/* Card 1 */}
          <div className="bg-slate-100/80 rounded-xl px-6 py-2.5 text-center min-w-[120px]">
            <div className="text-xl font-extrabold text-teal-800 leading-none mb-1">
              <CountUp end={agendamentos} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Nº de Agendamentos
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-100/80 rounded-xl px-6 py-2.5 text-center min-w-[120px]">
            <div className="text-xl font-extrabold text-teal-800 leading-none mb-1">
              <CountUp end={atendimentos} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Nº de Atendimentos
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-100/80 rounded-xl px-6 py-2.5 text-center min-w-[140px]">
            <div className="text-xl font-extrabold text-teal-800 leading-none mb-1">
              <CountUp end={mediaExames} decimals={2} decimal="," />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Exames por Agendamento
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-100/80 rounded-xl px-6 py-2.5 text-center min-w-[120px]">
            <div className="text-xl font-extrabold text-teal-800 leading-none mb-1">
              <CountUp end={funcionarios} separator="." />
            </div>
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Nº Funcionários
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
