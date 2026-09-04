'use client';

import { useState } from 'react';
import type { RegistroDocumento } from '../types';

interface Props {
  data?: RegistroDocumento[];
}

const PAGE_SIZE = 20;

const VIGENCIA_COLORS: Record<string, string> = {
  Vigente: 'bg-green-100 text-green-700',
  AVencer: 'bg-yellow-100 text-yellow-700',
  Vencido: 'bg-red-100 text-red-700',
};

const VIGENCIA_LABELS: Record<string, string> = {
  Vigente: 'Contrato Vigente',
  AVencer: 'A Vencer',
  Vencido: 'Contrato Vencido',
};

export default function DetalhamentoTable({ data }: Props) {
  const [page, setPage] = useState(0);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Detalhamento dos Documentos</h3>
        <div className="h-48 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const pageData = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Detalhamento dos Documentos ({data.length})</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            Anterior
          </button>
          <span>Página {page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            Próxima
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-medium text-gray-600">Contratante</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Unidade</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Documento</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Vigência Contrato</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Vencimento</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Última Entrega</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Previsão</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Observação</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 max-w-[180px] truncate" title={r.empresa}>{r.empresa}</td>
                <td className="px-3 py-2 max-w-[150px] truncate" title={r.unidade}>{r.unidade}</td>
                <td className="px-3 py-2 font-medium">{r.produto}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">
                    Ativo
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${VIGENCIA_COLORS[r.vigenciaContrato] || 'bg-gray-100 text-gray-700'}`}>
                    {VIGENCIA_LABELS[r.vigenciaContrato] || r.vigenciaContrato}
                  </span>
                </td>
                <td className="px-3 py-2">{r.dataVencimento}</td>
                <td className="px-3 py-2">{r.ultimaEntrega}</td>
                <td className="px-3 py-2">{r.previsao}</td>
                <td className="px-3 py-2 max-w-[150px] truncate" title={r.observacao}>{r.observacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
