"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Radar } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

interface PremiumCyberLoadingProps {
  onComplete?: () => void;
  duration?: number;
}

const transitionSteps = [
  "Validando sessão corporativa",
  "Sincronizando ambiente SST",
  "Preparando dashboard operacional",
] as const;

export default function PremiumCyberLoading({
  onComplete,
  duration = 2600,
}: PremiumCyberLoadingProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const shouldReduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const finalDuration = shouldReduceMotion ? 420 : duration;
    const stepDuration = Math.max(finalDuration / transitionSteps.length, 120);

    const interval = window.setInterval(() => {
      setActiveStep((current) =>
        Math.min(current + 1, transitionSteps.length - 1),
      );
    }, stepDuration);

    const timeout = window.setTimeout(() => {
      onComplete?.();
    }, finalDuration);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [duration, onComplete]);

  return (
    <motion.div
      animate={{ opacity: 1 }}
      aria-label="Portal conectado"
      aria-live="polite"
      className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-[#020817] px-5 text-white"
      initial={{ opacity: 0 }}
      role="status"
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(48,209,88,0.22),transparent_28%),radial-gradient(circle_at_18%_18%,rgba(6,152,194,0.2),transparent_30%),linear-gradient(135deg,#020817_0%,#03111f_46%,#06281f_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />
      <motion.div
        animate={{ x: ["-42%", "42%", "-42%"], opacity: [0.24, 0.7, 0.24] }}
        className="absolute top-[48%] h-px w-[72vw] max-w-[760px] bg-gradient-to-r from-transparent via-brand-lime/70 to-transparent shadow-[0_0_30px_rgba(94,225,122,0.45)]"
        transition={{ duration: 4.6, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        animate={{ opacity: [0.16, 0.38, 0.16], scale: [0.94, 1.06, 0.94] }}
        className="absolute h-[420px] w-[420px] rounded-full border border-brand-cyan/20"
        transition={{ duration: 5.6, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        animate={{ opacity: [0.14, 0.3, 0.14], scale: [1.04, 0.96, 1.04] }}
        className="absolute h-[310px] w-[310px] rounded-full border border-brand-green/20"
        transition={{ duration: 6.8, ease: "easeInOut", repeat: Infinity }}
      />

      <motion.section
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 flex w-full max-w-[540px] flex-col items-center rounded-[28px] border border-white/12 bg-white/[0.07] px-7 py-9 text-center shadow-[0_34px_120px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:px-10"
        initial={{ opacity: 0, scale: 0.95, y: 18 }}
        transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative mb-7 grid h-36 w-full place-items-center">
          <motion.div
            animate={{ rotate: 360 }}
            className="absolute h-36 w-36 rounded-full border border-dashed border-brand-cyan/32"
            transition={{ duration: 8, ease: "linear", repeat: Infinity }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            className="absolute h-28 w-28 rounded-full border border-brand-green/28"
            transition={{ duration: 7, ease: "linear", repeat: Infinity }}
          />
          <Image
            priority
            alt="Engemedical Brasil"
            className="relative z-10 h-auto w-[min(74vw,330px)] object-contain drop-shadow-[0_30px_74px_rgba(22,217,245,0.4)]"
            height={190}
            src="/images/logo.png"
            width={430}
          />
        </div>

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-green/28 bg-brand-green/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-brand-lime">
          <Radar className="h-3.5 w-3.5" />
          Portal conectado
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Entrada autorizada
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-white/66">
          Preparando sua operação Engemedical com segurança, contexto clínico e
          dados de SST.
        </p>

        <div className="mt-8 w-full space-y-3 text-left">
          {transitionSteps.map((step, index) => {
            const isActive = index <= activeStep;

            return (
              <motion.div
                key={step}
                animate={{ opacity: isActive ? 1 : 0.45, x: isActive ? 0 : -6 }}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2.5 text-sm text-white/84"
                initial={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.28, delay: index * 0.08 }}
              >
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? "text-brand-lime" : "text-white/28"
                  }`}
                />
                <span>{step}</span>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            animate={{ x: ["-100%", "0%"] }}
            className="h-full rounded-full bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-green"
            transition={{ duration: duration / 1000, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </motion.section>
    </motion.div>
  );
}
