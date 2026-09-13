'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { RegistroCadastralItem, IndiceRegularizacaoItem, VidasKPIs } from '../types';

interface ConsistenciaCadastralSectionProps {
  registrosCadastrais: RegistroCadastralItem[];
  indiceRegularizacao: IndiceRegularizacaoItem[];
  kpis: VidasKPIs;
}

const COLORS_REGISTROS = ['#881337', '#16a34a', '#ea580c', '#06b6d4', '#9ca3af'];

export function ConsistenciaCadastralSection({
  registrosCadastrais,
  indiceRegularizacao,
  kpis,
}: ConsistenciaCadastralSectionProps) {
  return (
    <div className="p-6 shadow-xs border border-gray-200 rounded-2xl bg-white space-y-6">
      <div className="border-b pb-3">
        <h2 className="text-xl font-bold tracking-tight text-gray-800">Monitoramento da Consistência Cadastral Ativa no SOC</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Este quadro verifica se a situação do colaborador no SOC está de acordo com a existência ou ausência da data de demissão cadastrada.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Registros Cadastrais */}
        <div className="lg:col-span-5 space-y-2">
          <h4 className="text-xs font-bold text-center text-gray-700">Registros Cadastrais</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={registrosCadastrais} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="situacao" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
                  {registrosCadastrais.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_REGISTROS[index % COLORS_REGISTROS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Índice de Regularização */}
        <div className="lg:col-span-4 space-y-2">
          <h4 className="text-xs font-bold text-center text-gray-700">Índice de Regularização da Base Cadastral</h4>
          <p className="text-[10px] text-center text-gray-400">Consistente e Inconsistente</p>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={indiceRegularizacao} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}%`} />
                <YAxis
                  type="category"
                  dataKey="categoria"
                  tick={{ fontSize: 9 }}
                  width={140}
                  tickFormatter={(val: string) => (val.length > 22 ? val.substring(0, 20) + '...' : val)}
                />
                <Tooltip formatter={(val: number) => [`${val}%`, 'Percentual']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="percentual" radius={[0, 4, 4, 0]}>
                  {indiceRegularizacao.map((entry, index) => (
                    <Cell key={`cell-ind-${index}`} fill={entry.tipo === 'Inconsistente' ? '#ef4444' : '#0284c7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPIs Consistências e Inconsistências */}
        <div className="lg:col-span-3 flex flex-col gap-6 justify-center bg-gray-50/60 p-5 rounded-xl border border-gray-100 text-center">
          <div>
            <span className="text-xs font-semibold text-gray-500 block uppercase">Nº de Consistências</span>
            <span className="text-3xl font-extrabold text-blue-600">
              {kpis.totalConsistencias.toLocaleString('pt-BR')}
            </span>
          </div>

          <div className="border-t border-gray-200 pt-5">
            <span className="text-xs font-semibold text-gray-500 block uppercase">Nº de Inconsistências</span>
            <span className="text-3xl font-extrabold text-red-600">
              {kpis.totalInconsistencias.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
