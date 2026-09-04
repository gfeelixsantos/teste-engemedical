'use client';

import { Filter } from 'lucide-react';

interface Props {
  empresas: string[];
  unidades: string[];
  tipos: string[];
  empresaSel: string;
  unidadeSel: string;
  tipoSel: string;
  onChange: (empresa: string, unidade: string, tipo: string) => void;
}

export default function DocumentosFilters({ empresas, unidades, tipos, empresaSel, unidadeSel, tipoSel, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Filter className="w-4 h-4 text-gray-400" />
      <select
        value={empresaSel}
        onChange={(e) => onChange(e.target.value, unidadeSel, tipoSel)}
        className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-teal-500"
      >
        <option value="">Todas as Empresas</option>
        {empresas.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>
      <select
        value={unidadeSel}
        onChange={(e) => onChange(empresaSel, e.target.value, tipoSel)}
        className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-teal-500"
      >
        <option value="">Todas as Unidades</option>
        {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
      <select
        value={tipoSel}
        onChange={(e) => onChange(empresaSel, unidadeSel, e.target.value)}
        className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-teal-500"
      >
        <option value="">Todos os Tipos</option>
        {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      {(empresaSel || unidadeSel || tipoSel) && (
        <button
          onClick={() => onChange('', '', '')}
          className="text-xs text-red-500 hover:text-red-700 underline"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
