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
import { ComparativoEmpresas } from './components/ComparativoEmpresas';
import { NaoConcluidosEmpresa } from './components/NaoConcluidosEmpresa';
import { StatusPorMes } from './components/StatusPorMes';
import { EsocialFilters } from './components/EsocialFilters';
import type { EsocialDashboardData } from './types';
import { useState } from 'react';

export default function EsocialPage() {
  const router = useRouter();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { data, isLoading, error } = useQuery<EsocialDashboardData>({
    queryKey: ['esocial', dataInicio, dataFim],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
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
          <p className="text-sm text-gray-500 mt-1">
            Fonte: SOC Exporta Dados 186601 - Eventos eSocial
          </p>
        </div>

        <KpiCards kpis={data?.kpis} />

        <div className="mt-6">
          <EsocialFilters
            empresas={data?.filtros?.empresas || []}
            layouts={data?.filtros?.layouts || []}
            status={data?.filtros?.status || []}
            dataInicio={dataInicio}
            dataFim={dataFim}
            onFilterChange={(ini, fim) => {
              setDataInicio(ini);
              setDataFim(fim);
            }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <StatusXmlChart data={data?.charts?.por_status} />
          <EventosDonut data={data?.charts?.por_layout} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <EvolucaoMensal data={data?.charts?.por_mes} />
          <StatusPorMes data={data?.charts?.por_mes_status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <ComparativoEmpresas data={data?.charts?.por_empresa} />
          <NaoConcluidosEmpresa data={data?.charts?.por_empresa_status} />
        </div>
      </main>
    </div>
  );
}