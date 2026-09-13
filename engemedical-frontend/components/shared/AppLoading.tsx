"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface AppLoadingProps {
  title?: string;
  description?: string;
  className?: string;
}

const ripple = {
  initial: { scale: 0.3, opacity: 0.6 },
  animate: {
    scale: [0.3, 1],
    opacity: [0.6, 0],
    transition: { duration: 2, ease: "easeOut", repeat: Infinity },
  },
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
      className={`flex min-h-[380px] w-full items-center justify-center px-6 py-16 sm:min-h-[460px] sm:py-20 lg:min-h-[540px] ${className}`}
      role="status"
    >
      <div className="flex flex-col items-center gap-10">
        {/* Ripple container */}
        <div className="relative h-32 w-32 sm:h-40 sm:w-40 lg:h-48 lg:w-48">
          {/* Ripple 1 */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-brand-cyan/50"
            {...ripple}
          />

          {/* Ripple 2 */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-brand-cyan/40"
            {...ripple}
            transition={{ duration: 2, ease: "easeOut", repeat: Infinity, delay: 0.5 }}
          />

          {/* Ripple 3 */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-brand-green-400/30"
            {...ripple}
            transition={{ duration: 2, ease: "easeOut", repeat: Infinity, delay: 1 }}
          />

          {/* Ripple 4 */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-brand-green-400/20"
            {...ripple}
            transition={{ duration: 2, ease: "easeOut", repeat: Infinity, delay: 1.5 }}
          />

          {/* Logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              priority
              alt=""
              className="h-14 w-auto sm:h-16 lg:h-20"
              height={80}
              src="/images/icone.png"
              width={80}
            />
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <h3 className="text-sm font-semibold tracking-tight text-brand-midnight sm:text-base lg:text-lg">
            {title}
          </h3>
          {description && (
            <p className="mt-1.5 text-xs text-brand-muted sm:text-sm">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
