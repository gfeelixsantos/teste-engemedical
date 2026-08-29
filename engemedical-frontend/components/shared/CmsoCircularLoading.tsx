"use client";
import { motion } from "framer-motion";
import Image from "next/image";

interface CmsoCircularLoadingProps {
  title?: string;
  description?: string;
  iconSize?: number;
  spinnerColor?: string;
  fullHeight?: boolean;
}

export default function CmsoCircularLoading({
  title = "Carregando",
  description = "Aguarde um momento...",
  iconSize = 64,
  spinnerColor = "#B9D764",
  fullHeight = true,
}: CmsoCircularLoadingProps) {
  const ringSize = iconSize + 24;

  return (
    <div
      aria-label={title}
      aria-live="polite"
      className={[
        "flex items-center justify-center bg-white",
        fullHeight ? "min-h-screen" : "min-h-[320px] py-8",
      ].join(" ")}
      role="status"
    >
      <div className="flex flex-col items-center space-y-6">
        <div
          className="relative flex items-center justify-center"
          style={{ width: ringSize, height: ringSize }}
        >
          <motion.svg
            animate={{ rotate: 360 }}
            className="absolute"
            height={ringSize}
            transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
            width={ringSize}
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              fill="none"
              r={ringSize / 2 - 3}
              stroke={spinnerColor}
              strokeDasharray={`${ringSize * 0.65} ${ringSize * 0.35}`}
              strokeLinecap="round"
              strokeWidth={3}
            />
          </motion.svg>

          <Image
            priority
            alt="CMSO 360°"
            className="relative z-10"
            height={iconSize}
            src="/images/cmso_icone.png"
            width={iconSize}
          />
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
