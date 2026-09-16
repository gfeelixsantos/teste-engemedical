'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { PorTipoCompromissoItem, PorVolumeExameItem } from '../types';

interface CompromissoEExamesProps {
  porTipoCompromisso: PorTipoCompromissoItem[];
  porVolumeExame: PorVolumeExameItem[];
}

export function CompromissoEExames({ porTipoCompromisso, porVolumeExame }: CompromissoEExamesProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Distribuição de Tipo de Compromisso por Situação */}
      <div className="p-6 shadow-md border border-gray-200 rounded-2xl bg-white space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-base font-bold">Distribuição de Tipo de Compromisso por Situação</h3>
          <p className="text-xs text-gray-400">Admissional, Demissional, Periódico, etc. por status</p>
        </div>

        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porTipoCompromisso} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <XAxis dataKey="tipoCompromisso" tick={{ fontSize: 10 }} interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="aguardandoAtendimento" name="Aguardando Atendimento" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="atendido" name="Atendido" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="naoAtendido" name="Não Atendido" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume de Exames Agendados */}
      <div className="p-6 shadow-md border border-gray-200 rounded-2xl bg-white space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-base font-bold">Volume de Exames Agendados</h3>
          <p className="text-xs text-gray-400">Ranking dos exames mais solicitados</p>
        </div>

        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={porVolumeExame.slice(0, 7)} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="exame"
                tick={{ fontSize: 9 }}
                width={120}
                tickFormatter={(val: string) => (val.length > 20 ? val.substring(0, 18) + '...' : val)}
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="quantidade" name="Agendamentos" fill="#006699" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
