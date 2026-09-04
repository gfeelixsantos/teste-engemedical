'use client';

import { useQuery } from '@tanstack/react-query';
import { NEST_URL } from '@/config/constants';
import { logout } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { HeaderApp } from '@/components/shared/HeaderApp';
import { KpiCards } from './components/KpiCards';
import { StatusXmlChart } from './components/StatusXmlChart';
import { EventosDonut } from './components/EventosDonut';
import { EvolucaoMensal } from './components/EvolucaoMensal';
import { StatusPorMes } from './components/StatusPorMes';
import { ComparativoEmpresas } from './components/ComparativoEmpresas';
import { NaoConcluidosEmpresa } from './components/NaoConcluidosEmpresa';
import { MatrizDrilldown } from './components/MatrizDrilldown';
import { TabelaRegistros } from './components/TabelaRegistros';
import { EsocialFilters } from './components/EsocialFilters';
import type { EsocialDashboardData } from './types';
import { useState } from 'react';

export default function EsocialPage() {
  const router = useRouter();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [eventoFiltro, setEventoFiltro] = useState('Todos');
  const [statusFiltro, setStatusFiltro] = useState('Todos');

  const { data, isLoading, error } = useQuery<EsocialDashboardData>({
    queryKey: ['esocial', dataInicio, dataFim, eventoFiltro, statusFiltro],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      if (eventoFiltro && eventoFiltro !== 'Todos') params.set('evento', eventoFiltro);
      if (statusFiltro && statusFiltro !== 'Todos') params.set('status', statusFiltro);
      const res = await fetch(`${NEST_URL}/esocial/dashboard?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 max-w-md">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Erro</h2>
          <p className="text-gray-600">Erro ao carregar dados do eSocial</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderApp onLogout={handleLogout}>
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">eSocial</h1>
        </div>
      </HeaderApp>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Painel de Registros eSocial
          </h1>
        </div>

        <KpiCards kpis={data?.kpis} />

        <div className="mt-6">
          <StatusXmlChart data={data?.statusXml} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <EventosDonut data={data?.eventosDonut} />
          <EvolucaoMensal data={data?.evolucaoMensal} />
        </div>

        <div className="mt-6">
          <StatusPorMes data={data?.statusPorMes} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <ComparativoEmpresas data={data?.comparativoEmpresas} />
          <NaoConcluidosEmpresa data={data?.naoConcluidosEmpresa} />
        </div>

        <div className="mt-6">
          <EsocialFilters
            empresas={data?.empresas || []}
            eventos={data?.filtros?.eventos || []}
            status={data?.filtros?.status || []}
            dataInicio={dataInicio}
            dataFim={dataFim}
            eventoFiltro={eventoFiltro}
            statusFiltro={statusFiltro}
            onFilterChange={(ini, fim, ev, st) => {
              setDataInicio(ini);
              setDataFim(fim);
              setEventoFiltro(ev);
              setStatusFiltro(st);
            }}
          />
        </div>

        <div className="mt-6">
          <MatrizDrilldown matriz={data?.matriz} />
        </div>

        <div className="mt-6">
          <TabelaRegistros registros={data?.registros} total={data?.totalRegistros} />
        </div>
      </main>
    </div>
  );
}