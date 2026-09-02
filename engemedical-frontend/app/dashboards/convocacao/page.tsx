'use client';

import { useQuery } from '@tanstack/react-query';
import { NEST_URL } from '@/config/constants';
import { ConvocacaoDashboard } from './components/ConvocacaoDashboard';
import EngemedicalLoading from '@/components/shared/EngemedicalLoading';

async function fetchDashboard() {
  const res = await fetch(`${NEST_URL}convocacao/dashboard`);
  if (!res.ok) throw new Error('Erro ao buscar dados do dashboard');
  return res.json();
}

export default function ConvocacaoPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['convocacao-dashboard'],
    queryFn: fetchDashboard,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <EngemedicalLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-500">Erro ao carregar dados do dashboard</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return <ConvocacaoDashboard data={data} onRefresh={() => refetch()} />;
}
