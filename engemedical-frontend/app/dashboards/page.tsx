'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, UserX, Globe, HeartPulse, FileCheck } from 'lucide-react';

const dashboards = [
  {
    title: 'Convocação de Exames',
    description: 'Acompanhamento de convocações de exames médicos',
    icon: Activity,
    path: '/dashboards/convocacao',
    color: 'bg-blue-500',
  },
  {
    title: 'Volumetria',
    description: 'Dados de agenda e volumetria de atendimentos',
    icon: TrendingUp,
    path: '/dashboards/volumetria',
    color: 'bg-indigo-500',
  },
  {
    title: 'Absenteísmo',
    description: 'Análise de afastamentos e atestados médicos',
    icon: UserX,
    path: '/dashboards/absenteismo',
    color: 'bg-orange-500',
  },
  {
    title: 'eSocial',
    description: 'Eventos eSocial e status de envio',
    icon: Globe,
    path: '/dashboards/esocial',
    color: 'bg-purple-500',
  },
  {
    title: 'Gestão de Vidas',
    description: 'Custos, produtos e vidas ativas por empresa',
    icon: HeartPulse,
    path: '/dashboards/vidas',
    color: 'bg-green-500',
  },
  {
    title: 'Documentos SST',
    description: 'Controle de vencimento de PGR e PCMSO',
    icon: FileCheck,
    path: '/dashboards/documentos',
    color: 'bg-teal-500',
  },
  {
    title: 'Profissionais',
    description: 'Controle geral de agendamentos por profissionais',
    icon: Activity,
    path: '/dashboards/profissionais',
    color: 'bg-cyan-500',
  },
];

export default function DashboardsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-2 flex items-center gap-3">
          <Activity className="h-6 w-6 text-brand-600" />
          <h1 className="text-xl font-bold text-gray-900">Dashboards Premium</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Selecione um dashboard para visualizar os dados em tempo real.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((dash, index) => (
            <motion.div
              key={dash.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                type="button"
                onClick={() => router.push(dash.path)}
                className="w-full text-left rounded-xl border border-brand-200 bg-white p-5 shadow-md transition-all duration-200 hover:border-brand-400 hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-lg ${dash.color} text-white`}
                  >
                    <dash.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{dash.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{dash.description}</p>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
