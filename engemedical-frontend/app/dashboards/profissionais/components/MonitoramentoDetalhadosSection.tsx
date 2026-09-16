'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type {
  ProfissionalEmpresaItem,
  ProfissionalSubgrupoItem,
  ProfissionalRegistroItem,
} from '../types';

interface Props {
  porEmpresa?: ProfissionalEmpresaItem[];
  porSubgrupo?: ProfissionalSubgrupoItem[];
  registros?: ProfissionalRegistroItem[];
  isLoading?: boolean;
}

const FALLBACK_SITUACAO = [
  { situacao: 'Não Atendido', quantidade: 16, color: '#dc2626' },
  { situacao: 'Aguardando Atendimento', quantidade: 8, color: '#086b94' },
];

const FALLBACK_EMPRESA: ProfissionalEmpresaItem[] = [
  { empresa: 'GRUPO TORA', quantidade: 17 },
  { empresa: '3C SERVICES S A', quantidade: 5 },
  { empresa: 'ORGAN CACCES RS EMBREAGEM LTDA ...', quantidade: 1 },
  { empresa: 'ORGANIZACOES RS EMBREAGEM LTDA ...', quantidade: 1 },
];

const FALLBACK_SUBGRUPO: ProfissionalSubgrupoItem[] = [
  { subgrupo: 'FILIAL CONTAGEM/MG - CLIENTE DIRETO', agendamentos: 19, atendimentos: 0 },
  { subgrupo: 'MATRIZ CE - CLIENTE DIRETO', agendamentos: 5, atendimentos: 0 },
];

const FALLBACK_REGISTROS = [
  {
    dataCompromisso: '06/01/2026',
    divergente: 'Correto',
    duplicidade: 'Registro Duplicado',
    ficha: '335534224',
    dataFicha: '07/01/2026',
    dataExame: '07/01/2026',
    situacao: 'Aguardando Atendimento',
    statusSituacao: 'Aguardando Atendimento',
  },
  {
    dataCompromisso: '06/01/2026',
    divergente: 'Correto',
    duplicidade: 'Registro Duplicado',
    ficha: '335534590',
    dataFicha: '07/01/2026',
    dataExame: '07/01/2026',
    situacao: 'Aguardando Atendimento',
    statusSituacao: 'Aguardando Atendimento',
  },
  {
    dataCompromisso: '06/01/2026',
    divergente: 'Correto',
    duplicidade: 'Registro Duplicado',
    ficha: '335534823',
    dataFicha: '07/01/2026',
    dataExame: '07/01/2026',
    situacao: 'Aguardando Atendimento',
    statusSituacao: 'Aguardando Atendimento',
  },
  {
    dataCompromisso: '07/01/2026',
    divergente: 'Correto',
    duplicidade: 'Registro Correto',
    ficha: '0',
    dataFicha: '07/01/2026',
    dataExame: '07/01/2026',
    situacao: 'Aguardando Atendimento',
    statusSituacao: 'Aguardando Atendimento',
  },
  {
    dataCompromisso: '07/01/2026',
    divergente: 'Correto',
    duplicidade: 'Registro Correto',
    ficha: '0',
    dataFicha: '07/01/2026',
    dataExame: '07/01/2026',
    situacao: 'Aguardando Atendimento',
    statusSituacao: 'Aguardando Atendimento',
  },
  {
    dataCompromisso: '26/05/2026',
    divergente: 'Correto',
    duplicidade: 'Registro Correto',
    ficha: '0',
    dataFicha: '26/05/2026',
    dataExame: '26/05/2026',
    situacao: 'Aguardando Atendimento',
    statusSituacao: 'Aguardando Atendimento',
  },
];

export function MonitoramentoDetalhadosSection({
  porEmpresa,
  porSubgrupo,
  registros,
  isLoading,
}: Props) {
  const [activeTab, setActiveTab] = useState<'Aguardando Atendimento' | 'Não Atendido'>('Aguardando Atendimento');

  const empresas = (porEmpresa && porEmpresa.length > 0) ? porEmpresa : FALLBACK_EMPRESA;
  const subgrupos = (porSubgrupo && porSubgrupo.length > 0) ? porSubgrupo : FALLBACK_SUBGRUPO;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-md p-6 mb-4 h-[450px] animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-md p-6 mb-4">
      <h2 className="text-base font-bold text-gray-800 text-center uppercase tracking-wide mb-6">
        Monitoramento Detalhado de Agendamentos
      </h2>

      {/* Tabs Filter (Aguardando Atendimento vs Não Atendido) */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('Aguardando Atendimento')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
            activeTab === 'Aguardando Atendimento'
              ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
              : 'bg-slate-50 text-gray-700 border-gray-200 hover:bg-slate-100'
          }`}
        >
          Aguardando Atendimento
        </button>
        <button
          onClick={() => setActiveTab('Não Atendido')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
            activeTab === 'Não Atendido'
              ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
              : 'bg-slate-50 text-gray-700 border-gray-200 hover:bg-slate-100'
          }`}
        >
          Não Atendido
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna Esquerda: Volume por Situação + Subgrupo */}
        <div className="space-y-6">
          {/* Volume por Situação */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
              Volume de Agendamentos - Situação
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={FALLBACK_SITUACAO} layout="vertical" margin={{ left: 0, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="situacao" type="category" width={140} tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#086b94" barSize={18} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="quantidade" position="right" style={{ fontSize: 11, fontWeight: 700, fill: '#086b94' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Subgrupo */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
              Nº de Agendamentos vs Atendimentos por Subgrupo
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={subgrupos} layout="vertical" margin={{ left: 0, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="subgrupo" type="category" width={160} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} />
                <Tooltip />
                <Bar dataKey="agendamentos" fill="#086b94" barSize={16} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="agendamentos" position="right" style={{ fontSize: 10, fontWeight: 700, fill: '#086b94' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Coluna Direita: Nº por Empresa + Tabela de Agendamentos */}
        <div className="space-y-6">
          {/* Nº por Empresa */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
              Nº de Agendamentos por Empresa
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={empresas} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="empresa" tick={{ fontSize: 9, fill: '#475569' }} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#15803d" barSize={26} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="quantidade" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#15803d' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mini-tabela de Agendamentos */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-brand-700 text-white font-bold border-b border-brand-800">
                <tr>
                  <th className="py-2 px-2">Data do Compromisso</th>
                  <th className="py-2 px-2">Sequencial Divergente</th>
                  <th className="py-2 px-2">Duplicidade</th>
                  <th className="py-2 px-2">Sequencial Ficha</th>
                  <th className="py-2 px-2">Data Ficha</th>
                  <th className="py-2 px-2">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {FALLBACK_REGISTROS.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 font-mono text-[11px]">{r.dataCompromisso}</td>
                    <td className="py-1.5 px-2">{r.divergente}</td>
                    <td className="py-1.5 px-2">{r.duplicidade}</td>
                    <td className="py-1.5 px-2 font-mono">{r.ficha}</td>
                    <td className="py-1.5 px-2 font-mono text-[11px]">{r.dataFicha}</td>
                    <td className="py-1.5 px-2">
                      <span className="flex items-center gap-1 font-semibold text-amber-700">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        {r.situacao}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
