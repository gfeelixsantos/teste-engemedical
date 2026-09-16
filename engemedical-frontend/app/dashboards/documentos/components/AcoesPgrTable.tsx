'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { AcoesPgrSectionData } from '../types';

export function AcoesPgrTable({ data }: { data?: AcoesPgrSectionData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const rows = data?.lista ?? [];
  const term = searchTerm.trim().toLocaleLowerCase('pt-BR');
  const filtered = useMemo(() => !term ? rows : rows.filter((row) =>
    [row.empresa, row.unidade, row.acao, row.situacao, row.categoria, row.responsavel]
      .some((value) => value.toLocaleLowerCase('pt-BR').includes(term))), [rows, term]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-md">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold text-slate-700">Detalhamento das Ações do PGR</h3>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar ação, empresa ou responsável..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-cyan-500" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[1050px] text-xs text-left">
          <thead className="bg-brand-700 font-bold text-white"><tr>{['Empresa', 'Unidade', 'Ação', 'Descrição', 'Anexos', 'Situação', 'Categoria', 'Prioridade', 'Período', 'Responsável', 'Perigos / Riscos'].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {filtered.map((row, index) => <tr key={`${row.empresa}-${row.acao}-${index}`} className="align-top hover:bg-slate-50"><td className="max-w-[150px] px-3 py-2.5 font-medium">{row.empresa}</td><td className="px-3 py-2.5">{row.unidade}</td><td className="max-w-[150px] px-3 py-2.5 font-medium">{row.acao}</td><td className="max-w-[270px] whitespace-pre-line px-3 py-2.5">{row.descricao}</td><td className="px-3 py-2.5">{row.anexos === '-' ? 'Não informado' : row.anexos}</td><td className="px-3 py-2.5">{row.situacao}</td><td className="px-3 py-2.5">{row.categoria}</td><td className="px-3 py-2.5">{row.prioridade}</td><td className="whitespace-nowrap px-3 py-2.5">{row.periodo}</td><td className="px-3 py-2.5">{row.responsavel}</td><td className="px-3 py-2.5">{row.perigosRiscos}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-right text-xs text-slate-400">Exibindo {filtered.length} de {rows.length} ações</p>
    </div>
  );
}
