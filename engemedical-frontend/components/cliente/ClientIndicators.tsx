"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useEmpresas } from "./EmpresaProvider";
import {
  FileText, Users, AlertTriangle, CheckCircle,
  Clock, Shield,
} from "lucide-react";

interface Indicator {
  label: string;
  value: number;
  suffix?: string;
  icon: JSX.Element;
  color: string;
  bgColor: string;
}

export function ClientIndicators() {
  const { selectedEmpresa } = useEmpresas();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const INDICATORS: Indicator[] = [
    {
      label: "Exames Realizados",
      value: 127,
      icon: <FileText className="h-5 w-5" />,
      color: "text-[#0d3224]",
      bgColor: "bg-[#0d3224]/10",
    },
    {
      label: "Colaboradores Ativos",
      value: 84,
      icon: <Users className="h-5 w-5" />,
      color: "text-[#0f3460]",
      bgColor: "bg-[#0f3460]/10",
    },
    {
      label: "ASOs Pendentes",
      value: 3,
      icon: <Clock className="h-5 w-5" />,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Alertas de Validade",
      value: 7,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Conformidade NR",
      value: 94,
      suffix: "%",
      icon: <Shield className="h-5 w-5" />,
      color: "text-[#1a7a56]",
      bgColor: "bg-[#1a7a56]/10",
    },
    {
      label: "Programas Ativos",
      value: 6,
      icon: <CheckCircle className="h-5 w-5" />,
      color: "text-[#0d3224]",
      bgColor: "bg-[#0d3224]/10",
    },
  ];

  function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!mounted) return;
      const duration = 1200;
      const steps = 30;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }, [mounted, value]);

    return (
      <span>
        {count}{suffix}
      </span>
    );
  }

  return (
    <section className="mt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Painel da Empresa</h2>
        <p className="mt-1 text-sm text-gray-500">
          Indicadores em tempo real
          {selectedEmpresa && (
            <span className="ml-1 font-medium text-[#0d3224]">
              — {selectedEmpresa.NOMEABREVIADO || selectedEmpresa.RAZAOSOCIAL}
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INDICATORS.map((indicator, index) => (
          <motion.div
            key={indicator.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-[#aacf33]/30 hover:shadow-md"
          >
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${indicator.bgColor} ${indicator.color}`}>
              {indicator.icon}
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight text-gray-900">
                <AnimatedNumber value={indicator.value} suffix={indicator.suffix} />
              </p>
              <p className="text-xs font-medium text-gray-500">{indicator.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
