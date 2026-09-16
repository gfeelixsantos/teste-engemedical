'use client';

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProfissionalRegistroItem } from '../types';

interface Props {
  data?: ProfissionalRegistroItem[];
  isLoading?: boolean;
}

const FALLBACK_REGISTROS: ProfissionalRegistroItem[] = [
  {
    empresa: '3C SERVICES S A',
    sequencialSituacaoDivergente: 'Correto',
    verificacaoDuplicidade: 'Registro Correto',
    nome: 'FRANCISCO TIAGO FELIX DE OLIVEIRA',
    sequencialFicha: '0',
    dataCompromisso: '07/01/2026',
    dataFicha: '07/01/2026',
    dataExame: '07/01/2026',
    situacao: 'Aguardando Atendimento',
    horaInicio: '08:00',
    statusSituacao: 'Aguardando Atendimento',
    tipoCompromisso: 'PERIODICO',
    exame: 'EXAME NAO LANCADO',
  },
  {
    empresa: '3C SERVICES S A',
    sequencialSituacaoDivergente: 'Correto',
    verificacaoDuplicidade: 'Registro Correto',
    nome: 'HELENA SANTANA MAGALHAES',
    sequencialFicha: '0',
    dataCompromisso: '07/01/2026',
    dataFicha: '07/01/2026',
    dataExame: '07/01/2026',
    situacao: 'Aguardando Atendimento',
    horaInicio: '08:15',
    statusSituacao: 'Aguardando Atendimento',
    tipoCompromisso: 'PERIODICO',
    exame: 'EXAME NAO LANCADO',
  },
  {
    empresa: '3C SERVICES S A',
    sequencialSituacaoDivergente: 'Correto',
    verificacaoDuplicidade: 'Registro Duplicado',
    nome: 'ANTONIO SILVA DE SOUSA',
    sequencialFicha: '335534224',
    dataCompromisso: '09/01/2026',
    dataFicha: '09/01/2026',
    dataExame: '09/01/2026',
    situacao: 'Aguardando Atendimento',
    horaInicio: '08:00',
    statusSituacao: 'Aguardando Atendimento',
    tipoCompromisso: 'PERIODICO',
    exame: 'EXAME NAO LANCADO',
  },
  {
    empresa: '3C SERVICES S A',
    sequencialSituacaoDivergente: 'Correto',
    verificacaoDuplicidade: 'Registro Duplicado',
    nome: 'JOSE RIBAMAR DO NASCIMENTO COSTA',
    sequencialFicha: '335534590',
    dataCompromisso: '09/01/2026',
    dataFicha: '09/01/2026',
    dataExame: '09/01/2026',
    situacao: 'Aguardando Atendimento',
    horaInicio: '08:30',
    statusSituacao: 'Aguardando Atendimento',
    tipoCompromisso: 'PERIODICO',
    exame: 'EXAME NAO LANCADO',
  },
  {
    empresa: '3C SERVICES S A',
    sequencialSituacaoDivergente: 'Correto',
    verificacaoDuplicidade: 'Registro Duplicado',
    nome: 'RAIMUNDO EDNARDO MELO',
    sequencialFicha: '335534823',
    dataCompromisso: '09/01/2026',
    dataFicha: '09/01/2026',
    dataExame: '09/01/2026',
    situacao: 'Aguardando Atendimento',
    horaInicio: '08:15',
    statusSituacao: 'Aguardando Atendimento',
    tipoCompromisso: 'PERIODICO',
    exame: 'EXAME NAO LANCADO',
  },
  {
    empresa: 'GRUPO TORA',
    sequencialSituacaoDivergente: 'Correto',
    verificacaoDuplicidade: 'Registro Correto',
    nome: 'ANDRESSA MARTINS DA SILVA',
    sequencialFicha: '335752442',
    dataCompromisso: '26/05/2026',
    dataFicha: '26/05/2026',
    dataExame: '26/05/2026',
    situacao: 'Aguardando Atendimento',
    horaInicio: '08:00',
    statusSituacao: 'Aguardando Atendimento',
    tipoCompromisso: 'ADMISSIONAL',
    exame: 'EXAME NAO LANCADO',
  },
  {
    empresa: 'GRUPO TORA',
    sequencialSituacaoDivergente: 'Correto',
    verificacaoDuplicidade: 'Registro Correto',
    nome: 'CAIQUE SOARES DE ARRUDA',
    sequencialFicha: '331304309',
    dataCompromisso: '10/06/2026',
    dataFicha: '10/06/2026',
    dataExame: '10/06/2026',
    situacao: 'Não Atendido',
    horaInicio: '07:30',
    statusSituacao: 'Não Atendido',
    tipoCompromisso: 'PERIODICO',
    exame: 'EXAME NAO LANCADO',
  },
  {
    empresa: 'GRUPO TORA',
    sequencialSituacaoDivergente: 'Correto',
    verificacaoDuplicidade: 'Registro Correto',
    nome: 'DANUBIA REIS RESENDE CRUZ',
    sequencialFicha: '0',
    dataCompromisso: '02/06/2026',
    dataFicha: '02/06/2026',
    dataExame: '02/06/2026',
    situacao: 'Não Atendido',
    horaInicio: '07:00',
    statusSituacao: 'Não Atendido',
    tipoCompromisso: 'RETORNO AO TRABALHO',
    exame: 'EXAME NAO LANCADO',
  },
  {
    empresa: 'GRUPO TORA',
    sequencialSituacaoDivergente: 'Correto',
    verificacaoDuplicidade: 'Registro Correto',
    nome: 'DIOGO MENDES D COSTA FERNANDES',
    sequencialFicha: '370408577',
    dataCompromisso: '31/03/2026',
    dataFicha: '31/03/2026',
    dataExame: '31/03/2026',
    situacao: 'Não Atendido',
    horaInicio: '08:00',
    statusSituacao: 'Não Atendido',
    tipoCompromisso: 'ADMISSIONAL',
    exame: 'EXAME NAO LANCADO',
  },
];

