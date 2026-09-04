'use client';

import { useQuery } from '@tanstack/react-query';
import { NEST_URL } from '@/config/constants';
import { logout } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HeaderApp } from '@/components/shared/HeaderApp';
import KpiCards from './components/KpiCards';
import CustoPorVida from './components/CustoPorVida';
import VidasPorProduto from './components/VidasPorProduto';
import VidasPorEmpresa from './components/VidasPorEmpresa';
import RegistrosTable from './components/RegistrosTable';
import VidasFilters from './components/VidasFilters';
import type { VidasDashboardData } from './types';

export default function VidasPage() {
  const router = useRouter();
  const [empresaSel, setEmpresaSel] = useState('');
  const [produtoSel, setProdutoSel] = useState('');

  const { data, isLoading, error } = useQuery<VidasDashboardData>({
    queryKey: ['vidas-dashboard'],
    queryFn: async () => {
      const res = await fetch(`${NEST_URL}/vidas/dashboard`);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Filtrar registros
  const filteredRegistros = data?.registros?.filter((r) => {
    if (empresaSel && r.empresa !== empresaSel) return false;
    if (produtoSel && r.produto !== produtoSel) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderApp onLogout={handleLogout} />

      <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">Gestão de Vidas</h1>
          <p className="text-sm text-gray-500 mt-1">Monitoramento de vidas ativas, custos e consistência cadastral</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            Erro ao carregar dados. Verifique o backend e tente novamente.
          </div>
        )}

        {/* KPIs */}
        <KpiCards kpis={data?.kpis} />

        {/* Filters */}
        <VidasFilters
          empresas={data?.filtros?.empresas || []}
          produtos={data?.filtros?.produtos || []}
          empresaSel={empresaSel}
          produtoSel={produtoSel}
          onChange={(e, p) => { setEmpresaSel(e); setProdutoSel(p); }}
        />

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustoPorVida data={data?.custoPorVida} />
          <VidasPorProduto data={data?.vidasPorProduto} />
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VidasPorEmpresa data={data?.vidasPorEmpresa} />
        </div>

        {/* Table */}
        <RegistrosTable data={filteredRegistros} />

        {/* Footer */}
        {data?.meta && (
          <div className="text-xs text-gray-400 text-right">
            Fonte: {data.meta.fonte} | Base: {new Date(data.meta.dataBase).toLocaleString('pt-BR')}
          </div>
        )}
      </main>
    </div>
  );
}
