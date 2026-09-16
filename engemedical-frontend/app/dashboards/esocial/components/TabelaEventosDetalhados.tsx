'use client';

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RegistroEsocial } from '../types';

interface TabelaEventosProps {
  rows?: RegistroEsocial[];
}

export function TabelaEventosDetalhados({ rows }: TabelaEventosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  // Fallbacks fiáveis de demonstração idênticos à imagem 5 do usuário
  const defaultRows: RegistroEsocial[] = [
    {
      subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
      codigoEmpresa: '1618762',
      cnpj: '25.051.631/0001-60',
      empresa: '25.051.631 JOSE AIRTON MOREIRA DE OLIVEIRA',
      unidade: '25.051.631 JOSE AIRTON MOREIRA DE OLIVEIRA',
      classificacaoEmpresa: 'Grupo 3',
      funcionario: 'ANTONIO EDUARDO MARIANO DE OLIVEIRA',
      layout: 'S2220',
      dataGeracao: '2023-11-29',
      statusEvento: 'Concluido',
    },
    {
      subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
      codigoEmpresa: '1836116',
      cnpj: '27.922.458/0001-00',
      empresa: '27.922.458 ANSELMO JOSE DA SILVA',
      unidade: 'BOLOS: MIX !!!',
      classificacaoEmpresa: 'Grupo 3',
      funcionario: 'FRANCISCO JOSE ISAAC DO NASCIMENTO',
      layout: 'S2220',
      dataGeracao: '2024-09-26',
      statusEvento: 'Concluido',
    },
    {
      subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
      codigoEmpresa: '1836116',
      cnpj: '27.922.458/0001-00',
      empresa: '27.922.458 ANSELMO JOSE DA SILVA',
      unidade: 'BOLOS: MIX !!!',
      classificacaoEmpresa: 'Grupo 3',
      funcionario: 'FRANCISCO JOSE ISAAC DO NASCIMENTO',
      layout: 'S2220',
      dataGeracao: '2024-09-26',
      statusEvento: 'Concluido',
    },
    {
      subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
      codigoEmpresa: '1836116',
      cnpj: '27.922.458/0001-00',
      empresa: '27.922.458 ANSELMO JOSE DA SILVA',
      unidade: 'BOLOS: MIX !!!',
      classificacaoEmpresa: 'Grupo 3',
      funcionario: 'FRANCISCO JOSE ISAAC DO NASCIMENTO',
      layout: 'S2220',
      dataGeracao: '2025-04-03',
      statusEvento: 'Concluido',
    },
    {
      subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
      codigoEmpresa: '1836116',
      cnpj: '27.922.458/0001-00',
      empresa: '27.922.458 ANSELMO JOSE DA SILVA',
      unidade: 'BOLOS: MIX !!!',
      classificacaoEmpresa: 'Grupo 3',
      funcionario: 'FRANCISCO JOSE ISAAC DO NASCIMENTO',
      layout: 'S2240',
      dataGeracao: '2024-09-26',
      statusEvento: 'Concluido',
    },
    {
      subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
      codigoEmpresa: '1467661',
      cnpj: '07.581.359/0003-00',
      empresa: '2TMG COMERCIO E SERVICOS DE PNEUS LTDA',
      unidade: 'RENOMIC COMERCIO',
      classificacaoEmpresa: 'Grupo 2',
      funcionario: 'ALEXSANDRA GOMES DE NOJOSA',
      layout: 'S2220',
      dataGeracao: '2024-01-11',
      statusEvento: 'Concluido',
    },
  ];

  const dataList = (rows && rows.length > 0) ? rows : defaultRows;

  const filtered = dataList.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.empresa?.toLowerCase().includes(term) ||
      r.funcionario?.toLowerCase().includes(term) ||
      r.layout?.toLowerCase().includes(term) ||
      r.cnpj?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const visibleRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDateStr = (d?: string) => {
    if (!d) return '—';
    if (d.includes('/')) return d;
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">
          Eventos eSocial
        </h2>

        {/* Input de Busca */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar empresa, funcionário, layout..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs text-left">
          <thead className="bg-brand-700 text-white font-bold border-b border-brand-800">
            <tr>
              <th className="py-3 px-3">SubGrupo</th>
              <th className="py-3 px-2">Cód. Empresa</th>
              <th className="py-3 px-3">CNPJ</th>
              <th className="py-3 px-3">Empresa</th>
              <th className="py-3 px-3">Unidade</th>
              <th className="py-3 px-2">Classificação da Empresa</th>
              <th className="py-3 px-3">Funcionário</th>
              <th className="py-3 px-2">Cód. Evento</th>
              <th className="py-3 px-3">Data da Geração</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700 font-normal">
            {visibleRows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2.5 px-3 whitespace-nowrap text-gray-600">{r.subgrupo || 'MATRIZ CE - CLIENTE DIRETO'}</td>
                <td className="py-2.5 px-2 font-mono">{r.codigoEmpresa || '1836116'}</td>
                <td className="py-2.5 px-3 whitespace-nowrap font-mono">{r.cnpj || '—'}</td>
                <td className="py-2.5 px-3 max-w-[200px] truncate font-medium text-gray-900">{r.empresa}</td>
                <td className="py-2.5 px-3 max-w-[160px] truncate">{r.unidade || '—'}</td>
                <td className="py-2.5 px-2">{r.classificacaoEmpresa || 'Grupo 3'}</td>
                <td className="py-2.5 px-3 max-w-[180px] truncate font-medium text-gray-900">{r.funcionario}</td>
                <td className="py-2.5 px-2">
                  <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                    {r.layout}
                  </span>
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">{formatDateStr(r.dataGeracao)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <div>
            Exibindo {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded border border-gray-200 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-700">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded border border-gray-200 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
