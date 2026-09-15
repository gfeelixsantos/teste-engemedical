"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Link,
  Shield,
  ShieldCheck,
} from "lucide-react";

import engemedicalIcon from "@/public/images/logo.png";

const brandPillars = [
  {
    icon: ShieldCheck,
    title: "Confiança para decidir",
  },
  {
    icon: LayoutDashboard,
    title: "SST sem retrabalho",
  },
  {
    icon: BarChart3,
    title: "Visibilidade em tempo real",
  },
  {
    icon: ClipboardCheck,
    title: "Gestão de EPI inteligente",
  },
  {
    icon: FileText,
    title: "Relatórios na palma da mão",
  },
  {
    icon: Shield,
    title: "Compliance automatizado",
  },
  {
    icon: HeartPulse,
    title: "Dados que salvam vidas",
  },
  {
    icon: Link,
    title: "Integração total com seu sistema",
  },
  {
    icon: Activity,
    title: "Acompanhamento contínuo",
  },
];

const TypewriterTitle = ({ text }: { text: string }) => {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    setVisibleText("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, 55);

    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <div className="text-center">
      <span
        aria-label={text}
        className="typewriter-text inline-block min-h-[4.1rem] text-lg font-light tracking-wide text-white/65 drop-shadow-[0_6px_20px_rgba(255,255,255,0.08)] sm:min-h-[4.9rem] sm:text-xl"
      >
        {visibleText}
        <motion.span
          aria-hidden="true"
          animate={{ opacity: [1, 0.2, 1] }}
          className="ml-1 inline-block text-brand-lime"
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          |
        </motion.span>
      </span>
    </div>
  );
};

const ConnectSignal = () => (
  <div aria-hidden className="absolute inset-0">
    <div className="connect-line-primary absolute inset-x-0 top-[66%] h-px bg-gradient-to-r from-transparent via-brand-lime/75 to-transparent shadow-[0_0_26px_rgba(94,225,122,0.42)]" />
    <motion.div
      animate={{ x: ["-18%", "118%"], opacity: [0, 1, 0] }}
      className="absolute left-[-12%] top-[66%] h-px w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent"
      transition={{ duration: 4.8, ease: "easeInOut", repeat: Infinity }}
    />
    <motion.div
      animate={{ x: ["112%", "-28%"], opacity: [0, 0.72, 0] }}
      className="absolute right-[-12%] top-[60%] h-px w-2/5 bg-gradient-to-r from-transparent via-brand-cyan/74 to-transparent"
      transition={{
        delay: 0.9,
        duration: 6.1,
        ease: "easeInOut",
        repeat: Infinity,
      }}
    />
    <motion.div
      animate={{ opacity: [0.24, 0.58, 0.24], scale: [0.98, 1.04, 0.98] }}
      className="absolute left-[10%] top-[18%] h-[42%] w-[80%] rounded-full border border-brand-cyan/20"
      transition={{ duration: 6.2, ease: "easeInOut", repeat: Infinity }}
    />
    <motion.div
      animate={{ opacity: [0.2, 0.5, 0.2], scale: [1.02, 0.96, 1.02] }}
      className="absolute left-[18%] top-[26%] h-[34%] w-[64%] rounded-full border border-brand-green/18"
      transition={{ duration: 7.4, ease: "easeInOut", repeat: Infinity }}
    />
    <div className="absolute left-[21%] top-[66%] h-2 w-2 rounded-full bg-brand-lime shadow-[0_0_22px_rgba(94,225,122,0.72)]" />
    <div className="absolute left-[49%] top-[66%] h-2 w-2 rounded-full bg-brand-cyan shadow-[0_0_22px_rgba(10,171,212,0.7)]" />
    <div className="absolute right-[21%] top-[66%] h-2 w-2 rounded-full bg-brand-green shadow-[0_0_22px_rgba(48,209,88,0.72)]" />
    <div className="absolute left-[21%] top-[66%] h-24 w-px origin-top rotate-[64deg] bg-gradient-to-b from-brand-lime/45 to-transparent" />
    <div className="absolute right-[21%] top-[66%] h-24 w-px origin-top -rotate-[64deg] bg-gradient-to-b from-brand-green/45 to-transparent" />
  </div>
);

interface BrandPanelProps {
  title?: string;
}

