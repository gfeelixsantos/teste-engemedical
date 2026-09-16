'use client';

import React from 'react';
import { XCircle } from 'lucide-react';
import { ProdutoTabelaItem, EmpresaAtivacaoTabelaItem } from '../types';

interface TabelasProdutosEmpresasProps {
  produtosTabela: ProdutoTabelaItem[];
  empresasAtivacaoTabela: EmpresaAtivacaoTabelaItem[];
}

export function TabelasProdutosEmpresas({
  produtosTabela,
  empresasAtivacaoTabela,
}: TabelasProdutosEmpresasProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Tabela Produtos */}
      <div className="lg:col-span-8 p-5 shadow-md border border-gray-200 rounded-2xl bg-white space-y-4">
        <h3 className="text-base font-bold text-center text-gray-800 border-b pb-2">Produtos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-brand-700 text-white">
              <tr className="border-b bg-gray-50 text-gray-600 font-semibold">
                <th className="py-2 px-2">Código</th>
                <th className="py-2 px-2">Empresa</th>
                <th className="py-2 px-2">Plano Para Ativação</th>
                <th className="py-2 px-2">Produto</th>
                <th className="py-2 px-2">SubGrupo</th>
                <th className="py-2 px-2 text-right">Valor Vida Mês</th>
                <th className="py-2 px-2 text-center">Vidas Ativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {produtosTabela.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2 px-2 font-mono text-gray-500">{row.codigo}</td>
                  <td className="py-2 px-2 font-medium text-gray-800 max-w-[150px] truncate">{row.empresa}</td>
                  <td className="py-2 px-2 text-gray-600">{row.planoAtivacao}</td>
                  <td className="py-2 px-2 text-gray-600 max-w-[160px] truncate">{row.produto}</td>
                  <td className="py-2 px-2 text-gray-500 max-w-[140px] truncate">{row.subgrupo}</td>
                  <td className="py-2 px-2 text-right font-medium text-gray-700">{row.valorVidaMes}</td>
                  <td className="py-2 px-2 text-center font-bold text-gray-800">{row.vidasAtivas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela Empresas */}
      <div className="lg:col-span-4 p-5 shadow-md border border-gray-200 rounded-2xl bg-white space-y-4">
        <h3 className="text-base font-bold text-center text-gray-800 border-b pb-2">Empresas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-brand-700 text-white">
              <tr className="border-b bg-gray-50 text-gray-600 font-semibold">
                <th className="py-2 px-2">Código</th>
                <th className="py-2 px-2">Empresa</th>
                <th className="py-2 px-2 text-center">Plano Para Ativação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empresasAtivacaoTabela.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2 px-2 font-mono text-gray-500">{row.codigo}</td>
                  <td className="py-2 px-2 font-medium text-gray-800 max-w-[180px] truncate">{row.empresa}</td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-red-600 font-bold">{row.planoAtivacao}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
