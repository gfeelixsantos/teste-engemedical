/**
 * SelectNameModal
 * Exibe uma lista de nomes em botões grandes e amigáveis para totens.
 * Utilizado para resolver colisões de ano de nascimento.
 *
 * UX de Confirmação:
 * - 1 clique seleciona e filtra a lista para exibir apenas a opção escolhida, habilitando o botão "Confirmar".
 * - Clique subsequente desmarca a opção, limpando o filtro e ocultando/desabilitando o botão "Confirmar".
 *
 * Conformidade LGPD:
 * - Nome: primeiro e último nome visíveis; nomes do meio são mascarados
 * - CPF: mascarado no padrão ANPD (***.***.***-**)
 * - Data de nascimento: exibida na íntegra (DD/MM/AAAA)
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/react";
import { ArrowLeftIcon, UserIcon, CakeIcon, IdentificationIcon, QuestionMarkCircleIcon, CheckIcon } from "@heroicons/react/24/outline";
import { COLOR_PALETTE } from "@/config/constants";

// ---------------------------------------------------------------------------

export interface SchedulingEntry {
  nome: string;
  cpf: string;
  dataNascimento: string;
}

interface SelectNameModalProps {
  /** Lista de entradas de agendamento */
  entries: SchedulingEntry[];
  /** Callback chamado quando uma entrada é selecionada e confirmada (retorna a entrada ou null para não listado) */
  onSelect: (entry: SchedulingEntry | null) => void;
  /** Callback para voltar ao teclado numérico */
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Helpers de mascaramento LGPD

export const maskMiddleNames = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;

  return parts
    .map((part, index) => {
      const isFirst = index === 0;
      const isLast = index === parts.length - 1;
      const isPreposition = part.length <= 2;

      if (isFirst || isLast || isPreposition) return part;
      return part[0] + "*".repeat(Math.min(part.length - 1, 6));
    })
    .join(" ");
};

export const maskCpf = (cpf: string): string => {
  const digits = cpf.replace(/\D/g, "");
  if (!digits || digits.length !== 11) return cpf ? "***.***.***-**" : "";

  const d1 = digits.slice(3, 6);
  const d2 = digits.slice(6, 9);
  return `***.${d1}.${d2}-**`;
};

// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut", staggerChildren: 0.05 },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// ---------------------------------------------------------------------------

