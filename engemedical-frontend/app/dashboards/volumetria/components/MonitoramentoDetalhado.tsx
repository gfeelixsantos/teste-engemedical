'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { PorSituacaoDetalhadaItem, PorEmpresaItem, PorSubgrupoItem } from '../types';

interface MonitoramentoDetalhadoProps {
  porSituacaoDetalhada: PorSituacaoDetalhadaItem[];
  porEmpresa: PorEmpresaItem[];
  porSubgrupo: PorSubgrupoItem[];
}

export function MonitoramentoDetalhado({
  porSituacaoDetalhada,
  porEmpresa,
  porSubgrupo,
}: MonitoramentoDetalhadoProps) {
  return (
    <div className="p-6 shadow-xs border border-gray-200 rounded-2xl bg-white space-y-6">
      <div className="border-b pb-3">
        <h2 className="text-xl font-bold tracking-tight text-gray-800">Monitoramento Detalhado de Agendamentos</h2>
        <p className="text-xs text-gray-400 mt-0.5">Análise por Situação Específica, Empresas e Subgrupos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume de Agendamentos - Situação */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500">Volume de Agendamentos - Situação</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={porSituacaoDetalhada} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="situacao"
                  tick={{ fontSize: 9 }}
                  width={130}
                  tickFormatter={(val: string) => (val.length > 22 ? val.substring(0, 20) + '...' : val)}
                />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="quantidade" name="Agendamentos" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nº de Agendamentos por Empresa */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500">Nº de Agendamentos por Empresa (Top 8)</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porEmpresa.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis
                  dataKey="empresa"
                  tick={{ fontSize: 9 }}
                  interval={0}
                  tickFormatter={(val: string) => (val.length > 12 ? val.substring(0, 10) + '...' : val)}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="quantidade" name="Agendamentos" fill="#006699" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Nº de Agendamentos vs Atendimentos por Subgrupo */}
      <div className="pt-4 border-t space-y-3">
        <h4 className="text-xs font-semibold text-gray-500">Nº de Agendamentos vs Atendimentos por Subgrupo</h4>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={porSubgrupo.slice(0, 7)} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="subgrupo"
                tick={{ fontSize: 9 }}
                width={160}
                tickFormatter={(val: string) => (val.length > 25 ? val.substring(0, 23) + '...' : val)}
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 5 }} />
              <Bar dataKey="agendamentos" name="Agendamentos" fill="#0284c7" radius={[0, 4, 4, 0]} />
              <Bar dataKey="atendimentos" name="Atendimentos" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
