'use client';

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
  PorDiaSemanaItem,
  PorFuncionarioItem,
  PorFaixaEtariaSexoItem,
  PorFaixaDiasPerdidosItem,
} from '../types';

interface DiasSemanaDemograficoProps {
  diasSemana?: PorDiaSemanaItem[];
  porFuncionario?: PorFuncionarioItem[];
  porFaixaEtariaSexo?: PorFaixaEtariaSexoItem[];
  porFaixaDiasPerdidos?: PorFaixaDiasPerdidosItem[];
  isLoading?: boolean;
}

const FALLBACK_DIAS_SEMANA = [
  { dia: 'domingo', diasPerdidos: 69 },
  { dia: 'segunda-feira', diasPerdidos: 128 },
  { dia: 'terça-feira', diasPerdidos: 127 },
  { dia: 'quarta-feira', diasPerdidos: 149 },
  { dia: 'quinta-feira', diasPerdidos: 148 },
  { dia: 'sexta-feira', diasPerdidos: 139 },
  { dia: 'sábado', diasPerdidos: 70 },
];

const FALLBACK_FUNC = [
  { nome: 'ANTONIO PINHEIRO DE SOUZA ...', atestados: 30 },
  { nome: 'GLEYDSON ALMEIDA CAVALCAN...', atestados: 19 },
  { nome: 'PAULO SIDNEY TEXEIRA DE ALM...', atestados: 18 },
  { nome: 'REGINA COELI MARTINS BATISTA', atestados: 15 },
  { nome: 'MARIA CELINA DE VASCONCELO...', atestados: 13 },
  { nome: 'LARISSA NOGUEIRA FROTA DA C...', atestados: 12 },
];

const FALLBACK_FAIXA_ETARIA = [
  { faixa: '24 a 28', feminino: 12, pctFeminino: 18, masculino: 53, pctMasculino: 82 },
  { faixa: '29 a 33', feminino: 0, pctFeminino: 0, masculino: 79, pctMasculino: 88 },
  { faixa: '34 a 38', feminino: 42, pctFeminino: 61, masculino: 27, pctMasculino: 39 },
  { faixa: '39 a 43', feminino: 212, pctFeminino: 58, masculino: 152, pctMasculino: 42 },
  { faixa: '44 a 48', feminino: 20, pctFeminino: 39, masculino: 31, pctMasculino: 61 },
  { faixa: '54 a 58', feminino: 19, pctFeminino: 100, masculino: 0, pctMasculino: 0 },
];

const FALLBACK_FAIXA_DIAS = [
  { faixa: '1 a 3 dias', funcionarios: 47 },
  { faixa: '4 a 7 dias', funcionarios: 12 },
  { faixa: '8 a 15 dias', funcionarios: 5 },
  { faixa: 'Mais de 15 dias', funcionarios: 3 },
];

const DIA_COLORS = ['#086b94', '#0f384a', '#288fae', '#53b4d4', '#99d98c', '#15803d', '#74c69d'];

export function DiasSemanaDemograficoSection({
  diasSemana,
  porFuncionario,
  porFaixaEtariaSexo,
  porFaixaDiasPerdidos,
  isLoading,
}: DiasSemanaDemograficoProps) {
  const dias = (diasSemana && diasSemana.length > 0) ? diasSemana : FALLBACK_DIAS_SEMANA;
  const funcionarios = (porFuncionario && porFuncionario.length > 0) ? porFuncionario : FALLBACK_FUNC;
  const etarias = (porFaixaEtariaSexo && porFaixaEtariaSexo.length > 0) ? porFaixaEtariaSexo : FALLBACK_FAIXA_ETARIA;
  const faixasDias = (porFaixaDiasPerdidos && porFaixaDiasPerdidos.length > 0) ? porFaixaDiasPerdidos : FALLBACK_FAIXA_DIAS;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6 h-[450px] animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
      {/* 1: Barra de Dias Perdidos por Dias da Semana (Barra de Topo Segmentada) */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-800 text-center uppercase tracking-wide mb-3">
          Dias Perdidos por Dias da Semana
        </h2>

        {/* Legenda de dias */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-gray-600 mb-3">
          {dias.map((d, i) => (
            <span key={d.dia} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: DIA_COLORS[i % DIA_COLORS.length] }} />
              {d.dia}
            </span>
          ))}
        </div>

        {/* Segmented Bar */}
        <div className="flex h-8 rounded-lg overflow-hidden border border-gray-200 shadow-inner">
          {dias.map((d, i) => (
            <div
              key={d.dia}
              className="flex items-center justify-center text-white text-xs font-bold transition-all hover:opacity-90"
              style={{
                width: `${(d.diasPerdidos / dias.reduce((s, x) => s + x.diasPerdidos, 0)) * 100}%`,
                backgroundColor: DIA_COLORS[i % DIA_COLORS.length],
              }}
              title={`${d.dia}: ${d.diasPerdidos} dias`}
            >
              {d.diasPerdidos}
            </div>
          ))}
        </div>
      </div>

      {/* 2: 3 Gráficos Lado a Lado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico 1: Nº de Atestados por Funcionário (com Scroll Interno Estilo Power BI) */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Nº de Atestados por Funcionário
          </h3>
          <div className="max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
            <div style={{ height: Math.max(240, funcionarios.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funcionarios} layout="vertical" margin={{ left: 0, right: 35, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    width={130}
                    tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
                  />
                  <Tooltip />
                  <Bar dataKey="atestados" fill="#086b94" barSize={16} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="atestados" position="right" style={{ fontSize: 10, fontWeight: 700, fill: '#086b94' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gráfico 2: Dias Perdidos por Faixa Etária e Sexo */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center w-full">
              Dias Perdidos por Faixa Etária e Sexo
            </h3>
          </div>
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-gray-600 mb-2">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-pink-500 inline-block" /> F</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-teal-800 inline-block" /> M</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={etarias} layout="vertical" margin={{ left: 0, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis dataKey="faixa" type="category" width={55} tick={{ fontSize: 10, fill: '#475569' }} />
              <Tooltip />
              <Bar dataKey="feminino" name="F" fill="#ec4899" stackId="a" barSize={16}>
                <LabelList dataKey="feminino" position="inside" style={{ fontSize: 9, fontWeight: 700, fill: '#fff' }} formatter={(v: number) => v > 0 ? `${v}` : ''} />
              </Bar>
              <Bar dataKey="masculino" name="M" fill="#086b94" stackId="a" barSize={16}>
                <LabelList dataKey="masculino" position="inside" style={{ fontSize: 9, fontWeight: 700, fill: '#fff' }} formatter={(v: number) => v > 0 ? `${v}` : ''} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 3: Nº de Funcionários por Faixa de Dias Perdidos */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Nº de Funcionários por Faixa de Dias Perdidos
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={faixasDias} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis dataKey="faixa" type="category" width={95} tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
              <Tooltip />
              <Bar dataKey="funcionarios" fill="#086b94" barSize={22} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="funcionarios" position="center" style={{ fontSize: 11, fontWeight: 800, fill: '#fff' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
