/**
 * BirthYearModal
 * Teclado numérico de 6 dígitos para identificação por Mês e Ano de Nascimento (MM/AAAA).
 * Exibido no fluxo de "Atendimento Geral" no totem de autoatendimento.
 * 
 * Otimizado para visualização horizontal em tablets, evitando rolagem vertical.
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/react";
import { BackspaceIcon, MagnifyingGlassIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { COLOR_PALETTE } from "@/config/constants";

// ---------------------------------------------------------------------------

interface BirthYearModalProps {
  /** Callback chamado quando o usuário confirma o mês e ano digitados (6 dígitos) */
  onConfirm: (mesAno: string) => void;
  /** Callback chamado quando o usuário escolhe não informar seus dados */
  onOptOut: () => void;
  /** Callback para voltar à tela anterior */
  onBack: () => void;
  /** Indica se a consulta ao backend está em andamento */
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "←", "0", "✓"];

// ---------------------------------------------------------------------------

const BirthYearModal: React.FC<BirthYearModalProps> = ({
  onConfirm,
  onOptOut,
  onBack,
  isLoading = false,
}) => {
  const [value, setValue] = useState("");

  // Toca o áudio de orientação por voz ao montar o componente
  useEffect(() => {
    const audio = new Audio("/audio/orientacao_nascimento.mp3");
    audio.play().catch((err) => {
      console.warn("[totem] Não foi possível reproduzir áudio de orientação:", err);
    });

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const handleKey = (key: string) => {
    if (isLoading) return;

    if (key === "←") {
      setValue((prev) => prev.slice(0, -1));
      return;
    }

    if (key === "✓") {
      if (value.length === 8) {
        onConfirm(value);
      }
      return;
    }

    // Máximo 8 dígitos (DD/MM/AAAA)
    if (value.length < 8) {
      setValue((prev) => prev + key);
    }
  };

  const isComplete = value.length === 8;

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-sm mx-auto p-1"
      exit={{ opacity: 0, scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div className="space-y-3">
        {/* Título de Instrução */}
        <div className="text-center">
          <h2 className="text-lg md:text-xl font-bold whitespace-nowrap" style={{ color: COLOR_PALETTE.primary }}>
            Digite sua data de nascimento
          </h2>
          <p className="text-xs mt-0.5" style={{ color: COLOR_PALETTE.gray }}>
            Exemplo: 00/00/0000
          </p>
        </div>

        {/* Display da data de nascimento (DD / MM / AAAA) */}
        <div
          className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border-2 transition-colors"
          style={{
            borderColor: isComplete ? COLOR_PALETTE.primary : COLOR_PALETTE.gray,
            backgroundColor: "white",
          }}
        >
          {/* Dia (2 slots) */}
          <div className="flex gap-1">
            {[0, 1].map((i) => (
              <motion.span
                key={i}
                animate={{ scale: value[i] ? 1 : 0.85, opacity: value[i] ? 1 : 0.3 }}
                className="text-3xl font-bold font-mono w-6 text-center"
                style={{ color: COLOR_PALETTE.primary }}
                transition={{ duration: 0.12 }}
              >
                {value[i] ?? "·"}
              </motion.span>
            ))}
          </div>

          {/* Divisor */}
          <span className="text-2xl font-bold text-gray-400 mx-0.5">/</span>

          {/* Mês (2 slots) */}
          <div className="flex gap-1">
            {[2, 3].map((i) => (
              <motion.span
                key={i}
                animate={{ scale: value[i] ? 1 : 0.85, opacity: value[i] ? 1 : 0.3 }}
                className="text-3xl font-bold font-mono w-6 text-center"
                style={{ color: COLOR_PALETTE.primary }}
                transition={{ duration: 0.12 }}
              >
                {value[i] ?? "·"}
              </motion.span>
            ))}
          </div>

          {/* Divisor */}
          <span className="text-2xl font-bold text-gray-400 mx-0.5">/</span>

          {/* Ano (4 slots) */}
          <div className="flex gap-1">
            {[4, 5, 6, 7].map((i) => (
              <motion.span
                key={i}
                animate={{ scale: value[i] ? 1 : 0.85, opacity: value[i] ? 1 : 0.3 }}
                className="text-3xl font-bold font-mono w-6 text-center"
                style={{ color: COLOR_PALETTE.primary }}
                transition={{ duration: 0.12 }}
              >
                {value[i] ?? "·"}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Teclado numérico */}
        <div className="grid grid-cols-3 gap-1.5">
          {NUMPAD_KEYS.map((key) => {
            const isConfirm = key === "✓";
            const isBack = key === "←";
            const isDisabled =
              isLoading ||
              (isConfirm && !isComplete) ||
              (isBack && value.length === 0);

            return (
              <motion.div
                key={key}
                whileHover={!isDisabled ? { scale: 1.04 } : undefined}
                whileTap={!isDisabled ? { scale: 0.94 } : undefined}
              >
                <Button
                  className="w-full h-11 text-lg font-bold rounded-xl transition-all duration-150"
                  disabled={isDisabled}
                  style={
                    isConfirm
                      ? {
                          background: isComplete
                            ? `linear-gradient(135deg, ${COLOR_PALETTE.primary} 0%, ${COLOR_PALETTE.accent} 100%)`
                            : COLOR_PALETTE.gray,
                          color: "white",
                          opacity: isComplete ? 1 : 0.5,
                        }
                      : isBack
                      ? {
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
                          opacity: value.length === 0 ? 0.4 : 1,
                        }
                      : {
                          backgroundColor: "white",
                          color: COLOR_PALETTE.text,
                          border: `1px solid ${COLOR_PALETTE.gray}`,
                        }
                  }
                  onClick={() => handleKey(key)}
                >
                  {isLoading && isConfirm ? (
                    <span className="animate-spin text-white text-sm">⏳</span>
                  ) : isBack ? (
                    <BackspaceIcon className="h-5 w-5 mx-auto" />
                  ) : isConfirm ? (
                    <MagnifyingGlassIcon className="h-5 w-5 mx-auto" />
                  ) : (
                    key
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Indicador de loading */}
        <AnimatePresence>
          {isLoading && (
            <motion.p
              animate={{ opacity: 1 }}
              className="text-center text-xs font-medium py-0.5"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              style={{ color: COLOR_PALETTE.primary }}
            >
              Verificando cadastro...
            </motion.p>
          )}
        </AnimatePresence>

        {/* Botão Voltar */}
        <div className="pt-2">
          <Button
            className="w-full h-11 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5"
            disabled={isLoading}
            style={{
              borderColor: COLOR_PALETTE.gray,
              color: COLOR_PALETTE.gray,
              backgroundColor: "transparent",
            }}
            onClick={onBack}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Botão Não sei (Despriorizado Visualmente) */}
        <div>
          <Button
            className="w-full h-9 rounded-xl text-xs font-semibold hover:underline"
            disabled={isLoading}
            style={{
              backgroundColor: "transparent",
              color: COLOR_PALETTE.gray,
              boxShadow: "none",
            }}
            onClick={onOptOut}
          >
            Não sei
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default BirthYearModal;
