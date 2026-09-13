'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { EmpresaStatusItem, EmpresaComparativoItem } from '../types';

interface AnaliseEmpresasProps {
  porEmpresaComparativo?: EmpresaComparativoItem[];
  porEmpresaStatus?: EmpresaStatusItem[];
}

export function AnaliseEmpresasSection({
  porEmpresaComparativo,
  porEmpresaStatus,
}: AnaliseEmpresasProps) {
  // Fallbacks de demonstração fiéis às imagens se dados backend não fornecidos
  const comparativoData = (porEmpresaComparativo && porEmpresaComparativo.length > 0)
    ? porEmpresaComparativo.map(d => ({
        empresa: d.empresa.length > 20 ? d.empresa.substring(0, 20) + '...' : d.empresa,
        registros: d.totalRegistros,
        pctConcluido: d.pctConcluido,
      }))
    : [
        { empresa: 'GRUPO TORA', registros: 8132, pctConcluido: 62 },
        { empresa: 'INSTITUTO MIRANTE DE CULT...', registros: 2054, pctConcluido: 80 },
        { empresa: 'ASO AVULSO - TORA TRANSP...', registros: 2002, pctConcluido: 35 },
        { empresa: 'IMPACTO SERVICOS E TERCEIR...', registros: 1510, pctConcluido: 88 },
        { empresa: 'NORTEARH SERVICES LOCACA...', registros: 1367, pctConcluido: 66 },
        { empresa: 'INSTITUTO DE CULTURA, ARTE...', registros: 1212, pctConcluido: 73 },
        { empresa: 'BRASILITEC SERVICOS DE SEG...', registros: 1108, pctConcluido: 70 },
      ];

  const naoConcluidosData = (porEmpresaStatus && porEmpresaStatus.length > 0)
    ? porEmpresaStatus.map(d => ({
        empresa: d.empresa.length > 18 ? d.empresa.substring(0, 18) + '...' : d.empresa,
        Inconsistencias: d.inconsistencias,
        Pendente: d.pendente,
        Assinado: d.assinado,
        Excluido: d.excluido,
      }))
    : [
        { empresa: 'GRUPO TORA', Inconsistencias: 3118, Pendente: 0, Assinado: 0, Excluido: 3 },
        { empresa: 'ASO AVULSO - TORA', Inconsistencias: 1292, Pendente: 0, Assinado: 0, Excluido: 0 },
        { empresa: 'MCD SERVICOS', Inconsistencias: 755, Pendente: 2, Assinado: 0, Excluido: 0 },
        { empresa: 'NORTEARH SERVICES', Inconsistencias: 461, Pendente: 0, Assinado: 1, Excluido: 0 },
        { empresa: 'MISPA SEGURANCA', Inconsistencias: 428, Pendente: 10, Assinado: 0, Excluido: 0 },
        { empresa: 'INSTITUTO MIRANTE', Inconsistencias: 407, Pendente: 0, Assinado: 0, Excluido: 0 },
        { empresa: 'GO COMERCIO', Inconsistencias: 316, Pendente: 24, Assinado: 0, Excluido: 0 },
      ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      <h2 className="text-lg font-bold text-gray-800 text-center uppercase tracking-wide mb-6">
        Análise de Registros por Empresa
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Esquerda: Comparativo de Registros por Empresa (Horizontal / Divergente) */}
        <div className="lg:col-span-5 bg-slate-50/60 p-4 rounded-xl border border-gray-100">
          <h3 className="text-xs font-bold text-gray-700 uppercase mb-1 text-center">
            Comparativo de Registros por Empresas
          </h3>
          <p className="text-[10px] text-gray-500 text-center mb-3">
            Nº de Registros vs % Concluídos
          </p>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={comparativoData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis
                type="category"
                dataKey="empresa"
                tick={{ fontSize: 9, fill: '#334155' }}
                width={120}
              />
              <Tooltip formatter={(val: number) => val.toLocaleString('pt-BR')} />
              <Bar dataKey="registros" fill="#0e7490" barSize={16}>
                <LabelList dataKey="registros" position="insideRight" style={{ fontSize: 9, fill: '#ffffff', fontWeight: 700 }} />
              </Bar>
              <Bar dataKey="pctConcluido" fill="#15803d" barSize={16}>
                <LabelList
                  dataKey="pctConcluido"
                  position="right"
                  formatter={(val: number) => `${val}%`}
                  style={{ fontSize: 9, fill: '#15803d', fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Direita: Distribuição de Registros Não Concluídos por Empresa */}
        <div className="lg:col-span-7 bg-slate-50/60 p-4 rounded-xl border border-gray-100">
          <h3 className="text-xs font-bold text-gray-700 uppercase mb-3 text-center">
            Distribuição de Registros Não Concluídos por Empresa
          </h3>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={naoConcluidosData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="empresa" tick={{ fontSize: 9, fill: '#64748b' }} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip formatter={(val: number) => val.toLocaleString('pt-BR')} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 5 }} />
              <Bar dataKey="Inconsistencias" fill="#991b1b" barSize={14}>
                <LabelList dataKey="Inconsistencias" position="top" style={{ fontSize: 9, fontWeight: 600 }} />
              </Bar>
              <Bar dataKey="Pendente" fill="#f97316" barSize={14}>
                <LabelList dataKey="Pendente" position="top" style={{ fontSize: 9, fontWeight: 600 }} />
              </Bar>
              <Bar dataKey="Assinado" fill="#0e7490" barSize={14} />
              <Bar dataKey="Excluido" fill="#4b5563" barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
