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
  LineChart,
  Line,
} from 'recharts';
import CountUp from 'react-countup';
import type {
  ProfissionalAgendaItem,
  ProfissionalPeriodoItem,
  ProfissionalTipoCompromissoItem,
  ProfissionalVolumeExameItem,
} from '../types';

interface Props {
  porAgenda?: ProfissionalAgendaItem[];
  porPeriodo?: ProfissionalPeriodoItem[];
  porTipoCompromisso?: ProfissionalTipoCompromissoItem[];
  porVolumeExame?: ProfissionalVolumeExameItem[];
  atendidos?: number;
  naoAtendidos?: number;
  aguardando?: number;
  isLoading?: boolean;
}

const FALLBACK_AGENDA: ProfissionalAgendaItem[] = [
  { agenda: 'AMANDA KELLY GOMES LUCIO', agendamentos: 5, atendimentos: 0, percentAgendamentos: 20.83, percentAtendimentos: 0 },
  { agenda: 'ESTAGIARIO 3C SERVICOS', agendamentos: 5, atendimentos: 0, percentAgendamentos: 20.83, percentAtendimentos: 0 },
  { agenda: 'NAYARA MARIANNE LOPES OSORIO', agendamentos: 5, atendimentos: 0, percentAgendamentos: 20.83, percentAtendimentos: 0 },
  { agenda: 'ELISA MARIA DUARTE LOURENCO', agendamentos: 4, atendimentos: 0, percentAgendamentos: 16.67, percentAtendimentos: 0 },
  { agenda: 'ANA CRISTINA DO CARMO SILVA', agendamentos: 2, atendimentos: 0, percentAgendamentos: 8.33, percentAtendimentos: 0 },
  { agenda: 'IZABELLA FIGUEIREDO LOPES DIAS', agendamentos: 2, atendimentos: 0, percentAgendamentos: 8.33, percentAtendimentos: 0 },
  { agenda: 'ROSELI PEREIRA DA SILVA', agendamentos: 1, atendimentos: 0, percentAgendamentos: 4.17, percentAtendimentos: 0 },
];

const FALLBACK_PERIODO: ProfissionalPeriodoItem[] = [
  { periodo: 'mar 2026', agendamentos: 5, exames: 5 },
  { periodo: 'mai 2026', agendamentos: 6, exames: 6 },
  { periodo: 'jul 2026', agendamentos: 5, exames: 5 },
];

const FALLBACK_TIPO: ProfissionalTipoCompromissoItem[] = [
  { tipoCompromisso: 'ADMISSIONAL', aguardandoAtendimento: 2, atendido: 0, naoAtendido: 4, percentAguardando: 8.33, percentAtendido: 0, percentNaoAtendido: 16.67 },
  { tipoCompromisso: 'PERIODICO', aguardandoAtendimento: 5, atendido: 0, naoAtendido: 1, percentAguardando: 20.83, percentAtendido: 0, percentNaoAtendido: 4.17 },
  { tipoCompromisso: 'DEMISSIONAL', aguardandoAtendimento: 1, atendido: 0, naoAtendido: 4, percentAguardando: 4.17, percentAtendido: 0, percentNaoAtendido: 16.67 },
  { tipoCompromisso: 'RETORNO AO TRABALHO', aguardandoAtendimento: 2, atendido: 0, naoAtendido: 0, percentAguardando: 8.33, percentAtendido: 0, percentNaoAtendido: 0 },
];

const FALLBACK_VOLUME: ProfissionalVolumeExameItem[] = [
  { exame: 'EXAME NAO LANCADO', quantidade: 25 },
];

function truncateName(name: string, maxLen = 14) {
  if (!name) return '';
  return name.length > maxLen ? name.substring(0, maxLen) + '...' : name;
}

