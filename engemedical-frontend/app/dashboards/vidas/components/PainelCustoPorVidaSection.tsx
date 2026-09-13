'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { PlanoProdutoItem, ValorVidasEmpresaItem, VidasAtivasEmpresaItem } from '../types';

interface PainelCustoPorVidaSectionProps {
  planoProdutos: PlanoProdutoItem[];
  valorVidasEmpresas: ValorVidasEmpresaItem[];
  vidasAtivasEmpresas: VidasAtivasEmpresaItem[];
}

export function PainelCustoPorVidaSection({
  planoProdutos,
  valorVidasEmpresas,
  vidasAtivasEmpresas,
}: PainelCustoPorVidaSectionProps) {
  return (
    <div className="p-6 shadow-xs border border-gray-200 rounded-2xl bg-white space-y-6">
      <div className="border-b pb-3 text-center">
        <h2 className="text-xl font-bold tracking-tight text-gray-800">Painel Custo por Vida Cadastrada – Última Competência</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plano (Produto) */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-center text-gray-700">Plano (Produto)</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={planoProdutos} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="produto"
                  tick={{ fontSize: 8 }}
                  width={140}
                  tickFormatter={(val: string) => (val.length > 22 ? val.substring(0, 20) + '...' : val)}
                />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="quantidade" name="Registros" fill="#006699" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Valor de Vidas por Empresa - Último Mês */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-center text-gray-700">Valor de Vidas por Empresa - Último Mês</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={valorVidasEmpresas} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(val) => `R$ ${val}`} />
                <YAxis
                  type="category"
                  dataKey="empresa"
                  tick={{ fontSize: 8 }}
                  width={130}
                  tickFormatter={(val: string) => (val.length > 20 ? val.substring(0, 18) + '...' : val)}
                />
                <Tooltip formatter={(val: number) => [`R$ ${val.toFixed(2)}`, 'Valor Total']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="valorTotal" name="Valor (R$)" fill="#006699" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vidas Ativas - Última Contagem */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-center text-gray-700">Vidas Ativas - Última Contagem</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={vidasAtivasEmpresas} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="empresa"
                  tick={{ fontSize: 8 }}
                  width={140}
                  tickFormatter={(val: string) => (val.length > 22 ? val.substring(0, 20) + '...' : val)}
                />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="quantidade" name="Vidas Ativas" fill="#006699" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
