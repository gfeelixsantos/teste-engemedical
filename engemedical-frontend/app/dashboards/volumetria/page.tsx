'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { HeaderApp } from '@/components/shared/HeaderApp';
import { logout } from '@/lib/utils';
import { VolumetriaKPIs } from './components/VolumetriaKPIs';
import { AgendamentosChart } from './components/AgendamentosChart';
import { SituacaoDonut } from './components/SituacaoDonut';
import { PorTipoChart } from './components/PorTipoChart';
import { TemporalLineChart } from './components/TemporalLineChart';
import { DrilldownTable } from './components/DrilldownTable';
import { Filters } from './components/Filters';
import type { VolumetriaDashboardData, PorSituacaoItem } from './types';
import { useQuery } from '@tanstack/react-query';
import { NEST_URL } from '@/config/constants';

/* ── Compute porSituacao from detalhes ── */
function aggregatePorSituacao(
  detalhes: VolumetriaDashboardData['detalhes'],
): PorSituacaoItem[] {
  const map: Record<string, number> = {};
  for (const d of detalhes) {
    const key = d.situacaoNome || 'AguardandoAtendimento';
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map).map(([situacao, quantidade]) => ({
    situacao,
    quantidade,
  }));
}

/* ── Skeleton loading ── */
function VolumetriaSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <HeaderApp onLogout={logout} />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {/* KPI skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[88px] rounded-xl border border-gray-200 bg-white animate-pulse"
            >
              <div className="flex items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-lg bg-gray-100" />
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                  <div className="h-6 w-16 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter skeleton */}
        <div className="h-12 rounded-xl border border-gray-200 bg-white animate-pulse" />

        {/* Charts row 1 skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-[340px] rounded-xl border border-gray-200 bg-white animate-pulse" />
          <div className="h-[340px] rounded-xl border border-gray-200 bg-white animate-pulse" />
        </div>

        {/* Charts row 2 skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-[340px] rounded-xl border border-gray-200 bg-white animate-pulse" />
          <div className="h-[340px] rounded-xl border border-gray-200 bg-white animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="h-[400px] rounded-xl border border-gray-200 bg-white animate-pulse" />
      </div>
    </div>
  );
}

export default function VolumetriaPage() {
  const searchParams = useSearchParams();
  const agendaParam = searchParams.get('agenda');
  const empresaParam = searchParams.get('empresa');
  const tipoParam = searchParams.get('tipo');
  const situacaoParam = searchParams.get('situacao');

  const { data, isLoading, error } = useQuery({
    queryKey: ['volumetria', agendaParam, empresaParam, tipoParam, situacaoParam],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (agendaParam) params.set('codigosAgenda', agendaParam);
      if (empresaParam) params.set('empresa', empresaParam);
      if (tipoParam) params.set('tipo', tipoParam);
      if (situacaoParam) params.set('situacao', situacaoParam);

      const res = await fetch(`${NEST_URL}volumetria/dashboard?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      return res.json() as Promise<VolumetriaDashboardData>;
    },
    refetchOnWindowFocus: false,
  });

  const porSituacao = useMemo(
    () => (data?.detalhes ? aggregatePorSituacao(data.detalhes) : []),
    [data?.detalhes],
  );

  if (isLoading) {
    return <VolumetriaSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-full">
        <HeaderApp onLogout={logout} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-red-500">Erro ao carregar dados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <HeaderApp onLogout={logout}>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          <h1 className="text-lg font-semibold">Volumetria de Agendamentos</h1>
        </div>
      </HeaderApp>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {/* ── TOP: 3 KPI Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <VolumetriaKPIs kpis={data.kpis} />
        </motion.div>

        {/* ── Filters ── */}
        <Filters
          agendas={data.filtros.agendas}
          empresas={data.filtros.empresas}
          tiposCompromisso={data.filtros.tiposCompromisso}
        />

        {/* ── ROW 2: Bar chart + Donut ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AgendamentosChart data={data.porAgenda} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Situação dos Compromissos
              </h3>
              <SituacaoDonut data={porSituacao} />
            </div>
          </motion.div>
        </div>

        {/* ── ROW 3: Bar chart + Line chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PorTipoChart data={data.porTipoCompromisso} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Evolução Mensal
              </h3>
              <TemporalLineChart data={data.porAno} />
            </div>
          </motion.div>
        </div>

        {/* ── TABLE: Empresas com Mais Compromissos ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DrilldownTable data={data.porEmpresa} />
        </motion.div>
      </div>
    </div>
  );
}