export function BrandPanel({ title = "Conectando você ao futuro SST" }: BrandPanelProps) {
  const [visibleCards, setVisibleCards] = useState(brandPillars.slice(0, 3));
  const [rotationKey, setRotationKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleCards((prev) => {
        const currentTitles = prev.map((c) => c.title);
        const available = brandPillars.filter((p) => !currentTitles.includes(p.title));
        if (available.length === 0) return brandPillars.slice(0, 3);

        const shuffled = [...available].sort(() => Math.random() - 0.5);
        const nextCards = [...prev.slice(1), shuffled[0]];
        return nextCards;
      });
      setRotationKey((k) => k + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.section
      animate={{ opacity: 1 }}
      className="cyber-grid relative flex min-h-[500px] flex-col justify-center gap-4 overflow-hidden bg-[#020817] p-6 pt-6 pb-8 text-white md:min-h-[680px] md:p-9 md:py-8"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(48,209,88,0.18),transparent_30%),radial-gradient(circle_at_12%_12%,rgba(6,152,194,0.18),transparent_28%),linear-gradient(135deg,#020817_0%,#03111f_46%,#06281f_100%)]" />
      <motion.div
        animate={{ opacity: [0.34, 0.62, 0.34], x: ["-8%", "4%", "-8%"] }}
        className="absolute inset-x-[-16%] top-[-20%] h-[56%] bg-[linear-gradient(100deg,transparent_10%,rgba(0,46,66,0.42)_34%,rgba(6,152,194,0.18)_55%,rgba(48,209,88,0.24)_76%,transparent_92%)] blur-2xl"
        transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        animate={{ opacity: [0.18, 0.32, 0.18], y: ["0%", "8%", "0%"] }}
        className="absolute inset-x-[-10%] bottom-[-24%] h-[48%] bg-[linear-gradient(100deg,transparent_5%,rgba(22,217,245,0.22)_28%,rgba(139,255,51,0.22)_64%,transparent_94%)] blur-3xl"
        transition={{ duration: 11, ease: "easeInOut", repeat: Infinity }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
      <motion.div
        animate={{ x: ["120%", "-35%"] }}
        className="absolute bottom-28 right-0 h-px w-3/5 bg-gradient-to-r from-transparent via-brand-green/60 to-transparent"
        transition={{
          delay: 1.2,
          duration: 8,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      <div className="compact-brand-stage relative z-10 mb-0 mt-2 flex flex-col items-center gap-0 md:mt-3">
        <div className="relative w-full max-w-[34rem]">
          <div className="relative h-44 w-full sm:h-48 md:h-[15rem] xl:h-[16.5rem]">
            <motion.div
              animate={{ opacity: [0.16, 0.42, 0.16], scale: [0.96, 1.06, 0.96] }}
              className="absolute inset-x-8 inset-y-4 rounded-[44px] bg-brand-cyan/20 blur-3xl"
              transition={{ duration: 5.4, ease: "easeInOut", repeat: Infinity }}
            />
            <ConnectSignal />
            <motion.div
              animate={{ scale: [1, 1.025, 1], y: [0, -4, 0] }}
              className="absolute inset-0 grid place-items-center"
              transition={{ duration: 4.8, ease: "easeInOut", repeat: Infinity }}
            >
              <Image
                priority
                alt="Engemedical"
                className="h-auto w-[82%] max-w-[29rem] object-contain drop-shadow-[0_34px_80px_rgba(22,217,245,0.38)]"
                height={420}
                src={engemedicalIcon}
                width={720}
              />
            </motion.div>
          </div>
          <div className="mt-0">
            <TypewriterTitle text={title} />
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-1">
        <div className="grid gap-3 border-t border-white/10 pt-2 text-sm sm:grid-cols-3">
          {visibleCards.map(({ icon: Icon, title }, index) => (
            <motion.div
              key={`${title}-${rotationKey}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
              className="brand-card-shine group relative overflow-hidden rounded-lg bg-brand-green/60 p-px shadow-[0_18px_42px_rgba(0,0,0,0.18)]"
            >
              <motion.span
                aria-hidden
                animate={{ rotate: 360 }}
                className="absolute left-1/2 top-1/2 h-[240%] w-[240%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_88deg,rgba(139,255,51,0.94)_122deg,rgba(25,232,90,0.86)_150deg,rgba(22,217,245,0.58)_176deg,transparent_216deg,transparent_360deg)]"
                transition={{
                  duration: 5.8,
                  ease: "linear",
                  repeat: Infinity,
                }}
              />
              <div className="relative flex h-full min-h-[76px] items-center gap-3 rounded-[7px] border border-brand-green/22 bg-brand-midnight/88 p-3 backdrop-blur-xl transition-all duration-300 group-hover:border-brand-lime/48 group-hover:bg-brand-deep/94 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_34px_rgba(25,232,90,0.2)]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-green/24 bg-brand-green/10 text-brand-green shadow-[0_0_22px_rgba(25,232,90,0.14)] transition-all duration-300 group-hover:border-brand-lime/44 group-hover:bg-brand-lime/12 group-hover:text-brand-lime group-hover:shadow-[0_0_26px_rgba(139,255,51,0.2)]">
                  <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-5 text-white">
                    {title}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-center gap-1.5 pt-2">
          {brandPillars.map((_, idx) => (
            <span
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx >= brandPillars.indexOf(visibleCards[0]) &&
                idx <= brandPillars.indexOf(visibleCards[visibleCards.length - 1])
                  ? "w-4 bg-brand-green"
                  : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
