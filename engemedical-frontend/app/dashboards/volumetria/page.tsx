'use client';

import { useSearchParams } from 'next/navigation';
import { Calendar, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { HeaderApp } from '@/components/shared/HeaderApp';
import { logout } from '@/lib/utils';
import { VolumetriaKPIs } from './components/VolumetriaKPIs';
import { AgendamentosChart } from './components/AgendamentosChart';
import { PorTipoChart } from './components/PorTipoChart';
import { TemporalLineChart } from './components/TemporalLineChart';
import { DrilldownTable } from './components/DrilldownTable';
import { Filters } from './components/Filters';
import type { VolumetriaDashboardData } from './types';
import { useQuery } from '@tanstack/react-query';
import { NEST_URL } from '@/config/constants';

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

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <HeaderApp onLogout={logout} />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-spin" />
            <p className="text-gray-500">Carregando volumetria...</p>
          </div>
        </div>
      </div>
    );
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
        {/* KPIs */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <VolumetriaKPIs kpis={data.kpis} />
        </motion.div>

        {/* Filtros */}
        <Filters
          agendas={data.filtros.agendas}
          empresas={data.filtros.empresas}
          tiposCompromisso={data.filtros.tiposCompromisso}
        />

        {/* Top cards: Agendamentos vs Atendidos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <AgendamentosChart data={data.porAgenda} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <PorTipoChart data={data.porTipoCompromisso} />
          </motion.div>
        </div>

        {/* LineChart Temporal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Evolução por Período
            </h3>
            <TemporalLineChart data={data.porAno} />
          </div>
        </motion.div>

        {/* Tabela Drilldown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <DrilldownTable data={data.detalhes || []} />
        </motion.div>
      </div>
    </div>
  );
}