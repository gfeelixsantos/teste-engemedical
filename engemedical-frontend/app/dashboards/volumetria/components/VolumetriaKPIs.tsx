'use client';

import { motion } from 'framer-motion';
import { Calendar, Users, CalendarCheck, CalendarX, Hourglass } from 'lucide-react';
import CountUp from 'react-countup';
import type { VolumetriaKPIs } from '../types';

export function VolumetriaKPIs({ kpis }: { kpis: VolumetriaKPIs }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {/* Total Agendamentos */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl border border-gray-200 p-4 text-center"
      >
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-teal-100 mx-auto mb-2">
          <Calendar className="h-5 w-5 text-teal-600" />
        </div>
        <span className="text-xs text-gray-500 block mb-1">Agendamentos</span>
        <div className="text-2xl font-bold text-teal-600">
          <CountUp end={kpis.totalAgendamentos} duration={1} separator="." />
        </div>
      </motion.div>

      {/* Total Funcionários */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-gray-200 p-4 text-center"
      >
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 mx-auto mb-2">
          <Users className="h-5 w-5 text-emerald-600" />
        </div>
        <span className="text-xs text-gray-500 block mb-1">Funcionários</span>
        <div className="text-2xl font-bold text-emerald-600">
          <CountUp end={kpis.totalFuncionarios} duration={1} separator="." />
        </div>
      </motion.div>

      {/* Total Atendidos */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 p-4 text-center"
      >
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-green-100 mx-auto mb-2">
          <CalendarCheck className="h-5 w-5 text-green-600" />
        </div>
        <span className="text-xs text-gray-500 block mb-1">Atendidos</span>
        <div className="text-2xl font-bold text-green-600">
          <CountUp end={kpis.totalAtendidos} duration={1} separator="." />
        </div>
      </motion.div>

      {/* Não Atendidos */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-xl border border-gray-200 p-4 text-center"
      >
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-100 mx-auto mb-2">
          <CalendarX className="h-5 w-5 text-red-600" />
        </div>
        <span className="text-xs text-gray-500 block mb-1">Não Atendidos</span>
        <div className="text-2xl font-bold text-red-600">
          <CountUp end={kpis.totalNaoAtendidos} duration={1} separator="." />
        </div>
      </motion.div>

      {/* Aguardando */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 p-4 text-center"
      >
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-100 mx-auto mb-2">
          <Hourglass className="h-5 w-5 text-amber-600" />
        </div>
        <span className="text-xs text-gray-500 block mb-1">Aguardando</span>
        <div className="text-2xl font-bold text-amber-600">
          <CountUp end={kpis.totalAguardando} duration={1} separator="." />
        </div>
      </motion.div>

      {/* Exames */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-xl border border-gray-200 p-4 text-center"
      >
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-100 mx-auto mb-2">
          <Calendar className="h-5 w-5 text-indigo-600" />
        </div>
        <span className="text-xs text-gray-500 block mb-1">Exames</span>
        <div className="text-2xl font-bold text-indigo-600">
          <CountUp end={kpis.totalExames} duration={1} separator="." />
        </div>
      </motion.div>
    </div>
  );
}