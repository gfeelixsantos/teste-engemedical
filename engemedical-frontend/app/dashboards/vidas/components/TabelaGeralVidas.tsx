'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { VidasTabelaGeralItem } from '../types';
import { getDynamicNestUrl } from '@/config/constants';

export function TabelaGeralVidas() {
  const [data, setData] = useState<VidasTabelaGeralItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchTabela = async (p = 1, query = busca) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: '15',
        busca: query,
      });

      const res = await fetch(`${getDynamicNestUrl()}vidas/tabela-geral?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        setPage(json.page);
        setTotalPages(json.lastPage);
        setTotalRecords(json.total);
      }
    } catch (err) {
      console.error('Failed to fetch tabela geral vidas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabela(1, busca);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTabela(1, busca);
  };

  return (
    <div className="p-6 shadow-xs border border-gray-200 rounded-2xl bg-white space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-800">Tabela Geral</h2>
          <p className="text-xs text-gray-400 mt-0.5">Visão detalhada de consistência e produtos por colaborador</p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por Empresa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 text-xs h-9 w-[220px] rounded-lg border border-gray-200 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            className="text-xs h-9 px-4 py-2 font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Filtrar
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
            <tr>
              <th className="py-2.5 px-3 font-bold">Produto Empresa</th>
              <th className="py-2.5 px-3 font-bold">Consistência Produto x Ativação</th>
              <th className="py-2.5 px-3 font-bold">Situação</th>
              <th className="py-2.5 px-3 font-bold">Admissão</th>
              <th className="py-2.5 px-3 font-bold">Demissão</th>
              <th className="py-2.5 px-3 font-bold">Consistência da Ativação Colaborador</th>
              <th className="py-2.5 px-3 font-bold">SubGrupo</th>
              <th className="py-2.5 px-3 font-bold">Código</th>
              <th className="py-2.5 px-3 font-bold">Empresa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Carregando registros...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-2 px-3 text-gray-600">{item.produtoEmpresa}</td>
                  <td className="py-2 px-3 text-gray-700 font-medium">{item.consistenciaProdutoAtivacao}</td>
                  <td className="py-2 px-3 font-bold text-gray-800">{item.situacao}</td>
                  <td className="py-2 px-3 text-gray-600">{item.admissao}</td>
                  <td className="py-2 px-3 text-gray-500">{item.demissao || '-'}</td>
                  <td className="py-2 px-3 text-gray-600">{item.consistenciaAtivacaoColaborador}</td>
                  <td className="py-2 px-3 text-gray-500">{item.subgrupo}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-gray-500">{item.codigoEmpresa}</td>
                  <td className="py-2 px-3 font-semibold text-gray-800 max-w-[200px] truncate">{item.empresa}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
        <span>Total: <strong className="text-gray-800">{totalRecords.toLocaleString('pt-BR')}</strong> registros</span>
        <div className="flex items-center gap-2">
          <span>Página {page} de {totalPages}</span>
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => fetchTabela(page - 1)}
            className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => fetchTabela(page + 1)}
            className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
