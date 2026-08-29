"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

interface PremiumCyberLoadingProps {
  onComplete?: () => void;
  duration?: number;
}

export default function PremiumCyberLoading({
  onComplete,
  duration = 3000,
}: PremiumCyberLoadingProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, duration / 100);

    const timeout = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [duration, onComplete]);

  const hexagonVariants = {
    initial: { scale: 0, rotate: -180, opacity: 0 },
    animate: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        duration: 1.2,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  };

  const glowVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const textVariants = {
    initial: { y: 20, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        delay: 0.8,
        duration: 0.8,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  };

  const particleVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: (i: number) => ({
      scale: [0, 1, 0],
      opacity: [0, 1, 0],
      rotate: [0, 180],
      transition: {
        delay: i * 0.1,
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    }),
  };

  const particles = Array.from({ length: 12 }, (_, i) => i);

  return (
    <main
      aria-label="Carregando sistema"
      className="min-h-screen bg-gradient-to-br from-[#0a1a0f] via-[#0d2818] to-[#0a1a0f] flex items-center justify-center relative overflow-hidden"
    >
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,78,53,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,78,53,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((i) => (
          <motion.div
            key={i}
            custom={i}
            initial="initial"
            animate="animate"
            variants={particleVariants}
            className="absolute w-1 h-1 bg-[#a6ce39] rounded-full"
            style={{
              top: `${20 + (i * 5) % 60}%`,
              left: `${10 + (i * 7) % 80}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Glow effect behind logo */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={glowVariants}
          className="absolute w-64 h-64 bg-[#a6ce39] rounded-full blur-[100px] opacity-30"
        />

        {/* Logo with hexagon animation */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={hexagonVariants}
          className="relative mb-8"
        >
          <div className="relative">
            {/* Rotating ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, ease: "linear", repeat: Infinity }}
              className="absolute inset-0 w-48 h-48"
            >
              <svg
                className="w-full h-full"
                viewBox="0 0 200 200"
                fill="none"
              >
                <circle
                  cx="100"
                  cy="100"
                  r="95"
                  stroke="url(#gradient1)"
                  strokeWidth="2"
                  strokeDasharray="10 5"
                  opacity="0.5"
                />
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0698C2" />
                    <stop offset="50%" stopColor="#a6ce39" />
                    <stop offset="100%" stopColor="#0698C2" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            {/* Second rotating ring (opposite direction) */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 6, ease: "linear", repeat: Infinity }}
              className="absolute inset-0 w-48 h-48"
            >
              <svg
                className="w-full h-full"
                viewBox="0 0 200 200"
                fill="none"
              >
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  stroke="url(#gradient2)"
                  strokeWidth="1.5"
                  strokeDasharray="15 10"
                  opacity="0.4"
                />
                <defs>
                  <linearGradient id="gradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a6ce39" />
                    <stop offset="100%" stopColor="#0698C2" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            {/* Logo image */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <Image
                priority
                alt="Engemedical"
                className="w-32 h-32 object-contain"
                height={128}
                src="/images/engemedical_icone.png"
                width={128}
              />
            </div>
          </div>
        </motion.div>

        {/* Text with reveal effect */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={textVariants}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl font-bold text-white tracking-wider">
            <span className="text-[#4a9eff]">ENGE</span>
            <span className="text-[#a6ce39]">MEDICAL</span>
          </h1>
          <p className="text-gray-400 text-sm tracking-widest uppercase">
            Brasil
          </p>

          {/* Progress bar */}
          <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mt-6">
            <motion.div
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-[#0698C2] via-[#a6ce39] to-[#4a9eff] rounded-full"
              initial={{ width: "0%" }}
              transition={{ duration: 0.1 }}
            />
          </div>

          <p className="text-gray-500 text-xs mt-2">
            {progress}% Concluído
          </p>
        </motion.div>
      </div>

      {/* Corner accents */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-[#a6ce39] opacity-30" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-[#a6ce39] opacity-30" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-[#a6ce39] opacity-30" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-[#a6ce39] opacity-30" />
    </main>
  );
}
