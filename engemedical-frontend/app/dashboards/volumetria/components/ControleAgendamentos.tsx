'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { PorAgendaItem, VolumetriaKPIs } from '../types';

interface ControleAgendamentosProps {
  porAgenda: PorAgendaItem[];
  kpis: VolumetriaKPIs;
  statusFiltro: string;
  onStatusChange: (status: string) => void;
  loading?: boolean;
}

export function ControleAgendamentos({
  porAgenda,
  kpis,
  statusFiltro,
  onStatusChange,
  loading,
}: ControleAgendamentosProps) {
  return (
    <div className="p-6 shadow-md border border-gray-200 rounded-2xl bg-white space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Controle Geral de Agendamentos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Comparativo % de Agendamentos vs % de Atendimentos por Agenda</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Status da Situação:</label>
          <select
            value={statusFiltro}
            onChange={(e) => onStatusChange(e.target.value)}
            className="text-xs font-medium bg-background border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Todos">Todos</option>
            <option value="Atendido">Atendidos</option>
            <option value="Não Atendido">Não Atendidos</option>
            <option value="Aguardando Atendimento">Aguardando Atendimento</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        {/* Gráfico de Barras Agrupadas */}
        <div className="lg:col-span-3 h-[280px]">
          <h4 className="text-xs font-semibold text-center mb-2 text-muted-foreground">Nº de Agendamentos vs Atendimentos - Agenda</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porAgenda.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <XAxis
                dataKey="agenda"
                tick={{ fontSize: 10 }}
                interval={0}
                tickFormatter={(val: string) => (val.length > 15 ? val.substring(0, 13) + '...' : val)}
              />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}%`} />
              <Tooltip
                formatter={(val: number, name: string) => [`${val}%`, name === 'percentAgendamentos' ? '% Agendamentos' : '% Atendidos']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend
                formatter={(val) => (val === 'percentAgendamentos' ? '% de Agendamentos' : '% de Atendidos')}
                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              />
              <Bar dataKey="percentAgendamentos" fill="#006699" radius={[4, 4, 0, 0]} />
              <Bar dataKey="percentAtendimentos" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lateral KPIs */}
        <div className="flex flex-col gap-4 justify-center bg-muted/30 p-5 rounded-xl border">
          <div className="text-center">
            <span className="text-xs font-semibold text-muted-foreground block uppercase">Atendidos</span>
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {loading ? '...' : kpis.atendidos.toLocaleString('pt-BR')}
            </span>
          </div>

          <div className="border-t pt-3 text-center">
            <span className="text-xs font-semibold text-muted-foreground block uppercase">Não Atendidos</span>
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {loading ? '...' : kpis.naoAtendidos.toLocaleString('pt-BR')}
            </span>
          </div>

          <div className="border-t pt-3 text-center">
            <span className="text-xs font-semibold text-muted-foreground block uppercase">Aguardando Atendimento</span>
            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              {loading ? '...' : kpis.aguardandoAtendimento.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
