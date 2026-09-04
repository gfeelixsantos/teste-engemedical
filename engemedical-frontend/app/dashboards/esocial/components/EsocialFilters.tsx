'use client';

import { Filter } from 'lucide-react';

interface Props {
  empresas: string[];
  eventos: string[];
  status: string[];
  dataInicio: string;
  dataFim: string;
  eventoFiltro: string;
  statusFiltro: string;
  onFilterChange: (dataInicio: string, dataFim: string, evento: string, status: string) => void;
}

export function EsocialFilters({
  empresas,
  eventos,
  status,
  dataInicio,
  dataFim,
  eventoFiltro,
  statusFiltro,
  onFilterChange,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicio</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => onFilterChange(e.target.value, dataFim, eventoFiltro, statusFiltro)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => onFilterChange(dataInicio, e.target.value, eventoFiltro, statusFiltro)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Evento</label>
          <select
            value={eventoFiltro}
            onChange={(e) => onFilterChange(dataInicio, dataFim, e.target.value, statusFiltro)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="Todos">Todos</option>
            {eventos.map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={statusFiltro}
            onChange={(e) => onFilterChange(dataInicio, dataFim, eventoFiltro, e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="Todos">Todos</option>
            {status.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {empresas.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            Empresas: {empresas.length} empresas no sistema
          </p>
        </div>
      )}
    </div>
  );
}