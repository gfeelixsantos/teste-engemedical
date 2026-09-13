'use client';

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LicencaNormalizada } from '../types';

interface TabelaGeralProps {
  data?: LicencaNormalizada[];
  total?: number;
  isLoading?: boolean;
}

const FALLBACK_ROWS: LicencaNormalizada[] = [
  {
    codigoSequencial: '1',
    codigoFuncionario: 'F01',
    cpfFuncionario: '',
    matriculaFuncionario: '',
    dataFicha: '',
    subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
    empresaNome: 'CREMEC',
    empresaCodigo: '1',
    unidade: 'CONSELHO REGIONAL DE MEDICINA DO ESTADO DO CEARA',
    setor: 'ALMOXARIFADO',
    cargo: 'ADMINISTRADOR',
    nomeFuncionario: 'MANOEL BRITO JUNIOR',
    situacao: 'Inativo',
    tipoAfastamento: 'Atestado de Dias',
    dataInicio: '05/02/2026',
    dataFim: '06/02/2026',
    diasPerdidos: 2,
    horasAfastado: '00:00:00',
    cid: 'Sem CID',
    cidGrupo: '',
    descricaoMotivo: '',
    custoDireto: 480,
    custoIndireto: 251,
    custoTotal: 731,
  },
  {
    codigoSequencial: '2',
    codigoFuncionario: 'F01',
    cpfFuncionario: '',
    matriculaFuncionario: '',
    dataFicha: '',
    subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
    empresaNome: 'CREMEC',
    empresaCodigo: '1',
    unidade: 'CONSELHO REGIONAL DE MEDICINA DO ESTADO DO CEARA',
    setor: 'ALMOXARIFADO',
    cargo: 'ADMINISTRADOR',
    nomeFuncionario: 'MANOEL BRITO JUNIOR',
    situacao: 'Inativo',
    tipoAfastamento: 'Atestado de Dias',
    dataInicio: '17/07/2026',
    dataFim: '17/07/2026',
    diasPerdidos: 1,
    horasAfastado: '00:00:00',
    cid: 'Sem CID',
    cidGrupo: '',
    descricaoMotivo: '',
    custoDireto: 240,
    custoIndireto: 125,
    custoTotal: 365,
  },
  {
    codigoSequencial: '3',
    codigoFuncionario: 'F02',
    cpfFuncionario: '',
    matriculaFuncionario: '',
    dataFicha: '',
    subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
    empresaNome: 'CREMEC',
    empresaCodigo: '1',
    unidade: 'CONSELHO REGIONAL DE MEDICINA DO ESTADO DO CEARA',
    setor: 'ALMOXARIFADO',
    cargo: 'ASSISTENTE ADMINISTRATIVO',
    nomeFuncionario: 'REGINA COELI MARTINS BATISTA',
    situacao: 'Ativo',
    tipoAfastamento: 'Atestado de Dias',
    dataInicio: '13/01/2026',
    dataFim: '13/01/2026',
    diasPerdidos: 1,
    horasAfastado: '00:00:00',
    cid: 'Sem CID',
    cidGrupo: '',
    descricaoMotivo: '',
    custoDireto: 240,
    custoIndireto: 125,
    custoTotal: 365,
  },
  {
    codigoSequencial: '4',
    codigoFuncionario: 'F02',
    cpfFuncionario: '',
    matriculaFuncionario: '',
    dataFicha: '',
    subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
    empresaNome: 'CREMEC',
    empresaCodigo: '1',
    unidade: 'CONSELHO REGIONAL DE MEDICINA DO ESTADO DO CEARA',
    setor: 'ALMOXARIFADO',
    cargo: 'ASSISTENTE ADMINISTRATIVO',
    nomeFuncionario: 'REGINA COELI MARTINS BATISTA',
    situacao: 'Ativo',
    tipoAfastamento: 'Atestado de Dias',
    dataInicio: '19/01/2026',
    dataFim: '19/01/2026',
    diasPerdidos: 1,
    horasAfastado: '00:00:00',
    cid: 'Sem CID',
    cidGrupo: '',
    descricaoMotivo: '',
    custoDireto: 240,
    custoIndireto: 125,
    custoTotal: 365,
  },
  {
    codigoSequencial: '5',
    codigoFuncionario: 'F02',
    cpfFuncionario: '',
    matriculaFuncionario: '',
    dataFicha: '',
    subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
    empresaNome: 'CREMEC',
    empresaCodigo: '1',
    unidade: 'CONSELHO REGIONAL DE MEDICINA DO ESTADO DO CEARA',
    setor: 'ALMOXARIFADO',
    cargo: 'ASSISTENTE ADMINISTRATIVO',
    nomeFuncionario: 'REGINA COELI MARTINS BATISTA',
    situacao: 'Ativo',
    tipoAfastamento: 'Atestado de Dias',
    dataInicio: '21/01/2026',
    dataFim: '21/01/2026',
    diasPerdidos: 1,
    horasAfastado: '00:00:00',
    cid: 'Sem CID',
    cidGrupo: '',
    descricaoMotivo: '',
    custoDireto: 240,
    custoIndireto: 125,
    custoTotal: 365,
  },
  {
    codigoSequencial: '6',
    codigoFuncionario: 'F02',
    cpfFuncionario: '',
    matriculaFuncionario: '',
    dataFicha: '',
    subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
    empresaNome: 'CREMEC',
    empresaCodigo: '1',
    unidade: 'CONSELHO REGIONAL DE MEDICINA DO ESTADO DO CEARA',
    setor: 'ALMOXARIFADO',
    cargo: 'ASSISTENTE ADMINISTRATIVO',
    nomeFuncionario: 'REGINA COELI MARTINS BATISTA',
    situacao: 'Ativo',
    tipoAfastamento: 'Atestado de Dias',
    dataInicio: '30/01/2026',
    dataFim: '30/01/2026',
    diasPerdidos: 1,
    horasAfastado: '00:00:00',
    cid: 'Sem CID',
    cidGrupo: '',
    descricaoMotivo: '',
    custoDireto: 240,
    custoIndireto: 125,
    custoTotal: 365,
  },
  {
    codigoSequencial: '7',
    codigoFuncionario: 'F02',
    cpfFuncionario: '',
    matriculaFuncionario: '',
    dataFicha: '',
    subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
    empresaNome: 'CREMEC',
    empresaCodigo: '1',
    unidade: 'CONSELHO REGIONAL DE MEDICINA DO ESTADO DO CEARA',
    setor: 'ALMOXARIFADO',
    cargo: 'ASSISTENTE ADMINISTRATIVO',
    nomeFuncionario: 'REGINA COELI MARTINS BATISTA',
    situacao: 'Ativo',
    tipoAfastamento: 'Atestado de Dias',
    dataInicio: '18/02/2026',
    dataFim: '20/02/2026',
    diasPerdidos: 3,
    horasAfastado: '00:00:00',
    cid: 'Sem CID',
    cidGrupo: '',
    descricaoMotivo: '',
    custoDireto: 720,
    custoIndireto: 376,
    custoTotal: 1096,
  },
  {
    codigoSequencial: '8',
    codigoFuncionario: 'F02',
    cpfFuncionario: '',
    matriculaFuncionario: '',
    dataFicha: '',
    subgrupo: 'MATRIZ CE - CLIENTE DIRETO',
    empresaNome: 'CREMEC',
    empresaCodigo: '1',
    unidade: 'CONSELHO REGIONAL DE MEDICINA DO ESTADO DO CEARA',
    setor: 'ALMOXARIFADO',
    cargo: 'ASSISTENTE ADMINISTRATIVO',
    nomeFuncionario: 'REGINA COELI MARTINS BATISTA',
    situacao: 'Ativo',
    tipoAfastamento: 'Atestado de Dias',
    dataInicio: '27/02/2026',
    dataFim: '27/02/2026',
    diasPerdidos: 1,
    horasAfastado: '00:00:00',
    cid: 'Sem CID',
    cidGrupo: '',
    descricaoMotivo: '',
    custoDireto: 240,
    custoIndireto: 125,
    custoTotal: 365,
  },
];

