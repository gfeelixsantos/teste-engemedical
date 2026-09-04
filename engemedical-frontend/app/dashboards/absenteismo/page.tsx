'use client';

import { useQuery } from '@tanstack/react-query';
import { NEST_URL } from '@/config/constants';
import { logout } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { HeaderApp } from '@/components/shared/HeaderApp';
import { KpiCards } from './components/KpiCards';
import { EvolucaoMensal } from './components/EvolucaoMensal';
import { CustosEmpresa } from './components/CustosEmpresa';
import { CidsChart } from './components/CidsChart';
import { DetalhesTable } from './components/DetalhesTable';
import { AbsenteismoFilters } from './components/AbsenteismoFilters';
import type { AbsenteismoDashboardData } from './types';
import { useState } from 'react';

export default function AbsenteismoPage() {
  const router = useRouter();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { data, isLoading, error } = useQuery<AbsenteismoDashboardData>({
    queryKey: ['absenteismo', dataInicio, dataFim],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      const res = await fetch(`${NEST_URL}/absenteismo/dashboard?${params}`);
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
          <p className="text-gray-600">Erro ao carregar dados de absenteismo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderApp onLogout={handleLogout}>
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">
            Absenteismo
          </h1>
        </div>
      </HeaderApp>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Analise de Indice de Absenteismo e Impacto Financeiro
          </h1>
        </div>

        <KpiCards kpis={data?.kpis} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <EvolucaoMensal data={data?.porMes} />
          <CustosEmpresa data={data?.porEmpresa} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <CidsChart data={data?.porCid} />
          <AbsenteismoFilters
            empresas={data?.empresas || []}
            dataInicio={dataInicio}
            dataFim={dataFim}
            onDateChange={(ini, fim) => {
              setDataInicio(ini);
              setDataFim(fim);
            }}
          />
        </div>

        <div className="mt-6">
          <DetalhesTable data={data?.detalhes} total={data?.totalRegistros} />
        </div>
      </main>
    </div>
  );
}