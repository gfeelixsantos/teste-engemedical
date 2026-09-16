'use client';

import React, { useState, useEffect } from 'react';
import { HeartPulse } from 'lucide-react';
import { getDynamicNestUrl } from '@/config/constants';
import { DashboardPageHeader } from '@/components/shared/DashboardPageHeader';
import { VidasDashboardResponse } from './types';
import { KpiCardsVidas } from './components/KpiCardsVidas';
import { ConsistenciaCadastralSection } from './components/ConsistenciaCadastralSection';
import { ConsistenciaPlanoAtivacaoSection } from './components/ConsistenciaPlanoAtivacaoSection';
import { PainelCustoPorVidaSection } from './components/PainelCustoPorVidaSection';
import { TabelasProdutosEmpresas } from './components/TabelasProdutosEmpresas';
import { ConsistenciaEstruturaSection } from './components/ConsistenciaEstruturaSection';
import { PerfilDemograficoSection } from './components/PerfilDemograficoSection';
import { TabelaGeralVidas } from './components/TabelaGeralVidas';

export default function VidasDashboardPage() {
  const [data, setData] = useState<VidasDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [empresaFiltro, setEmpresaFiltro] = useState('Todos');
  const [consistenciaFiltro, setConsistenciaFiltro] = useState('Todos');
  const [motivoFiltro, setMotivoFiltro] = useState('Todos');

  const fetchDashboard = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const query = new URLSearchParams({
        empresa: empresaFiltro,
        consistencia: consistenciaFiltro,
        motivo: motivoFiltro,
        ...(force ? { refresh: 'true' } : {}),
      });

      const res = await fetch(`${getDynamicNestUrl()}vidas/dashboard?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch vidas dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [empresaFiltro, consistenciaFiltro, motivoFiltro]);

  const handleRefresh = () => {
    fetchDashboard(true);
  };

  return (
    <div className="dashboard-content p-6 space-y-8 bg-slate-50/50 min-h-screen">
      <DashboardPageHeader
        icon={HeartPulse}
        title="Gestão de Vidas"
        subtitle={`Monitoramento de consistência cadastral, custos por vida e perfil demográfico${data?.kpis?.ultimaAtualizacao ? ` — Atualizado às ${new Date(data.kpis.ultimaAtualizacao).toLocaleTimeString('pt-BR')}` : '.'}`}
        onRefresh={handleRefresh}
        isRefreshing={refreshing || loading}
      />

      {/* Cartões de KPI */}
      <KpiCardsVidas
        kpis={
          data?.kpis || {
            totalRegistros: 0,
            inativos: 0,
            ativos: 0,
            pendentes: 0,
            ferias: 0,
            afastados: 0,
            percentInconsistenciaBase: 0,
            totalConsistencias: 0,
            totalInconsistencias: 0,
            ultimaAtualizacao: '',
          }
        }
        loading={loading}
      />

      {/* Monitoramento da Consistência Cadastral Ativa */}
      <ConsistenciaCadastralSection
        registrosCadastrais={data?.registrosCadastrais || []}
        indiceRegularizacao={data?.indiceRegularizacao || []}
        kpis={
          data?.kpis || {
            totalRegistros: 0,
            inativos: 0,
            ativos: 0,
            pendentes: 0,
            ferias: 0,
            afastados: 0,
            percentInconsistenciaBase: 0,
            totalConsistencias: 0,
            totalInconsistencias: 0,
            ultimaAtualizacao: '',
          }
        }
      />

      {/* Monitoramento Plano x Ativação */}
      <ConsistenciaPlanoAtivacaoSection
        empresasPorPlano={data?.empresasPorPlano || []}
        registrosPorEmpresa={data?.registrosPorEmpresa || []}
        conformidadeAtivacao={data?.conformidadeAtivacao || []}
      />

      {/* Painel Custo por Vida Cadastrada */}
      <PainelCustoPorVidaSection
        planoProdutos={data?.planoProdutos || []}
        valorVidasEmpresas={data?.valorVidasEmpresas || []}
        vidasAtivasEmpresas={data?.vidasAtivasEmpresas || []}
      />

      {/* Tabelas Produtos & Empresas */}
      <TabelasProdutosEmpresas
        produtosTabela={data?.produtosTabela || []}
        empresasAtivacaoTabela={data?.empresasAtivacaoTabela || []}
      />

      {/* Consistência Cadastral por Estrutura Organizacional */}
      <ConsistenciaEstruturaSection
        analiseEmpresas={data?.analiseEmpresas || []}
        analiseUnidades={data?.analiseUnidades || []}
        analiseSetores={data?.analiseSetores || []}
        empresaFiltro={empresaFiltro}
        consistenciaFiltro={consistenciaFiltro}
        motivoFiltro={motivoFiltro}
        onEmpresaChange={setEmpresaFiltro}
        onConsistenciaChange={setConsistenciaFiltro}
        onMotivoChange={setMotivoFiltro}
      />

      {/* Perfil Demográfico */}
      <PerfilDemograficoSection
        perfil={
          data?.perfilDemografico || {
            masculino: 0,
            feminino: 0,
            faixaEtaria: [],
            localidade: [],
          }
        }
      />

      {/* Tabela Geral */}
      <TabelaGeralVidas />
    </div>
  );
}
