'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDynamicNestUrl } from '@/config/constants';
import { HeaderKpisProfissionais } from './components/HeaderKpisProfissionais';
import { AgendasPillsFilter } from './components/AgendasPillsFilter';
import { ControleGeralSection } from './components/ControleGeralSection';
import { HorariosEDiasSection } from './components/HorariosEDiasSection';
import { MonitoramentoDetalhadosSection } from './components/MonitoramentoDetalhadosSection';
import { DadosGeraisProfissionaisTable } from './components/DadosGeraisProfissionaisTable';
import type { ProfissionaisDashboardResponse } from './types';

export default function ProfissionaisPage() {
  const [selectedAgenda, setSelectedAgenda] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const { data, isLoading, error } = useQuery<ProfissionaisDashboardResponse>({
    queryKey: ['profissionais', selectedAgenda, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgenda) params.set('agenda', selectedAgenda);
      if (statusFilter && statusFilter !== 'Todos') params.set('status', statusFilter);
      const res = await fetch(`${getDynamicNestUrl()}profissionais/dashboard?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-slate-50/50 py-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            Erro ao carregar dados do dashboard de Profissionais. Verifique o servidor NestJS.
          </div>
        )}

        {/* 1: Header Branding + 4 Top KPIs */}
        <HeaderKpisProfissionais kpis={data?.kpis} isLoading={isLoading} />

        {/* 2: Agendas Horizontal Pills Filter + Status Filter */}
        <AgendasPillsFilter
          agendas={data?.agendasDisponiveis || []}
          selectedAgenda={selectedAgenda}
          onSelectAgenda={(ag) => setSelectedAgenda(ag)}
          statusFilter={statusFilter}
          onChangeStatus={(st) => setStatusFilter(st)}
        />

        {/* 3: Controle Geral de Agendamentos (Barras Agenda + Linha Período + Donut Situação + Volume Exames) */}
        <ControleGeralSection
          porAgenda={data?.porAgenda}
          porPeriodo={data?.porPeriodo}
          porTipoCompromisso={data?.porTipoCompromisso}
          porVolumeExame={data?.porVolumeExame}
          atendidos={data?.kpis?.atendidos}
          naoAtendidos={data?.kpis?.naoAtendidos}
          aguardando={data?.kpis?.aguardandoAtendimento}
          isLoading={isLoading}
        />

        {/* 4: Horários e Dias da Semana (Barras Horário + Barras Dia + Matriz Dia x Horário) */}
        <HorariosEDiasSection
          porHorario={data?.porHorario}
          porDiaSemana={data?.porDiaSemana}
          heatmap={data?.heatmap}
          isLoading={isLoading}
        />

        {/* 5: Monitoramento Detalhado de Agendamentos (Tabs + Volume Situação + Empresa + Subgrupo + Mini-Tabela) */}
        <MonitoramentoDetalhadosSection
          porEmpresa={data?.porEmpresa}
          porSubgrupo={data?.porSubgrupo}
          registros={data?.detalhes}
          isLoading={isLoading}
        />

        {/* 6: Dados Gerais de Agendamentos (Tabela Completa de 13 Colunas + 4 Filtros) */}
        <DadosGeraisProfissionaisTable
          data={data?.detalhes}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
