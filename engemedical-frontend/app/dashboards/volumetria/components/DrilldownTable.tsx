'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CompromissoDetalhe } from '../types';

interface Props {
  data: CompromissoDetalhe[];
}

const SITUACAO_COLORS: Record<string, string> = {
  Atendido: 'bg-green-100 text-green-700',
  'Não Atendido': 'bg-red-100 text-red-700',
  'Aguardando Atendimento': 'bg-amber-100 text-amber-700',
  Cancelado: 'bg-gray-100 text-gray-600',
  'Não Compareceu': 'bg-blue-100 text-blue-700',
};

export function DrilldownTable({ data }: Props) {
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil((data?.length || 0) / PAGE_SIZE);
  const pageData = data?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">
          Dados Detalhados ({data?.length || 0} registros)
        </h3>
        {totalPages > 1 && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-500">Página {page} de {totalPages}</span>
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              {[
                'Agenda',
                'Empresa',
                'Funcionário',
                'Tipo',
                'Data',
                'Hora',
                'Situação',
              ].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-1.5 max-w-[120px] truncate">{row.nomeAgenda}</td>
                <td className="px-3 py-1.5 max-w-[100px] truncate">{row.nomeEmpresa}</td>
                <td className="px-3 py-1.5 max-w-[140px] truncate font-medium">
                  {row.nomeFuncionario}
                </td>
                <td className="px-3 py-1.5">{row.tipoCompromissoNome || row.tipoCompromisso}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  {row.dataCompromisso ? new Date(row.dataCompromisso).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  {row.horaInicio || '—'}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      SITUACAO_COLORS[row.situacaoNome] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {row.situacaoNome}
                  </span>
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Nenhum registro encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState } from 'react';