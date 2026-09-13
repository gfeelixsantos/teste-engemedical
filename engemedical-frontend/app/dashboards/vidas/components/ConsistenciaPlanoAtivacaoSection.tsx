'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { EmpresasPorPlanoItem, RegistrosPorEmpresaItem, ConformidadeAtivacaoItem } from '../types';

interface ConsistenciaPlanoAtivacaoSectionProps {
  empresasPorPlano: EmpresasPorPlanoItem[];
  registrosPorEmpresa: RegistrosPorEmpresaItem[];
  conformidadeAtivacao: ConformidadeAtivacaoItem[];
}

export function ConsistenciaPlanoAtivacaoSection({
  empresasPorPlano,
  registrosPorEmpresa,
  conformidadeAtivacao,
}: ConsistenciaPlanoAtivacaoSectionProps) {
  return (
    <div className="p-6 shadow-xs border border-gray-200 rounded-2xl bg-white space-y-6">
      <div className="border-b pb-3">
        <h2 className="text-xl font-bold tracking-tight text-gray-800">Monitoramento da Consistência Plano x Ativação</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Este quadro verifica se a situação do colaborador no SOC está de acordo com a existência ou ausência da data de demissão cadastrada.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nº de Empresas por Plano */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-center text-gray-700">Nº de Empresas por Plano</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={empresasPorPlano} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="categoria" tick={{ fontSize: 9 }} width={110} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="quantidade" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nº de Registros Cadastrais por Empresas */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-center text-gray-700">Nº de Registros Cadastrais por Empresas</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={registrosPorEmpresa} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="empresa"
                  tick={{ fontSize: 9 }}
                  width={130}
                  tickFormatter={(val: string) => (val.length > 20 ? val.substring(0, 18) + '...' : val)}
                />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="quantidade" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conformidade de Ativação por Plano */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-center text-gray-700">Conformidade de Ativação por Plano</h4>
          <p className="text-[10px] text-center text-gray-400">Consistente e Inconsistente</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={conformidadeAtivacao} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}%`} />
                <YAxis
                  type="category"
                  dataKey="status"
                  tick={{ fontSize: 8 }}
                  width={150}
                  tickFormatter={(val: string) => (val.length > 24 ? val.substring(0, 22) + '...' : val)}
                />
                <Tooltip formatter={(val: number) => [`${val}%`, 'Percentual']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="percentual" radius={[0, 4, 4, 0]}>
                  {conformidadeAtivacao.map((entry, index) => (
                    <Cell key={`cell-conf-${index}`} fill={entry.tipo === 'Inconsistente' ? '#ef4444' : '#0284c7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
