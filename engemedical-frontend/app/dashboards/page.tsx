'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Stethoscope, Lock, BarChart3 } from 'lucide-react';
import { HeaderApp } from '@/components/shared/HeaderApp';
import { logout } from '@/lib/utils';

const dashboards = [
  {
    title: 'Convocação de Exames',
    description: 'Acompanhamento de convocações de exames médicos',
    icon: Stethoscope,
    path: '/dashboards/convocacao',
    color: 'bg-blue-500',
    available: true,
  },
  {
    title: 'Volumetria',
    description: 'Dados de agenda e volumetria de atendimentos',
    icon: Lock,
    path: '',
    color: 'bg-gray-400',
    available: false,
  },
  {
    title: 'Faturamento',
    description: 'Análise financeira e faturamento por empresa',
    icon: Lock,
    path: '',
    color: 'bg-gray-400',
    available: false,
  },
];

export default function DashboardsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      <HeaderApp onLogout={logout}>
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-brand-600" />
          <h1 className="text-xl font-bold text-gray-900">Dashboards</h1>
        </div>
      </HeaderApp>

      <div className="flex-1 overflow-auto p-6">
        <p className="text-sm text-gray-500 mb-6">
          Selecione um dashboard para visualizar os dados.
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
                disabled={!dash.available}
                onClick={() => dash.available && router.push(dash.path)}
                className={`w-full text-left rounded-xl border p-5 transition-all duration-200 ${
                  dash.available
                    ? 'border-brand-200 bg-white hover:border-brand-400 hover:shadow-md cursor-pointer'
                    : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-lg ${dash.color} text-white`}
                  >
                    <dash.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{dash.title}</h3>
                    {!dash.available && (
                      <span className="text-xs text-gray-400">Em breve</span>
                    )}
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
