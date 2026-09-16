'use client';

import { useState } from 'react';
import { UserX } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDynamicNestUrl } from '@/config/constants';
import { DashboardPageHeader } from '@/components/shared/DashboardPageHeader';
import { HeaderKpisAbsenteismo } from './components/HeaderKpisAbsenteismo';
import { IndiceImpactoFinanceiroSection } from './components/IndiceImpactoFinanceiroSection';
import { AbsenteismoGeralSection } from './components/AbsenteismoGeralSection';
import { DiasSemanaDemograficoSection } from './components/DiasSemanaDemograficoSection';
import { UnidadeSetorCargoSection } from './components/UnidadeSetorCargoSection';
import { GrupoPatologicoCidSection } from './components/GrupoPatologicoCidSection';
import { TabelaGeralAbsenteismo } from './components/TabelaGeralAbsenteismo';
import type { AbsenteismoDashboardData } from './types';

export default function AbsenteismoPage() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { data, isLoading, isFetching, error, refetch } = useQuery<AbsenteismoDashboardData>({
    queryKey: ['absenteismo', dataInicio, dataFim],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      const res = await fetch(`${getDynamicNestUrl()}absenteismo/dashboard?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="dashboard-content min-h-screen bg-slate-50/50 py-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <DashboardPageHeader
          eyebrow="Dashboards"
          icon={UserX}
          title="Absenteísmo"
          subtitle="Acompanhe os indicadores de afastamentos, perdas e distribuição do absenteísmo."
          onRefresh={refetch}
          isRefreshing={isFetching}
        />

        {/* Error notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            Erro ao carregar dados de absenteísmo. Verifique a conexão com o servidor.
          </div>
        )}

        {/* 1: Header Branding + 6 KPIs do Topo */}
        <HeaderKpisAbsenteismo kpis={data?.kpis} isLoading={isLoading} />

        {/* 2: Análise de Índice de Absenteísmo e Impacto Financeiro */}
        <IndiceImpactoFinanceiroSection
          kpis={data?.kpis}
          porEmpresa={data?.porEmpresa}
          isLoading={isLoading}
        />

        {/* 3: Análise de Absenteísmo Geral (Período + Gênero F/M) */}
        <AbsenteismoGeralSection
          porMes={data?.porMes}
          atestadosFeminino={data?.kpis?.atestadosFeminino}
          atestadosMasculino={data?.kpis?.atestadosMasculino}
          isLoading={isLoading}
        />

        {/* 4: Dias Perdidos por Dia da Semana e Distribuição Demográfica */}
        <DiasSemanaDemograficoSection
          diasSemana={data?.diasPorDiaSemana}
          porFuncionario={data?.porFuncionario}
          porFaixaEtariaSexo={data?.porFaixaEtariaSexo}
          porFaixaDiasPerdidos={data?.porFaixaDiasPerdidos}
          isLoading={isLoading}
        />

        {/* 5: Detalhamento por Unidade, Setor e Cargo */}
        <UnidadeSetorCargoSection
          porUnidade={data?.porUnidade}
          porSetor={data?.porSetor}
          porCargo={data?.porCargo}
          isLoading={isLoading}
        />

        {/* 6: Análise de Absenteísmo por Grupo Patológico (CID e Treemap) */}
        <GrupoPatologicoCidSection
          porCid={data?.porCid}
          porCidGrupo={data?.porCidGrupo}
          isLoading={isLoading}
        />

        {/* 7: Tabela Geral Detalhada (12 Colunas) */}
        <TabelaGeralAbsenteismo
          data={data?.detalhes}
          total={data?.totalRegistros}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
