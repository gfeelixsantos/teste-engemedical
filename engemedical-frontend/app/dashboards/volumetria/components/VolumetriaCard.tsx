'use client';

import { Calendar, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export function VolumetriaCard() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push('/dashboards/convocacao')}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 shadow-md hover:shadow-lg transition-shadow"
    >
      <motion.div
        className="flex items-start gap-3"
        whileHover={{ x: -2 }}
      >
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-teal-100 text-teal-600">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Convocação de Exames</h3>
          <p className="text-xs text-gray-500">
            Controle de convocações e status de exames médicos
          </p>
        </div>
        <Users className="h-4 w-4 text-gray-400 ml-auto" />
      </motion.div>
    </button>
  );
}