export function DadosGeraisProfissionaisTable({ data, isLoading }: Props) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroDivergente, setFiltroDivergente] = useState('Todos');
  const [filtroDuplicidade, setFiltroDuplicidade] = useState('Todos');
  const PAGE_SIZE = 10;

  const rows = (data && data.length > 0) ? data : FALLBACK_REGISTROS;

  const filtered = rows.filter((r) => {
    if (filtroStatus !== 'Todos' && r.statusSituacao !== filtroStatus) return false;
    if (filtroDivergente !== 'Todos' && r.sequencialSituacaoDivergente !== filtroDivergente) return false;
    if (filtroDuplicidade !== 'Todos' && r.verificacaoDuplicidade !== filtroDuplicidade) return false;

    if (!search) return true;
    const term = search.toLowerCase();
    return (
      r.empresa?.toLowerCase().includes(term) ||
      r.nome?.toLowerCase().includes(term) ||
      r.tipoCompromisso?.toLowerCase().includes(term) ||
      r.exame?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-md p-6 mb-4 h-[350px] animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-md p-6 mb-4">
      <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide text-center mb-6">
        Dados Gerais de Agendamentos
      </h2>

      {/* 4 Filtros de topo (Status, Sequencial Divergente, Duplicidade, Funcionários/Busca) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-gray-100">
        <div>
          <label className="text-[11px] font-bold text-gray-600 uppercase block mb-1">Status da Situação</label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="Todos">Todos</option>
            <option value="Aguardando Atendimento">Aguardando Atendimento</option>
            <option value="Não Atendido">Não Atendido</option>
            <option value="Atendido">Atendido</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-600 uppercase block mb-1">Sequencial Divergente</label>
          <select
            value={filtroDivergente}
            onChange={(e) => setFiltroDivergente(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="Todos">Todos</option>
            <option value="Correto">Correto</option>
            <option value="Divergente">Divergente</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-600 uppercase block mb-1">Verificação de Duplicidade</label>
          <select
            value={filtroDuplicidade}
            onChange={(e) => setFiltroDuplicidade(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="Todos">Todos</option>
            <option value="Registro Correto">Registro Correto</option>
            <option value="Registro Duplicado">Registro Duplicado</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-600 uppercase block mb-1">Funcionários / Busca</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 p-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Tabela de Dados Gerais */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs text-left">
          <thead className="bg-brand-700 text-white font-bold border-b border-brand-800">
            <tr>
              <th className="py-2.5 px-3">Empresa</th>
              <th className="py-2.5 px-2">Sequencial com Situação Divergente</th>
              <th className="py-2.5 px-2">Verificação de Duplicidade do Registro</th>
              <th className="py-2.5 px-3">Nome</th>
              <th className="py-2.5 px-2">Sequencial Ficha</th>
              <th className="py-2.5 px-2">Data do Compromisso</th>
              <th className="py-2.5 px-2">Data da Ficha</th>
              <th className="py-2.5 px-2">Data do Exame</th>
              <th className="py-2.5 px-2">Situação</th>
              <th className="py-2.5 px-2">Hora Início</th>
              <th className="py-2.5 px-2">Status da Situação</th>
              <th className="py-2.5 px-2">Tipo de Compromisso</th>
              <th className="py-2.5 px-3">Exame</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {visible.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-2 px-3 font-semibold text-gray-900">{r.empresa}</td>
                <td className="py-2 px-2 text-gray-600">{r.sequencialSituacaoDivergente}</td>
                <td className="py-2 px-2 text-gray-600">{r.verificacaoDuplicidade}</td>
                <td className="py-2 px-3 font-bold text-gray-900">{r.nome}</td>
                <td className="py-2 px-2 font-mono">{r.sequencialFicha}</td>
                <td className="py-2 px-2 font-mono text-[11px]">{r.dataCompromisso}</td>
                <td className="py-2 px-2 font-mono text-[11px]">{r.dataFicha}</td>
                <td className="py-2 px-2 font-mono text-[11px]">{r.dataExame}</td>
                <td className="py-2 px-2">{r.situacao}</td>
                <td className="py-2 px-2 font-mono">{r.horaInicio}</td>
                <td className="py-2 px-2 font-semibold">
                  {r.statusSituacao === 'Não Atendido' ? (
                    <span className="text-red-600 flex items-center gap-1">❌ Não Atendido</span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1">🟡 Aguardando Atendimento</span>
                  )}
                </td>
                <td className="py-2 px-2 font-semibold text-gray-800">{r.tipoCompromisso}</td>
                <td className="py-2 px-3 text-gray-600">{r.exame}</td>
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
