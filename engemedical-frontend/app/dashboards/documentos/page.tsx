'use client';

import { useQuery } from '@tanstack/react-query';
import { NEST_URL } from '@/config/constants';
import { logout } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HeaderApp } from '@/components/shared/HeaderApp';
import KpiCards from './components/KpiCards';
import VigenciaGeralDonut from './components/VigenciaGeralDonut';
import DocumentosPorTipo from './components/DocumentosPorTipo';
import VigenciaPorUnidade from './components/VigenciaPorUnidade';
import DetalhamentoTable from './components/DetalhamentoTable';
import DocumentosFilters from './components/DocumentosFilters';
import type { DocumentosDashboardData } from './types';

export default function DocumentosPage() {
  const router = useRouter();
  const [empresaSel, setEmpresaSel] = useState('');
  const [unidadeSel, setUnidadeSel] = useState('');
  const [tipoSel, setTipoSel] = useState('');

  const { data, isLoading, error } = useQuery<DocumentosDashboardData>({
    queryKey: ['documentos-dashboard'],
    queryFn: async () => {
      const res = await fetch(`${NEST_URL}/documentos/dashboard`);
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
    if (unidadeSel && r.unidade !== unidadeSel) return false;
    if (tipoSel && r.tipoDocumento !== tipoSel) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderApp onLogout={handleLogout} />

      <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">Documentos SST</h1>
          <p className="text-sm text-gray-500 mt-1">Controle de vencimento de documentos PGR e PCMSO</p>
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
        <DocumentosFilters
          empresas={data?.filtros?.empresas || []}
          unidades={data?.filtros?.unidades || []}
          tipos={data?.filtros?.tipos || []}
          empresaSel={empresaSel}
          unidadeSel={unidadeSel}
          tipoSel={tipoSel}
          onChange={(e, u, t) => { setEmpresaSel(e); setUnidadeSel(u); setTipoSel(t); }}
        />

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VigenciaGeralDonut data={data?.vigenciaGeral} />
          <DocumentosPorTipo data={data?.vigenciaPorTipo} />
        </div>

        {/* Charts row 2 */}
        <VigenciaPorUnidade data={data?.vigenciaPorUnidade} title="Vigência por Unidade" />

        {/* Table */}
        <DetalhamentoTable data={filteredRegistros} />

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