export function ControleGeralSection({
  porAgenda,
  porPeriodo,
  porTipoCompromisso,
  porVolumeExame,
  atendidos = 0,
  naoAtendidos = 16,
  aguardando = 8,
  isLoading,
}: Props) {
  const agendasData = (porAgenda && porAgenda.length > 0) ? porAgenda : FALLBACK_AGENDA;
  const periodosData = (porPeriodo && porPeriodo.length > 0) ? porPeriodo : FALLBACK_PERIODO;
  const tiposData = (porTipoCompromisso && porTipoCompromisso.length > 0) ? porTipoCompromisso : FALLBACK_TIPO;
  const examesData = (porVolumeExame && porVolumeExame.length > 0) ? porVolumeExame : FALLBACK_VOLUME;

  const agendaChartData = agendasData.map(a => ({
    name: truncateName(a.agenda),
    fullName: a.agenda,
    percent: a.percentAgendamentos,
  }));

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-md p-6 mb-4 h-[550px] animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-md p-6 mb-4">
      <h2 className="text-base font-bold text-gray-800 text-center uppercase tracking-wide mb-6">
        Controle Geral de Agendamentos
      </h2>

      {/* Grid Superior: Nº de Agendamentos vs Atendimentos por Agenda + Resumo de Status */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Chart 1: Barras Vertical por Agenda */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Nº de Agendamentos vs Atendimentos - Agenda
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#086b94] inline-block" /> % de Agendamentos</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#15803d] inline-block" /> % de Atendidos</span>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
            <div style={{ minWidth: Math.max(500, agendaChartData.length * 75), height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agendaChartData} margin={{ top: 20, right: 10, left: 0, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis hide />
                  <Tooltip formatter={(val: number) => `${val}%`} />
                  <Bar dataKey="percent" fill="#086b94" barSize={32} radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="percent"
                      position="top"
                      formatter={(v: number) => `${v}%`}
                      style={{ fontSize: 10, fontWeight: 700, fill: '#086b94' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Resumo de Status Lateral (Atendidos 0, Não Atendidos 16, Aguardando 8) */}
        <div className="flex flex-col justify-center gap-6 border-l border-gray-100 pl-6">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
              Atendidos
            </div>
            <div className="text-2xl font-black text-gray-700">
              <CountUp end={atendidos} />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
              Não Atendidos
            </div>
            <div className="text-2xl font-black text-teal-800">
              <CountUp end={naoAtendidos} />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
              Aguardando Atendimento
            </div>
            <div className="text-2xl font-black text-teal-800">
              <CountUp end={aguardando} />
            </div>
          </div>
        </div>
      </div>

      {/* Agendamentos por Período (Linha Dupla) */}
      <div className="mb-8 border-t border-gray-100 pt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide w-full text-center">
            Agendamentos por Período
          </h3>
        </div>
        <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-gray-600 mb-2">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#15803d] inline-block" /> Nº de Agendamentos</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#086b94] inline-block" /> Nº de Exames</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={periodosData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
            <YAxis hide />
            <Tooltip />
            <Line type="monotone" dataKey="agendamentos" stroke="#15803d" strokeWidth={2.5} dot={{ r: 4 }}>
              <LabelList dataKey="agendamentos" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#15803d' }} />
            </Line>
            <Line type="monotone" dataKey="exames" stroke="#086b94" strokeWidth={2.5} dot={{ r: 4 }}>
              <LabelList dataKey="exames" position="bottom" style={{ fontSize: 10, fontWeight: 700, fill: '#086b94' }} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Grid Inferior: Distribuição de Tipo de Compromisso por Situação + Volume de Exames Agendados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-gray-100 pt-6">
        {/* Distribuição por Situação */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-2">
            Distribuição de Tipo de Compromisso por Situação
          </h3>
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-gray-600 mb-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#086b94] inline-block" /> Aguardando Atendimento</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#dc2626] inline-block" /> Não Atendido</span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tiposData} margin={{ top: 20, right: 10, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="tipoCompromisso" tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="percentAguardando" name="Aguardando Atendimento" fill="#086b94" barSize={26}>
                <LabelList
                  dataKey="percentAguardando"
                  position="top"
                  formatter={(v: number) => `${v}%`}
                  style={{ fontSize: 9, fontWeight: 700, fill: '#086b94' }}
                />
              </Bar>
              <Bar dataKey="percentNaoAtendido" name="Não Atendido" fill="#dc2626" barSize={26}>
                <LabelList
                  dataKey="percentNaoAtendido"
                  position="top"
                  formatter={(v: number) => `${v}%`}
                  style={{ fontSize: 9, fontWeight: 700, fill: '#dc2626' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Volume de Exames Agendados (Bloco Retangular Azul) */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Volume de Exames Agendados
          </h3>
          <div className="bg-[#086b94] rounded-xl p-8 h-[220px] flex flex-col items-center justify-center text-white shadow-md">
            <span className="text-5xl font-black mb-2">25</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-100">
              EXAME NAO LANCADO
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
