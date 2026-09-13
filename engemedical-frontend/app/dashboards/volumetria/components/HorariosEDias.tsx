'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { PorHorarioItem, PorDiaSemanaItem, VolumetriaDashboardResponse } from '../types';

interface HorariosEDiasProps {
  porHorario: PorHorarioItem[];
  porDiaSemana: PorDiaSemanaItem[];
  heatmap: VolumetriaDashboardResponse['heatmap'];
}

export function HorariosEDias({ porHorario, porDiaSemana, heatmap }: HorariosEDiasProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Agendamentos por Horário */}
        <div className="p-6 shadow-xs border border-gray-200 rounded-2xl bg-white space-y-4">
          <div className="border-b pb-3">
            <h3 className="text-base font-bold">Distribuição de Agendamentos por Horário</h3>
            <p className="text-xs text-gray-400">Volume concentrado por horário de atendimento</p>
          </div>

          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={porHorario.slice(0, 10)} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="horario" tick={{ fontSize: 10 }} width={50} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="quantidade" name="Agendamentos" fill="#006699" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Agendamentos por Dia da Semana */}
        <div className="p-6 shadow-xs border border-gray-200 rounded-2xl bg-white space-y-4">
          <div className="border-b pb-3">
            <h3 className="text-base font-bold">Distribuição de Agendamentos por Dia da Semana</h3>
            <p className="text-xs text-gray-400">Comparativo de Segunda a Domingo</p>
          </div>

          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={porDiaSemana} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="diaSemana" tick={{ fontSize: 10 }} width={90} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="quantidade" name="Agendamentos" fill="#0284c7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Matriz Cruzada: Distribuição por Dia e Horário (Heatmap) */}
      <div className="p-6 shadow-xs border border-gray-200 rounded-2xl bg-white space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-base font-bold">Distribuição de Agendamentos por Dia e Horário</h3>
          <p className="text-xs text-gray-400">Cruzamento detalhado de horários x dias da semana</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500 font-semibold">
                <th className="py-2.5 px-3">Dia da Semana</th>
                {heatmap.horariosColunas.map((col) => (
                  <th key={col} className="py-2.5 px-2 text-center">{col}</th>
                ))}
                <th className="py-2.5 px-3 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {heatmap.dias.map((d) => (
                <tr key={d.diaSemana} className="hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium capitalize text-gray-800">{d.diaSemana}</td>
                  {heatmap.horariosColunas.map((col) => {
                    const val = d.horarios[col] || 0;
                    return (
                      <td key={col} className="py-2 px-2 text-center text-gray-600">
                        {val > 0 ? val.toLocaleString('pt-BR') : '-'}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right font-bold text-gray-800">
                    {d.totalDia.toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold border-t text-gray-800">
                <td className="py-2.5 px-3">Total</td>
                {heatmap.horariosColunas.map((col) => (
                  <td key={col} className="py-2.5 px-2 text-center text-brand-500">
                    {(heatmap.totaisPorHorario[col] || 0).toLocaleString('pt-BR')}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right text-brand-600 font-extrabold text-sm">
                  {heatmap.totalGeral.toLocaleString('pt-BR')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
