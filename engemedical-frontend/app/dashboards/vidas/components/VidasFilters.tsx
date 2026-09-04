'use client';

import { Filter } from 'lucide-react';

interface Props {
  empresas: string[];
  produtos: string[];
  empresaSel: string;
  produtoSel: string;
  onChange: (empresa: string, produto: string) => void;
}

export default function VidasFilters({ empresas, produtos, empresaSel, produtoSel, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Filter className="w-4 h-4 text-gray-400" />
      <select
        value={empresaSel}
        onChange={(e) => onChange(e.target.value, produtoSel)}
        className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-teal-500"
      >
        <option value="">Todas as Empresas</option>
        {empresas.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>
      <select
        value={produtoSel}
        onChange={(e) => onChange(empresaSel, e.target.value)}
        className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-teal-500"
      >
        <option value="">Todos os Produtos</option>
        {produtos.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      {(empresaSel || produtoSel) && (
        <button
          onClick={() => onChange('', '')}
          className="text-xs text-red-500 hover:text-red-700 underline"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
