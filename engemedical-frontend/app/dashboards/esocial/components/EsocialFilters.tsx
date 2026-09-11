'use client';

import { Filter } from 'lucide-react';

interface Props {
  empresas: string[];
  layouts: string[];
  status: string[];
  dataInicio: string;
  dataFim: string;
  onFilterChange: (dataInicio: string, dataFim: string) => void;
}

export function EsocialFilters({
  dataInicio,
  dataFim,
  onFilterChange,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-5 h-5 text-gray-500" />
        <h3 className="text-base font-semibold text-gray-900">Filtros</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => onFilterChange(e.target.value, dataFim)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => onFilterChange(dataInicio, e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
