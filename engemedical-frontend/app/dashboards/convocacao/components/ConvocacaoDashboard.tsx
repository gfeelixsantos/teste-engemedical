'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { HeaderApp } from '@/components/shared/HeaderApp';
import { logout } from '@/lib/utils';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { KpiCards } from './KpiCards';
import { SituacaoDonut } from './SituacaoDonut';
import { TemporalBarChart } from './TemporalBarChart';
import { TopEmpresasChart } from './TopEmpresasChart';
import { UnidadesChart } from './UnidadesChart';
import { DrilldownTable } from './DrilldownTable';
import { ConvocacaoFilters } from './ConvocacaoFilters';
import type { DashboardData, ConvocacaoExame, SituacaoExame } from '../types';

interface Props {
  data: DashboardData;
  onRefresh: () => void;
}

export function ConvocacaoDashboard({ data, onRefresh }: Props) {
  const router = useRouter();
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('');

  const detalhesFiltrados: ConvocacaoExame[] = data.detalhes.filter((d) => {
    if (filtroEmpresa && d.nomeEmpresa !== filtroEmpresa) return false;
    if (filtroSituacao && d.situacaoExame !== filtroSituacao) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <HeaderApp onLogout={logout}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboards')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Convocação de Exames
              </h1>
              <p className="text-xs text-gray-400">
                Última atualização:{' '}
                {new Date(data.kpis.ultimaAtualizacao).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </HeaderApp>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <KpiCards kpis={data.kpis} />
        </motion.div>

        {/* Row 2: Donut + Temporal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Situação dos Exames
            </h3>
            <SituacaoDonut data={data.porSituacao} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl border border-gray-200 p-4 lg:col-span-2"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Evolução Temporal
            </h3>
            <TemporalBarChart data={data.temporal} />
          </motion.div>
        </div>

        {/* Row 3: Top Empresas + Unidades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Top Empresas
            </h3>
            <TopEmpresasChart data={data.porEmpresa} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Unidades — Fora do Prazo
            </h3>
            <UnidadesChart data={data.porUnidade} />
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ConvocacaoFilters
            empresas={data.filtros.empresas}
            situacoes={data.filtros.situacoes}
            filtroEmpresa={filtroEmpresa}
            filtroSituacao={filtroSituacao}
            onEmpresaChange={setFiltroEmpresa}
            onSituacaoChange={setFiltroSituacao}
            onClear={() => {
              setFiltroEmpresa('');
              setFiltroSituacao('');
            }}
          />
        </motion.div>

        {/* Drilldown Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Detalhes ({detalhesFiltrados.length.toLocaleString('pt-BR')}{' '}
            registros)
          </h3>
          <DrilldownTable data={detalhesFiltrados} />
        </motion.div>
      </div>
    </div>
  );
}
