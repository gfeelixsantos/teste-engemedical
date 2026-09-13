'use client';

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RegistroDocumento } from '../types';

interface DetalhamentoTableProps {
  data?: RegistroDocumento[];
}

const FALLBACK_DATA: RegistroDocumento[] = [
  {
    codigoEmpresa: '1',
    empresa: 'PROTECTA MANEJO INTEGRADO DE PRAGAS LTDA',
    codigoUnidade: '001',
    unidade: '001 - PROTECTA MATRIZ CE - 08.639.527/0001-72',
    cnpj: '08.639.527/0001-72',
    produto: 'PCMSO - MATRIZ',
    tipoDocumento: 'PCMSO',
    dataVencimento: '11/01/2023',
    situacao: 'Ativo',
    vigenciaContrato: 'Vencido',
    ultimaEntrega: '11/01/2023',
    previsao: '11/01/2023',
    observacao: 'nan',
    grauRisco: '',
    cidade: '',
    estado: '',
  },
  {
    codigoEmpresa: '1',
    empresa: 'PROTECTA MANEJO INTEGRADO DE PRAGAS LTDA',
    codigoUnidade: '001',
    unidade: '001 - PROTECTA MATRIZ CE - 08.639.527/0001-72',
    cnpj: '08.639.527/0001-72',
    produto: 'PGR - MATRIZ',
    tipoDocumento: 'PGR',
    dataVencimento: '11/01/2024',
    situacao: 'Ativo',
    vigenciaContrato: 'Vigente',
    ultimaEntrega: '10/01/2024',
    previsao: '10/01/2024',
    observacao: 'Documento renovado',
    grauRisco: '',
    cidade: '',
    estado: '',
  },
  {
    codigoEmpresa: '1',
    empresa: 'PROTECTA MANEJO INTEGRADO DE PRAGAS LTDA',
    codigoUnidade: '002',
    unidade: '002 - PROTECTA BA - 08.639.527/0002-53',
    cnpj: '08.639.527/0002-53',
    produto: 'PCMSO - MATRIZ',
    tipoDocumento: 'PCMSO',
    dataVencimento: '11/10/2023',
    situacao: 'Ativo',
    vigenciaContrato: 'Vencido',
    ultimaEntrega: '10/01/2024',
    previsao: '10/01/2024',
    observacao: 'Documento Renovado',
    grauRisco: '',
    cidade: '',
    estado: '',
  },
  {
    codigoEmpresa: '1',
    empresa: 'PROTECTA MANEJO INTEGRADO DE PRAGAS LTDA',
    codigoUnidade: '002',
    unidade: '002 - PROTECTA BA - 08.639.527/0002-53',
    cnpj: '08.639.527/0002-53',
    produto: 'PGR - MATRIZ',
    tipoDocumento: 'PGR',
    dataVencimento: '11/01/2024',
    situacao: 'Ativo',
    vigenciaContrato: 'Vigente',
    ultimaEntrega: '10/01/2024',
    previsao: '10/01/2024',
    observacao: 'Documento renovado',
    grauRisco: '',
    cidade: '',
    estado: '',
  },
];

const STATUS_BADGE: Record<string, string> = {
  Vigente: 'text-green-700 bg-green-50 border-green-200',
  AVencer: 'text-amber-700 bg-amber-50 border-amber-200',
  Vencido: 'text-red-700 bg-red-50 border-red-200',
};

const DOC_BADGE: Record<string, string> = {
  PGR: 'text-blue-700 bg-blue-50 border-blue-200',
  PCMSO: 'text-purple-700 bg-purple-50 border-purple-200',
  Outro: 'text-gray-700 bg-gray-50 border-gray-200',
};

export default function DetalhamentoDocumentosTable({ data }: DetalhamentoTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  const rows = (data && data.length > 0) ? data : FALLBACK_DATA;

  const filtered = rows.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.empresa?.toLowerCase().includes(term) ||
      r.unidade?.toLowerCase().includes(term) ||
      r.produto?.toLowerCase().includes(term) ||
      r.tipoDocumento?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">
          Detalhamento dos Documentos
        </h2>
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar empresa, unidade ou documento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200">
            <tr>
              <th className="py-3 px-3">Contratante</th>
              <th className="py-3 px-3">Unidade</th>
              <th className="py-3 px-2">Documento</th>
              <th className="py-3 px-2">Status</th>
              <th className="py-3 px-2">Vigência Contrato</th>
              <th className="py-3 px-2">Vencimento</th>
              <th className="py-3 px-2">Última Entrega</th>
              <th className="py-3 px-2">Previsão</th>
              <th className="py-3 px-3">Observação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {visible.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-2.5 px-3 font-medium text-gray-900 max-w-[180px] truncate">{r.empresa}</td>
                <td className="py-2.5 px-3 max-w-[180px] truncate text-gray-600">{r.unidade}</td>
                <td className="py-2.5 px-2">
                  <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${DOC_BADGE[r.tipoDocumento] || DOC_BADGE.Outro}`}>
                    {r.produto || r.tipoDocumento}
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  <span className="inline-block px-2 py-0.5 rounded border text-[10px] font-semibold bg-teal-50 text-teal-700 border-teal-200">
                    {r.situacao || 'Ativo'}
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${STATUS_BADGE[r.vigenciaContrato] || 'text-gray-700 bg-gray-50 border-gray-200'}`}>
                    {r.vigenciaContrato === 'AVencer' ? 'À Vencer' : r.vigenciaContrato || 'Vigente'}
                  </span>
                </td>
                <td className="py-2.5 px-2 whitespace-nowrap font-mono text-gray-600">{r.dataVencimento || '—'}</td>
                <td className="py-2.5 px-2 whitespace-nowrap text-gray-600">{r.ultimaEntrega || '—'}</td>
                <td className="py-2.5 px-2 whitespace-nowrap text-gray-600">{r.previsao || '—'}</td>
                <td className="py-2.5 px-3 max-w-[180px] truncate text-gray-500 italic">{r.observacao || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>
            Exibindo {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded border border-gray-200 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-700">{page + 1} / {totalPages}</span>
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
