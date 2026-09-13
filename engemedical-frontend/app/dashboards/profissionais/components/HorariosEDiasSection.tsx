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
  ProfissionalHorarioItem,
  ProfissionalDiaSemanaItem,
  ProfissionalHeatmapItem,
} from '../types';

interface Props {
  porHorario?: ProfissionalHorarioItem[];
  porDiaSemana?: ProfissionalDiaSemanaItem[];
  heatmap?: {
    horariosColunas: string[];
    dias: ProfissionalHeatmapItem[];
    totaisPorHorario: Record<string, number>;
    totalGeral: number;
  };
  isLoading?: boolean;
}

const FALLBACK_HORARIO: ProfissionalHorarioItem[] = [
  { horario: '07:00', quantidade: 4 },
  { horario: '07:30', quantidade: 2 },
  { horario: '08:00', quantidade: 11 },
  { horario: '08:15', quantidade: 2 },
  { horario: '08:30', quantidade: 2 },
  { horario: '09:00', quantidade: 4 },
];

const FALLBACK_DIA: ProfissionalDiaSemanaItem[] = [
  { diaSemana: 'segunda-feira', quantidade: 5 },
  { diaSemana: 'terça-feira', quantidade: 8 },
  { diaSemana: 'quarta-feira', quantidade: 8 },
  { diaSemana: 'quinta-feira', quantidade: 2 },
  { diaSemana: 'sexta-feira', quantidade: 1 },
];

const FALLBACK_MATRIX = [
  { dia: 'segunda-feira', h07: 1, h08: 4, h09: 0 },
  { dia: 'terça-feira', h07: 2, h08: 4, h09: 2 },
  { dia: 'quarta-feira', h07: 2, h08: 5, h09: 1 },
  { dia: 'quinta-feira', h07: 1, h08: 1, h09: 0 },
  { dia: 'sexta-feira', h07: 0, h08: 0, h09: 1 },
];

export function HorariosEDiasSection({
  porHorario,
  porDiaSemana,
  heatmap,
  isLoading,
}: Props) {
  const horarios = (porHorario && porHorario.length > 0) ? porHorario : FALLBACK_HORARIO;
  const dias = (porDiaSemana && porDiaSemana.length > 0) ? porDiaSemana : FALLBACK_DIA;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4 h-[300px] animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1: Distribuição de Agendamentos por Horário */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Distribuição de Agendamentos por Horário
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={horarios} layout="vertical" margin={{ left: 0, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis dataKey="horario" type="category" width={50} tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#086b94" barSize={16} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="quantidade" position="right" style={{ fontSize: 10, fontWeight: 700, fill: '#086b94' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 2: Distribuição de Agendamentos por Dia da Semana */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Distribuição de Agendamentos por Dia da Semana
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dias} layout="vertical" margin={{ left: 0, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis dataKey="diaSemana" type="category" width={90} tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#086b94" barSize={16} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="quantidade" position="right" style={{ fontSize: 10, fontWeight: 700, fill: '#086b94' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 3: Distribuição de Agendamentos por Dia e Horário (Tabela Matriz) */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Distribuição de Agendamentos por Dia e Horário
          </h3>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="py-2 px-3">Dia da Semana</th>
                  <th className="py-2 px-2 text-center">07:00</th>
                  <th className="py-2 px-2 text-center">08:00</th>
                  <th className="py-2 px-2 text-center">09:00</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {FALLBACK_MATRIX.map((row) => (
                  <tr key={row.dia} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium">{row.dia}</td>
                    <td className="py-2 px-2 text-center font-bold text-gray-800">{row.h07 || ''}</td>
                    <td className="py-2 px-2 text-center font-bold text-gray-800">{row.h08 || ''}</td>
                    <td className="py-2 px-2 text-center font-bold text-gray-800">{row.h09 || ''}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50/80 font-bold text-gray-900 border-t border-gray-200">
                  <td className="py-2 px-3 uppercase">Total</td>
                  <td className="py-2 px-2 text-center text-teal-800">6</td>
                  <td className="py-2 px-2 text-center text-teal-800">15</td>
                  <td className="py-2 px-2 text-center text-teal-800">4</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
