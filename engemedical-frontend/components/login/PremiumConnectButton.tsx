"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";

interface PremiumConnectButtonProps {
  isLoading: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export default function PremiumConnectButton({
  isLoading,
  disabled,
  onClick,
}: PremiumConnectButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Floating particles animation
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 3,
    delay: i * 0.1,
    duration: 2 + Math.random() * 1.5,
  }));

  return (
    <div className="relative">
      {/* Glowing background effect - only visible when hover */}
      <motion.div
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1 : 0.95,
        }}
        className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-cyan/50 via-brand-green/40 to-brand-lime/50 blur-xl"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      {/* Particle glow effect */}
      {isHovered && (
        <motion.div
          className="absolute -inset-4 rounded-xl overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute -z-10 rounded-full bg-brand-cyan/30"
              style={{
                width: particle.size * 8,
                height: particle.size * 8,
                left: `${20 + Math.sin(Date.now() / 1000 + particle.id) * 30}%`,
                top: `${20 + Math.cos(Date.now() / 1000 + particle.id) * 30}%`,
              }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>
      )}

      <motion.button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onClick={onClick}
        disabled={isLoading || disabled}
        className="relative z-10 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-transparent
          bg-gradient-to-r from-brand-cyan via-brand-green to-brand-lime
          px-4 py-3.5 font-semibold text-white shadow-[0_8px_32px_rgba(0,46,66,0.3)]
          hover:shadow-[0_12px_48px_rgba(0,46,66,0.45)]
          focus:outline-none focus:ring-4 focus:ring-brand-cyan/30
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-300 cursor-pointer group"
        animate={{
          scale: isPressed ? 0.98 : 1,
          y: isPressed ? 2 : 0,
        }}
        whileHover={{
          scale: isPressed ? 0.98 : 1.02,
          y: isPressed ? 2 : -2,
          boxShadow: "0px 16px 56px rgba(0, 46, 66, 0.4)",
        }}
        whileTap={{ scale: 0.98, y: 2 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
        }}
      >
        {/* Shine animation overlay */}
        <motion.div
          className="absolute inset-0 rounded-xl overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
        >
          <motion.div
            className="absolute top-0 left-[-100%] h-full w-[100%] bg-gradient-to-r from-transparent via-white/30 to-transparent
              transform-gpu"
            animate={{
              left: isHovered ? "100%" : "-100%",
            }}
            transition={{
              duration: 0.8,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Loading state with spinning particles */}
        {isLoading ? (
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              className="relative"
            >
              <Shield className="h-5 w-5 text-white/80" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/30"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>
            <span className="text-sm font-medium">
              Conectando ao ambiente...
            </span>
          </div>
        ) : (
          <>
            <div className="relative flex items-center gap-2">
              {/* Sparkle icon with hover animation */}
              <motion.div
                animate={{ scale: isHovered ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>

              <span className="text-sm font-medium">Conectar</span>

              <motion.div
                animate={{
                  x: isHovered ? 5 : 0,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Zap className="h-5 w-5" />
              </motion.div>

              <ArrowRight
                className={`h-5 w-5 transition-transform duration-300 ${
                  isHovered ? "translate-x-1" : ""
                }`}
              />
            </div>
          </>
        )}
      </motion.button>
    </div>
  );
}