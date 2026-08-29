"use client";

import { motion } from "framer-motion";
import { Stethoscope, FileSignature, ShieldCheck, Monitor } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";

// FEATURES — fora do componente (evita recriação)
const features = [
  {
    icon: Stethoscope,
    title: "Atendimento 100% Digital",
    description: "Prontuário eletrônico e exames integrados em tempo real.",
  },
  {
    icon: FileSignature,
    title: "Assinatura Eletrônica Avançada",
    description: "ASOs e laudos com validade jurídica e segurança total.",
  },
  {
    icon: ShieldCheck,
    title: "Integração SOC & eSocial",
    description: "Sincronização automática para total conformidade legal.",
  },
  {
    icon: Monitor,
    title: "Painel de Chamadas",
    description: "Gestão inteligente do fluxo da recepção ao atendimento.",
  },
];

export default function CMSO360Animation() {
  const [currentFeature, setCurrentFeature] = useState(0);

  // Timer mais leve (timeout ao invés de interval)
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentFeature]);

  return (
    <div className="space-y-8">
      {/* Logo */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <Image
          priority
          alt="CMSO 360 - Sistema Interno de Gestão"
          className="w-auto mx-auto"
          height={60}
          src="/images/logo.png"
          width={200}
        />
      </motion.div>

      {/* Área animada isolada */}
      <FeatureCarousel current={currentFeature} />

      {/* Indicadores */}
      <div className="flex justify-center space-x-2">
        {features.map((_, index) => (
          <motion.button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              currentFeature === index ? "bg-[#104e35] w-6" : "bg-gray-300"
            }`}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentFeature(index)}
          />
        ))}
      </div>

      {/* Rodapé */}
      <motion.div
        animate={{ opacity: 1 }}
        className="text-center"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-[#104e35]">Atualização</span> 06/2026
        </p>
      </motion.div>
    </div>
  );
}

function FeatureCarousel({ current }: { current: number }) {
  return (
    <div className="relative h-32">
      {features.map((feature, index) => {
        const Icon = feature.icon;

        return (
          <motion.div
            key={index}
            animate={{
              opacity: current === index ? 1 : 0,
              x: current === index ? 0 : 15,
            }}
            className={`absolute inset-0 flex items-center justify-center ${
              current === index ? "pointer-events-auto" : "pointer-events-none"
            }`}
            initial={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.45 }}
          >
            <div className="text-center">
              <motion.div
                animate={{
                  scale: current === index ? 1 : 0.85,
                }}
                className="w-16 h-16 bg-gradient-to-br from-[#104e35] to-[#a6ce39] rounded-full flex items-center justify-center mx-auto mb-3"
                transition={{ duration: 0.45 }}
              >
                <Icon className="h-8 w-8 text-white" />
              </motion.div>

              <h3 className="font-semibold text-gray-800">{feature.title}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {feature.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
