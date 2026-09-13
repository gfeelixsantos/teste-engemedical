'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Calendar, Filter } from 'lucide-react';
import { getDynamicNestUrl } from '@/config/constants';
import { VolumetriaDashboardResponse } from './types';
import { KpiCards } from './components/KpiCards';
import { ControleAgendamentos } from './components/ControleAgendamentos';
import { EvolucaoTemporal } from './components/EvolucaoTemporal';
import { CompromissoEExames } from './components/CompromissoEExames';
import { HorariosEDias } from './components/HorariosEDias';
import { MonitoramentoDetalhado } from './components/MonitoramentoDetalhado';
import { DadosGeraisTable } from './components/DadosGeraisTable';

export default function VolumetriaDashboardPage() {
  const [data, setData] = useState<VolumetriaDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agendaFiltro, setAgendaFiltro] = useState('Todos');
  const [statusFiltro, setStatusFiltro] = useState('Todos');

  const fetchDashboard = async (agenda = agendaFiltro, status = statusFiltro, force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const query = new URLSearchParams({
        agenda,
        status,
        ...(force ? { refresh: 'true' } : {}),
      });

      const res = await fetch(`${getDynamicNestUrl()}volumetria/dashboard?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch volumetria dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard(agendaFiltro, statusFiltro);
  }, [agendaFiltro, statusFiltro]);

  const handleAgendaChange = (ag: string) => {
    setAgendaFiltro(ag);
  };

  const handleStatusChange = (st: string) => {
    setStatusFiltro(st);
  };

  const handleRefresh = () => {
    fetchDashboard(agendaFiltro, statusFiltro, true);
  };

  return (
    <div className="p-6 space-y-8 bg-background min-h-screen">
      {/* Header do Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Volumetria de Agendamentos</h1>
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Power BI Integrated
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Análise consolidada de agendamentos, exames, atendimentos e horários
          </p>
        </div>

        <div className="flex items-center gap-3">
          {data?.kpis?.ultimaAtualizacao && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Atualizado: {new Date(data.kpis.ultimaAtualizacao).toLocaleTimeString('pt-BR')}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg shadow-xs hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
          </button>
        </div>
      </div>

      {/* Filtro de Agendas (Pills) */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtrar por Agendas:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleAgendaChange('Todos')}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
              agendaFiltro === 'Todos'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card hover:bg-muted text-muted-foreground border-border'
            }`}
          >
            Todas as Agendas
          </button>
          {data?.agendasDisponiveis?.map((ag) => (
            <button
              key={ag}
              onClick={() => handleAgendaChange(ag)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                agendaFiltro === ag
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card hover:bg-muted text-muted-foreground border-border'
              }`}
            >
              {ag}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs do Topo */}
      <KpiCards
        kpis={
          data?.kpis || {
            totalAgendamentos: 0,
            totalExames: 0,
            mediaExamesPorAgendamento: 0,
            totalFuncionarios: 0,
            atendidos: 0,
            naoAtendidos: 0,
            aguardandoAtendimento: 0,
            ultimaAtualizacao: '',
          }
        }
        loading={loading}
      />

      {/* Controle Geral de Agendamentos */}
      <ControleAgendamentos
        porAgenda={data?.porAgenda || []}
        kpis={
          data?.kpis || {
            totalAgendamentos: 0,
            totalExames: 0,
            mediaExamesPorAgendamento: 0,
            totalFuncionarios: 0,
            atendidos: 0,
            naoAtendidos: 0,
            aguardandoAtendimento: 0,
            ultimaAtualizacao: '',
          }
        }
        statusFiltro={statusFiltro}
        onStatusChange={handleStatusChange}
        loading={loading}
      />

      {/* Evolução Temporal */}
      <EvolucaoTemporal porPeriodo={data?.porPeriodo || []} />

      {/* Distribuição de Tipo de Compromisso e Volume de Exames */}
      <CompromissoEExames
        porTipoCompromisso={data?.porTipoCompromisso || []}
        porVolumeExame={data?.porVolumeExame || []}
      />

      {/* Horários, Dias da Semana e Matriz Cruzada (Heatmap) */}
      <HorariosEDias
        porHorario={data?.porHorario || []}
        porDiaSemana={data?.porDiaSemana || []}
        heatmap={
          data?.heatmap || {
            horariosColunas: [],
            dias: [],
            totaisPorHorario: {},
            totalGeral: 0,
          }
        }
      />

      {/* Monitoramento Detalhado */}
      <MonitoramentoDetalhado
        porSituacaoDetalhada={data?.porSituacaoDetalhada || []}
        porEmpresa={data?.porEmpresa || []}
        porSubgrupo={data?.porSubgrupo || []}
      />

      {/* Tabela Geral Analítica */}
      <DadosGeraisTable agendaFiltro={agendaFiltro} statusFiltro={statusFiltro} />
    </div>
  );
}
