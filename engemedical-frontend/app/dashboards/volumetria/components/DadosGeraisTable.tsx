'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { VolumetriaRegistroItem } from '../types';

interface DadosGeraisTableProps {
  agendaFiltro: string;
  statusFiltro: string;
}

export function DadosGeraisTable({ agendaFiltro, statusFiltro }: DadosGeraisTableProps) {
  const [data, setData] = useState<VolumetriaRegistroItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchEmpresa, setSearchEmpresa] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchRegistros = async (p = 1, emp = searchEmpresa) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(p),
        limit: '10',
        agenda: agendaFiltro,
        status: statusFiltro,
        empresa: emp,
      });

      const res = await fetch(`http://localhost:3333/volumetria/dados-gerais?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        setPage(json.page);
        setTotalPages(json.lastPage);
        setTotalRecords(json.total);
      }
    } catch (err) {
      console.error('Failed to fetch registros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros(1, searchEmpresa);
  }, [agendaFiltro, statusFiltro]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRegistros(1, searchEmpresa);
  };

  return (
    <div className="p-6 shadow-md border border-gray-200 rounded-2xl bg-white space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-800">Dados Gerais de Agendamentos</h2>
          <p className="text-xs text-gray-400 mt-0.5">Tabela analítica com o detalhamento individual dos agendamentos</p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por Empresa..."
              value={searchEmpresa}
              onChange={(e) => setSearchEmpresa(e.target.value)}
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
        <thead className="bg-brand-700 border-b border-brand-800 text-white">
            <tr>
              <th className="py-2.5 px-3 font-bold">Empresa</th>
              <th className="py-2.5 px-3 font-bold">Nome</th>
              <th className="py-2.5 px-3 font-bold">Ficha</th>
              <th className="py-2.5 px-3 font-bold">Compromisso</th>
              <th className="py-2.5 px-3 font-bold">Hora</th>
              <th className="py-2.5 px-3 font-bold">Situação</th>
              <th className="py-2.5 px-3 font-bold">Tipo</th>
              <th className="py-2.5 px-3 font-bold">Exame</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  Carregando registros...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-2 px-3 font-medium max-w-[180px] truncate text-gray-800">{item.empresa}</td>
                  <td className="py-2 px-3 max-w-[150px] truncate text-gray-700">{item.nome}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-gray-500">{item.sequencialFicha}</td>
                  <td className="py-2 px-3 text-gray-600">{item.dataCompromisso}</td>
                  <td className="py-2 px-3 font-mono text-gray-600">{item.horaInicio}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5 font-medium text-gray-700">
                      {item.statusSituacao.includes('Atendido') ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span>{item.statusSituacao}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 uppercase text-[11px] text-gray-600">{item.tipoCompromisso}</td>
                  <td className="py-2 px-3 max-w-[200px] truncate text-gray-500">{item.exame}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
        <span>Total: <strong className="text-gray-800">{totalRecords.toLocaleString('pt-BR')}</strong> registros</span>
        <div className="flex items-center gap-2">
          <span>Página {page} de {totalPages}</span>
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => fetchRegistros(page - 1)}
            className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => fetchRegistros(page + 1)}
            className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
