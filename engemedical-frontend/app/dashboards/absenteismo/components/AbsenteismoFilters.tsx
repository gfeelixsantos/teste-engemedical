'use client';

import { Filter } from 'lucide-react';

interface Props {
  empresas: string[];
  dataInicio: string;
  dataFim: string;
  onDateChange: (dataInicio: string, dataFim: string) => void;
}

export function AbsenteismoFilters({ empresas, dataInicio, dataFim, onDateChange }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Início
          </label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => onDateChange(e.target.value, dataFim)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Fim
          </label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => onDateChange(dataInicio, e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {empresas.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            Empresas: {empresas.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
