'use client';

import { X } from 'lucide-react';
import type { SituacaoExame } from '../types';

interface Props {
  empresas: string[];
  situacoes: SituacaoExame[];
  filtroEmpresa: string;
  filtroSituacao: string;
  onEmpresaChange: (v: string) => void;
  onSituacaoChange: (v: string) => void;
  onClear: () => void;
}

export function ConvocacaoFilters({
  empresas,
  situacoes,
  filtroEmpresa,
  filtroSituacao,
  onEmpresaChange,
  onSituacaoChange,
  onClear,
}: Props) {
  const hasFilter = filtroEmpresa || filtroSituacao;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Filtros:</span>

        <select
          value={filtroEmpresa}
          onChange={(e) => onEmpresaChange(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <option value="">Todas as empresas</option>
          {empresas.map((emp) => (
            <option key={emp} value={emp}>
              {emp}
            </option>
          ))}
        </select>

        <select
          value={filtroSituacao}
          onChange={(e) => onSituacaoChange(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <option value="">Todas as situações</option>
          {situacoes.map((sit) => (
            <option key={sit} value={sit}>
              {sit}
            </option>
          ))}
        </select>

        {hasFilter && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            <X className="h-3 w-3" />
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
