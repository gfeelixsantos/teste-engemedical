import { Button } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle } from "lucide-react";
import React, { useState } from "react";

import { COLOR_PALETTE, PREFERENCIAL_OPTIONS } from "@/config/constants";
import { getPreferentialCardSurface } from "@/lib/ticket/ticket-colors";

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.06,
      duration: 0.28,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      when: "afterChildren",
      staggerChildren: 0.03,
      staggerDirection: -1,
      duration: 0.18,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.14,
      ease: "easeIn",
    },
  },
};

const PRIORITY_COLOR = "#C62828";

const PreferencialTipo = ({
  onSelect,
  onBack,
}: {
  onSelect: (tipoPreferencial: string) => void;
  onBack: () => void;
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  const handleOptionClick = (option: string) => {
    if (isSubmitting) return;

    setSelectedOption(option);
    setIsSubmitting(true);

    window.setTimeout(() => {
      onSelect(option);
    }, 140);
  };

  return (
    <motion.div
      animate="visible"
      className="w-full max-w-sm sm:max-w-2xl md:max-w-[46rem] lg:max-w-4xl mx-1 md:mx-2"
      exit="exit"
      initial="hidden"
      variants={containerVariants}
    >
      <div
        className="px-5 py-4 md:px-6 md:py-4 lg:p-10 rounded-2xl shadow-xl border relative overflow-hidden"
        style={{
          backgroundColor: COLOR_PALETTE.background,
          borderColor: `${COLOR_PALETTE.primary}40`,
          boxShadow: "0 24px 60px -34px rgba(68, 115, 94, 0.18)",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${COLOR_PALETTE.primary} 0%, transparent 58%),
                        radial-gradient(circle at 0% 100%, ${COLOR_PALETTE.accent} 0%, transparent 60%)`,
          }}
        />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent rotate-180" />

        <motion.div
          className="text-center mb-5 md:mb-6 lg:mb-12 relative z-10"
          variants={itemVariants}
        >
          <motion.h2
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl lg:text-4xl font-light mb-3 tracking-tight"
            initial={{ opacity: 0, y: -10 }}
            style={{ color: COLOR_PALETTE.text }}
            transition={{ delay: 0.06, duration: 0.24 }}
          >
            Atendimento{" "}
            <span className="font-semibold" style={{ color: PRIORITY_COLOR }}>
              Preferencial
            </span>
          </motion.h2>
          <motion.p
            animate={{ opacity: 1 }}
            className="text-sm md:text-base lg:text-lg font-light"
            initial={{ opacity: 0 }}
            style={{ color: COLOR_PALETTE.gray }}
            transition={{ delay: 0.1, duration: 0.22 }}
          >
            Selecione uma das opções abaixo para continuar
          </motion.p>

          <motion.div
            animate={{ width: 80, opacity: 1 }}
            className="w-20 h-1 mx-auto mt-3 md:mt-2 rounded-full overflow-hidden"
            initial={{ width: 0, opacity: 0 }}
            style={{ backgroundColor: "rgba(198, 40, 40, 0.16)" }}
            transition={{ delay: 0.12, duration: 0.3 }}
          >
            <motion.div
              animate={{ width: "100%" }}
              className="h-full rounded-full"
              initial={{ width: "0%" }}
              style={{ backgroundColor: PRIORITY_COLOR }}
              transition={{ delay: 0.16, duration: 0.4, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-4 lg:gap-6 mb-5 md:mb-6 lg:mb-12 relative z-10">
          <AnimatePresence mode="wait">
            {PREFERENCIAL_OPTIONS.map((option, index) => {
              const surface = getPreferentialCardSurface(
                selectedOption === option,
                hoveredOption === option,
              );

              return (
                <motion.div
                  key={option}
                  className="flex"
                  custom={index}
                  variants={itemVariants}
                  onHoverEnd={() => setHoveredOption(null)}
                  onHoverStart={() => setHoveredOption(option)}
                >
                  <motion.div
                    className="w-full"
                    transition={{ duration: 0.18 }}
                    whileHover={{ y: -4, scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    <Button
                      className="flex flex-col items-center justify-center p-5 md:px-5 md:py-6 lg:p-9 h-40 sm:h-44 md:h-[10.75rem] w-full text-base md:text-lg lg:text-xl font-medium text-white rounded-xl border relative overflow-hidden group transition-all duration-200"
                      disabled={isSubmitting}
                      style={{
                        background: surface.background,
                        borderColor: surface.borderColor,
                        boxShadow: surface.boxShadow,
                      }}
                      onClick={() => handleOptionClick(option)}
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        initial={{ x: "-100%" }}
                        transition={{ duration: 0.65, ease: "easeInOut" }}
                        whileHover={{ x: "100%" }}
                      />
                      <div className="absolute inset-[1px] rounded-[calc(0.75rem-1px)] border border-white/10" />

                      <motion.div
                        animate={{
                          scale: selectedOption === option ? 1.02 : 1,
                          y: selectedOption === option ? -1 : 0,
                        }}
                        className="relative z-10"
                        transition={{ duration: 0.18, ease: "easeOut" }}
                      >
                        {selectedOption === option && (
                          <motion.div
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute -top-4 -right-1"
                            exit={{ scale: 0, opacity: 0 }}
                            initial={{ scale: 0, opacity: 0 }}
                          >
                            <div className="relative">
                              <motion.div
                                animate={{ scale: [1, 1.45, 1] }}
                                className="absolute inset-0 rounded-full"
                                style={{ backgroundColor: PRIORITY_COLOR }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              />
                              <CheckCircle className="w-6 h-6 text-white relative z-10" />
                            </div>
                          </motion.div>
                        )}
                      </motion.div>

                      <motion.span
                        animate={{
                          scale: selectedOption === option ? 1.03 : 1,
                          y: selectedOption === option ? 1 : 0,
                        }}
                        className="text-center leading-tight font-semibold relative z-10 px-2 md:px-1 text-2xl md:text-[1.55rem] lg:text-[2rem]"
                        style={{ letterSpacing: "0.01em" }}
                      >
                        {option}
                      </motion.span>

                      <motion.span
                        className="text-sm md:text-[0.95rem] opacity-0 group-hover:opacity-75 transition-opacity duration-200 mt-2"
                        style={{ letterSpacing: "0.01em" }}
                      >
                        Clique para selecionar
                      </motion.span>

                      {selectedOption === option && isSubmitting && (
                        <motion.div
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute bottom-3 right-3"
                          exit={{ opacity: 0, scale: 0 }}
                          initial={{ opacity: 0, scale: 0 }}
                        >
                          <div className="relative">
                            <motion.div
                              animate={{ rotate: 360 }}
                              className="w-5 h-5 rounded-full border-2"
                              style={{
                                borderColor: "rgba(255, 255, 255, 0.28)",
                                borderTopColor: "white",
                              }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <motion.div
          className="flex justify-center relative z-10"
          variants={itemVariants}
        >
          <motion.div
            transition={{ duration: 0.18 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              className="px-8 py-4 rounded-xl text-sm md:text-base font-medium group transition-all duration-200 relative overflow-hidden"
              disabled={isSubmitting}
              style={{
                backgroundColor: "transparent",
                color: PRIORITY_COLOR,
                border: "1px solid rgba(198, 40, 40, 0.24)",
              }}
              onClick={onBack}
            >
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                style={{ backgroundColor: PRIORITY_COLOR }}
                transition={{ duration: 0.2 }}
                whileHover={{ opacity: 0.05 }}
              />

              <div className="flex items-center relative z-10">
                <motion.div
                  animate={{ x: hoveredOption ? -2 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
                </motion.div>
                Voltar
              </div>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default React.memo(PreferencialTipo);
