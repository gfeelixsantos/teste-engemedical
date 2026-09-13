"use client";

import { motion } from "framer-motion";
import { Spinner } from "@heroui/react";
import Image from "next/image";

interface AppLoadingProps {
  title?: string;
  description?: string;
  className?: string;
}

const orbitAnimation = {
  rotate: 360,
  transition: { duration: 6, ease: "linear", repeat: Infinity },
};

const orbitReverseAnimation = {
  rotate: -360,
  transition: { duration: 5, ease: "linear", repeat: Infinity },
};

const breatheAnimation = {
  scale: [1, 1.05, 1],
  opacity: [0.6, 1, 0.6],
  transition: { duration: 2.8, ease: "easeInOut", repeat: Infinity },
};

const glowAnimation = {
  scale: [0.95, 1.08, 0.95],
  opacity: [0.3, 0.6, 0.3],
  transition: { duration: 3, ease: "easeInOut", repeat: Infinity },
};

const progressAnimation = {
  x: ["-100%", "0%"],
  transition: { duration: 1.8, ease: [0.4, 0, 0.2, 1], repeat: Infinity },
};

const shimmerAnimation = {
  opacity: [0.4, 1, 0.4],
  transition: { duration: 2, ease: "easeInOut", repeat: Infinity },
};

export default function AppLoading({
  title = "Carregando",
  description = "Aguarde um momento...",
  className = "",
}: AppLoadingProps) {
  return (
    <div
      aria-label={title}
      aria-live="polite"
      className={`flex min-h-[280px] w-full items-center justify-center px-4 py-8 sm:min-h-[340px] sm:px-6 sm:py-12 lg:min-h-[400px] ${className}`}
      role="status"
    >
      <div className="flex w-full max-w-xs flex-col items-center sm:max-w-sm">
        {/* Orbital spinner */}
        <div className="relative mb-6 grid h-24 w-24 place-items-center sm:mb-8 sm:h-32 sm:w-32 lg:h-36 lg:w-36">
          {/* Glow backdrop */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-cyan/15 to-brand-green/10 blur-xl"
            animate={glowAnimation}
          />

          {/* Outer orbit ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-dashed border-brand-cyan/25"
            animate={orbitAnimation}
          />

          {/* Middle orbit ring */}
          <motion.div
            className="absolute inset-3 rounded-full border border-brand-green/20 sm:inset-4"
            animate={orbitReverseAnimation}
          />

          {/* Inner orbit ring */}
          <motion.div
            className="absolute inset-6 rounded-full border border-brand-cyan/15 sm:inset-8"
            animate={{
              rotate: 360,
              transition: { duration: 8, ease: "linear", repeat: Infinity },
            }}
          />

          {/* Orbiting dots */}
          <motion.span
            className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(40,177,207,0.6)]"
            animate={{
              rotate: 360,
              transition: { duration: 3.5, ease: "linear", repeat: Infinity },
            }}
            style={{ transformOrigin: "0 60px" }}
          />
          <motion.span
            className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-green shadow-[0_0_6px_rgba(34,197,94,0.5)]"
            animate={{
              rotate: -360,
              transition: { duration: 4.2, ease: "linear", repeat: Infinity },
            }}
            style={{ transformOrigin: "0 -52px" }}
          />
          <motion.span
            className="absolute top-1/2 right-0 h-1 w-1 -translate-y-1/2 rounded-full bg-brand-cyan/70"
            animate={{
              rotate: 360,
              transition: { duration: 5, ease: "linear", repeat: Infinity },
            }}
            style={{ transformOrigin: "-48px 0" }}
          />

          {/* Center core */}
          <motion.div
            className="relative z-10 grid h-14 w-14 place-items-center rounded-full bg-white shadow-lg shadow-brand-cyan/10 ring-1 ring-brand-cyan/10 sm:h-20 sm:w-20 lg:h-24 lg:w-24"
            animate={breatheAnimation}
          >
            <Image
              priority
              alt=""
              className="h-7 w-auto sm:h-10 lg:h-12"
              height={48}
              src="/images/icone.png"
              width={48}
            />
          </motion.div>
        </div>

        {/* Text content */}
        <div className="text-center">
          <motion.h3
            className="text-sm font-bold tracking-tight text-brand-midnight sm:text-base lg:text-lg"
            animate={shimmerAnimation}
          >
            {title}
          </motion.h3>
          {description && (
            <motion.p
              className="mt-1.5 text-xs text-brand-muted sm:text-sm"
              animate={shimmerAnimation}
              transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, delay: 0.3 }}
            >
              {description}
            </motion.p>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-5 h-1 w-24 overflow-hidden rounded-full bg-brand-cyan/10 sm:mt-6 sm:w-32 lg:w-40">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan"
            animate={progressAnimation}
          />
        </div>

        {/* HeroUI Spinner as secondary indicator */}
        <div className="mt-4 sm:mt-5">
          <Spinner color="primary" size="sm" />
        </div>
      </div>
    </div>
  );
}
