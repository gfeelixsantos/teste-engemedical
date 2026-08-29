"use client";
import { motion } from "framer-motion";
import Image from "next/image";

interface CustomAppLoadingProps {
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  fullHeight?: boolean;
  showProgress?: boolean;
}

const sizeConfig = {
  sm: { logo: 48, ring: 64 },
  md: { logo: 64, ring: 88 },
  lg: { logo: 80, ring: 112 },
};

export default function CustomAppLoading({
  title = "Carregando",
  description = "Aguarde um momento...",
  size = "md",
  fullHeight = true,
  showProgress = false,
}: CustomAppLoadingProps) {
  const { logo, ring } = sizeConfig[size];

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: 0.3 },
    },
  };

  const logoVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  };

  const ringVariants = {
    initial: { rotate: 0 },
    animate: {
      rotate: 360,
      transition: {
        duration: 2,
        ease: "linear",
        repeat: Infinity,
      },
    },
  };

  const pulseVariants = {
    initial: { scale: 1, opacity: 0.5 },
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const textVariants = {
    initial: { y: 10, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        delay: 0.3,
        duration: 0.4,
      },
    },
  };

  const progressVariants = {
    initial: { width: "0%" },
    animate: {
      width: ["0%", "70%", "90%", "100%"],
      transition: {
        duration: 2,
        ease: "easeInOut",
        repeat: Infinity,
      },
    },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={containerVariants}
      aria-label={title}
      aria-live="polite"
      className={[
        "flex items-center justify-center bg-white",
        fullHeight ? "min-h-screen" : "min-h-[200px] py-8",
      ].join(" ")}
      role="status"
    >
      <div className="flex flex-col items-center space-y-6">
        {/* Logo container with animations */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={logoVariants}
          className="relative"
        >
          {/* Pulsing glow effect */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={pulseVariants}
            className="absolute inset-0 bg-[#a6ce39] rounded-full blur-xl opacity-20"
            style={{ width: ring, height: ring }}
          />

          {/* Rotating ring */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={ringVariants}
            className="absolute"
            style={{ width: ring, height: ring }}
          >
            <svg
              className="w-full h-full"
              viewBox={`0 0 ${ring} ${ring}`}
              fill="none"
            >
              <circle
                cx={ring / 2}
                cy={ring / 2}
                fill="none"
                r={ring / 2 - 4}
                stroke="url(#ringGradient)"
                strokeWidth="3"
                strokeDasharray={`${ring * 0.7} ${ring * 0.3}`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0698C2" />
                  <stop offset="50%" stopColor="#a6ce39" />
                  <stop offset="100%" stopColor="#0698C2" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>

          {/* Logo image */}
          <div
            className="relative flex items-center justify-center bg-white rounded-full"
            style={{ width: ring, height: ring }}
          >
            <Image
              priority
              alt="Engemedical"
              className="object-contain"
              height={logo}
              src="/images/engemedical_icone.png"
              width={logo}
            />
          </div>
        </motion.div>

        {/* Text content */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={textVariants}
          className="text-center space-y-2"
        >
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </motion.div>

        {/* Optional progress bar */}
        {showProgress && (
          <motion.div
            initial="initial"
            animate="animate"
            variants={textVariants}
            className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden"
          >
            <motion.div
              initial="initial"
              animate="animate"
              variants={progressVariants}
              className="h-full bg-gradient-to-r from-[#0698C2] to-[#a6ce39] rounded-full"
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
