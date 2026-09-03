'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import type { SituacaoCompromisso } from '../types';

interface Props {
  agendas: { codigo: string; nome: string }[];
  empresas: string[];
  tiposCompromisso: string[];
}

export function Filters({ agendas, empresas, tiposCompromisso }: Props) {
  const [filters, setFilters] = useState({
    agenda: '',
    empresa: '',
    tipo: '',
    situacao: '' as SituacaoCompromisso | '',
  });

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const handleClear = () => {
    setFilters({ agenda: '', empresa: '', tipo: '', situacao: '' });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">Filtros</span>
        </div>

        <select
          value={filters.agenda}
          onChange={(e) => setFilters((f) => ({ ...f, agenda: e.target.value }))}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1 bg-white"
        >
          <option value="">Todas as agendas</option>
          {agendas.map((a) => (
            <option key={a.codigo} value={a.codigo}>
              {a.nome}
            </option>
          ))}
        </select>

        <select
          value={filters.empresa}
          onChange={(e) => setFilters((f) => ({ ...f, empresa: e.target.value }))}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1 bg-white"
        >
          <option value="">Todas as empresas</option>
          {empresas.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <select
          value={filters.tipo}
          onChange={(e) => setFilters((f) => ({ ...f, tipo: e.target.value }))}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1 bg-white"
        >
          <option value="">Todos os tipos</option>
          {tiposCompromisso.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}