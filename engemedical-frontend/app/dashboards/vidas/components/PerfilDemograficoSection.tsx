'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { PerfilDemografico } from '../types';

interface PerfilDemograficoSectionProps {
  perfil: PerfilDemografico;
}

export function PerfilDemograficoSection({ perfil }: PerfilDemograficoSectionProps) {
  return (
    <div className="p-6 shadow-md border border-gray-200 rounded-2xl bg-white space-y-6">
      <div className="border-b pb-3 text-center">
        <h2 className="text-xl font-bold tracking-tight text-gray-800">Perfil Demográfico dos Cadastros Ativos no SOC</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Indicadores M / F */}
        <div className="lg:col-span-3 flex flex-col gap-6 justify-center bg-gray-50/60 p-5 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-lg">
              ♂
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 block uppercase">Masculino</span>
              <span className="text-2xl font-black text-blue-600">
                {perfil.masculino.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-black text-lg">
              ♀
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 block uppercase">Feminino</span>
              <span className="text-2xl font-black text-pink-600">
                {perfil.feminino.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        {/* Distribuição por Faixa Etária */}
        <div className="lg:col-span-4 space-y-2">
          <h4 className="text-xs font-bold text-center text-gray-700">Distribuição dos Ativos por Faixa Etária</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={perfil.faixaEtaria} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="faixa" tick={{ fontSize: 9 }} width={70} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="quantidade" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição por Localidade */}
        <div className="lg:col-span-5 space-y-2">
          <h4 className="text-xs font-bold text-center text-gray-700">Distribuição por Localidade da Base Ativa</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={perfil.localidade} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="cidadeUf" tick={{ fontSize: 9 }} width={120} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="quantidade" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