export function TabelaGeralAbsenteismo({ data, total, isLoading }: TabelaGeralProps) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const PAGE_SIZE = 12;

  const rows = (data && data.length > 0) ? data : FALLBACK_ROWS;

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      r.empresaNome?.toLowerCase().includes(term) ||
      r.nomeFuncionario?.toLowerCase().includes(term) ||
      r.cargo?.toLowerCase().includes(term) ||
      r.setor?.toLowerCase().includes(term) ||
      r.cid?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6 h-[300px] animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-bold text-gray-800 text-center sm:text-left uppercase tracking-wide">
          Tabela Geral
        </h2>
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar funcionário, cargo, setor ou CID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200">
            <tr>
              <th className="py-2.5 px-3">SubGrupo</th>
              <th className="py-2.5 px-2">Empresa</th>
              <th className="py-2.5 px-3">Unidade</th>
              <th className="py-2.5 px-2">Setor</th>
              <th className="py-2.5 px-3">Cargo</th>
              <th className="py-2.5 px-3">Funcionário</th>
              <th className="py-2.5 px-2">Situação</th>
              <th className="py-2.5 px-3">Tipo de Afastamento</th>
              <th className="py-2.5 px-2">Início do Atestado</th>
              <th className="py-2.5 px-2">Fim do Atestado</th>
              <th className="py-2.5 px-2 text-right">Dias Perdidos</th>
              <th className="py-2.5 px-2 text-center">Horas Afastado</th>
              <th className="py-2.5 px-2 text-center">CID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {visible.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-2 px-3 text-[11px] max-w-[140px] truncate text-gray-600">
                  {r.subgrupo || 'MATRIZ CE - CLIENTE DIRETO'}
                </td>
                <td className="py-2 px-2 font-semibold text-gray-900">{r.empresaNome || 'CREMEC'}</td>
                <td className="py-2 px-3 text-[11px] max-w-[160px] truncate text-gray-600">
                  {r.unidade || 'CONSELHO REGIONAL DE MEDICINA DO ESTADO DO CEARA'}
                </td>
                <td className="py-2 px-2 font-medium text-gray-800">{r.setor || 'ALMOXARIFADO'}</td>
                <td className="py-2 px-3 font-medium text-gray-800">{r.cargo || 'ASSISTENTE ADMINISTRATIVO'}</td>
                <td className="py-2 px-3 font-bold text-gray-900">{r.nomeFuncionario || 'FUNCIONARIO'}</td>
                <td className="py-2 px-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${r.situacao === 'Inativo' ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
                    {r.situacao || 'Ativo'}
                  </span>
                </td>
                <td className="py-2 px-3 text-gray-700">{r.tipoAfastamento || 'Atestado de Dias'}</td>
                <td className="py-2 px-2 font-mono text-gray-600 whitespace-nowrap">{r.dataInicio || '—'}</td>
                <td className="py-2 px-2 font-mono text-gray-600 whitespace-nowrap">{r.dataFim || '—'}</td>
                <td className="py-2 px-2 text-right font-extrabold text-teal-800">{r.diasPerdidos}</td>
                <td className="py-2 px-2 text-center font-mono text-gray-500">{r.horasAfastado || '00:00:00'}</td>
                <td className="py-2 px-2 text-center font-semibold text-gray-700">{r.cid || 'Sem CID'}</td>
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
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded border border-gray-200 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-700">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
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
