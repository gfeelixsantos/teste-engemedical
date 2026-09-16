'use client';

import { X } from 'lucide-react';
import type { SituacaoExame } from '../types';

interface Props {
  empresas: string[];
  situacoes: SituacaoExame[];
  exames: string[];
  filtroEmpresa: string;
  filtroSituacao: string;
  filtroExame: string;
  onEmpresaChange: (v: string) => void;
  onSituacaoChange: (v: string) => void;
  onExameChange: (v: string) => void;
  onClear: () => void;
}

export function ConvocacaoFilters({
  empresas,
  situacoes,
  exames,
  filtroEmpresa,
  filtroSituacao,
  filtroExame,
  onEmpresaChange,
  onSituacaoChange,
  onExameChange,
  onClear,
}: Props) {
  const hasFilter = filtroEmpresa || filtroSituacao || filtroExame;

  return (
    <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Filtros:</span>

        <select
          value={filtroEmpresa}
          onChange={(e) => onEmpresaChange(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <option value="">Todas as empresas</option>
          {empresas.map((emp) => (
            <option key={emp} value={emp}>{emp}</option>
          ))}
        </select>

        <select
          value={filtroSituacao}
          onChange={(e) => onSituacaoChange(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <option value="">Todas as situações</option>
          {situacoes.map((sit) => (
            <option key={sit} value={sit}>{sit}</option>
          ))}
        </select>

        <select
          value={filtroExame}
          onChange={(e) => onExameChange(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 max-w-[200px]"
        >
          <option value="">Todos os exames</option>
          {exames.map((ex) => (
            <option key={ex} value={ex}>{ex}</option>
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
  );
}