const SelectNameModal: React.FC<SelectNameModalProps> = ({
  entries,
  onSelect,
  onBack,
}) => {
  // Estado para armazenar o item atualmente selecionado: SchedulingEntry, "not_found" (Meu nome não está na lista) ou null
  const [selectedItem, setSelectedItem] = useState<SchedulingEntry | "not_found" | null>(null);

  const handleItemClick = (item: SchedulingEntry | "not_found") => {
    setSelectedItem((prev) => {
      if (prev === item) return null; // Desmarca se clicar novamente no mesmo
      if (prev && typeof prev === "object" && typeof item === "object" && prev.cpf === item.cpf && prev.nome === item.nome) {
        return null; // Desmarca caso o objeto seja idêntico
      }
      return item; // Seleciona novo item
    });
  };

  const handleConfirm = () => {
    if (!selectedItem) return;
    onSelect(selectedItem === "not_found" ? null : selectedItem);
  };

  // Determinar quais itens devem ser renderizados (filtra se houver seleção)
  const isSelected = (entry: SchedulingEntry) => {
    if (!selectedItem || selectedItem === "not_found") return false;
    return selectedItem.cpf === entry.cpf && selectedItem.nome === entry.nome;
  };

  const showEntries = selectedItem && selectedItem !== "not_found"
    ? entries.filter(isSelected)
    : entries;

  const showFallbackButton = !selectedItem || selectedItem === "not_found";

  return (
    <motion.div
      animate="visible"
      className="w-full max-w-xl mx-auto p-1 space-y-3"
      exit="exit"
      initial="hidden"
      variants={containerVariants}
    >
      <div>
        {/* Header - NEUTRALIZADO */}
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold" style={{ color: COLOR_PALETTE.primary }}>
            Confirmação de Identidade
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {selectedItem ? "Confirme a opção selecionada:" : "Selecione o seu nome na lista para continuar:"}
          </p>
        </div>

        {/* Lista de entradas */}
        <div className="space-y-2.5 max-h-[14rem] overflow-y-auto pr-1 mb-3">
          <AnimatePresence mode="popLayout">
            {showEntries.map((entry) => {
              const active = isSelected(entry);
              return (
                <motion.div
                  key={entry.cpf || entry.nome}
                  layout
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  variants={itemVariants}
                >
                  <Button
                    className="w-full py-3 px-4 rounded-xl border flex flex-col items-start gap-1 transition-all duration-150 text-left relative overflow-hidden"
                    style={{
                      backgroundColor: "white",
                      borderColor: active ? COLOR_PALETTE.primary : COLOR_PALETTE.gray,
                      borderWidth: active ? "2px" : "1px",
                      color: COLOR_PALETTE.text,
                      height: "auto",
                      minHeight: "4.2rem",
                    }}
                    onClick={() => handleItemClick(entry)}
                  >
                    {/* Nome (mascarado - nomes do meio) */}
                    <div className="flex items-center gap-3 w-full relative z-10">
                      <div
                        className="p-2 rounded-lg shrink-0"
                        style={{
                          backgroundColor: active ? COLOR_PALETTE.primary : COLOR_PALETTE.light,
                          color: active ? "white" : COLOR_PALETTE.primary,
                        }}
                      >
                        <UserIcon className="h-5 w-5" />
                      </div>
                      <span className="text-lg font-semibold break-words leading-tight flex-1">
                        {maskMiddleNames(entry.nome)}
                      </span>
                      {active && (
                        <div className="p-1 rounded-full bg-emerald-500 text-white shrink-0">
                          <CheckIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Complemento: data de nascimento + CPF mascarado */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-12 text-sm relative z-10" style={{ color: COLOR_PALETTE.gray }}>
                      {entry.dataNascimento && (
                        <span className="flex items-center gap-1">
                          <CakeIcon className="h-4 w-4 shrink-0" />
                          {entry.dataNascimento}
                        </span>
                      )}
                      {entry.cpf && (
                        <span className="flex items-center gap-1 font-mono">
                          <IdentificationIcon className="h-4 w-4 shrink-0" />
                          {maskCpf(entry.cpf)}
                        </span>
                      )}
                    </div>
                  </Button>
                </motion.div>
              );
            })}

            {/* Opção para quando o nome NÃO estiver na lista */}
            {showFallbackButton && (
              <motion.div
                layout
                key="fallback-btn"
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                variants={itemVariants}
              >
                <Button
                  className="w-full py-3 px-4 rounded-xl border-2 flex items-center justify-start gap-4 transition-all duration-150"
                  style={{
                    backgroundColor: selectedItem === "not_found" ? "#fff5f5" : "white",
                    borderColor: selectedItem === "not_found" ? "#e53e3e" : "#feb2b2",
                    borderStyle: selectedItem === "not_found" ? "solid" : "dashed",
                    color: "#c53030",
                    minHeight: "4.2rem",
                  }}
                  onClick={() => handleItemClick("not_found")}
                >
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{
                      backgroundColor: selectedItem === "not_found" ? "#e53e3e" : "#fed7d7",
                      color: selectedItem === "not_found" ? "white" : "#c53030",
                    }}
                  >
                    <QuestionMarkCircleIcon className="h-6 w-6" />
                  </div>
                  <div className="text-left flex-1 flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      Meu nome não está nesta lista
                    </span>
                    {selectedItem === "not_found" && (
                      <div className="p-1 rounded-full bg-red-600 text-white shrink-0">
                        <CheckIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nota LGPD */}
        <p className="text-xs text-center px-2 mb-4" style={{ color: COLOR_PALETTE.gray }}>
          Dados exibidos parcialmente conforme a LGPD (Lei 13.709/2018)
        </p>

        {/* Botão de confirmação animado */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              animate={{ opacity: 1, height: "auto", y: 0 }}
              className="pb-3"
              exit={{ opacity: 0, height: 0, y: 10 }}
              initial={{ opacity: 0, height: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                className="w-full py-6 rounded-xl text-lg font-bold text-white shadow-md hover:shadow-lg transition-all duration-150"
                style={{
                  background: selectedItem === "not_found"
                    ? "linear-gradient(135deg, #e53e3e 0%, #c53030 100%)"
                    : `linear-gradient(135deg, ${COLOR_PALETTE.primary} 0%, ${COLOR_PALETTE.accent} 100%)`,
                }}
                onClick={handleConfirm}
              >
                Confirmar e Emitir Senha
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botão de voltar */}
        <Button
          className="w-full py-4 rounded-xl border text-base font-semibold flex items-center justify-center gap-2"
          style={{
            borderColor: COLOR_PALETTE.gray,
            color: COLOR_PALETTE.gray,
            backgroundColor: "transparent",
          }}
          onClick={onBack}
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Voltar ao teclado
        </Button>
      </div>
    </motion.div>
  );
};

export default SelectNameModal;
