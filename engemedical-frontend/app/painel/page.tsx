"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import io, { Socket } from "socket.io-client";
import { AnimatePresence, motion } from "framer-motion";
import {
  History,
  Loader2,
  Monitor,
  Settings,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Image } from "@heroui/react";

import {
  NEST_URL,
  NEXT_WS_URL,
  SERVICES_KEY,
} from "@/config/constants";
import { useUnits } from "@/lib/config/useUnits";
import painelAudioFallback from "@/lib/painel/painel-audio-fallback";
import { getReceptionToneByTicket } from "@/lib/ticket/ticket-colors";

type PainelCall = {
  id: number;
  name?: string;
  sala: string;
  ticket: string;
  exame: string;
  audio?: string;
  socketId?: string;
  unidade: string;
};

type SchedulingSnapshot = {
  _id: string;
  NOME?: string;
  UNIDADEATENDIMENTO?: string;
  TICKET?: {
    id?: number;
    numero?: number;
    prefixo?: string;
    sala?: string;
    exame?: string;
    unidade?: string;
    status?: string;
    emissao?: string | Date;
    updatedAt?: string | Date;
  } | null;
};

// Configurações do painel
const PAINEL_CONFIG = {
  tempoChamada: 2500,
  timerVideo: 10000,
  qtdChamadas: 1,
  qtdFilaPainel: 12,
  tempoInatividadeMinutos: 1,
  duracaoIdleSegundos: 15,
  welcomeMessage: "Bem-vindo ao Centro Médico de Saúde Ocupacional.",
  audioUrls: {
    bemvindo: "/audio/bemvindo.mp3",
    notificacao: "/audio/painel3.mp3",
  },
};

// Configurações do Idle Screen
const IDLE_CONFIG = {
  tempoInatividadeMinutos: 2,
  duracaoIdleSegundos: 15,
};

const DIVULGACAO_CONFIG = {
  tempoExibicaoItem: 8,
  items: [
    {
      id: 1,
      tipo: "imagem",
      src: "/images/dramed.png",
      titulo: "Novembro Azul",
      subtitulo: "Mês de combate ao câncer de próstata",
      conteudo: [
        "Cuide da sua saúde, a prevenção é o melhor caminho contra o câncer de próstata.",
      ],
    },
    {
      id: 2,
      tipo: "imagem",
      src: "/images/rioclaro.jpg",
      titulo: "Rio Claro",
      subtitulo: "Matriz",
      conteudo: [
        "Atuando há mais de 20 anos",
        "Infraestrutura completa",
        "Gestão SST completa",
      ],
    },
    {
      id: 3,
      tipo: "imagem",
      src: "/images/cordeirópolis.jpg",
      titulo: "Cordeirópolis",
      subtitulo: "Filial",
      conteudo: [
        "Exames radiológicos",
        "Atendimento Rio Claro e região",
        "Ultrassonografia",
      ],
    },
    {
      id: 4,
      tipo: "imagem",
      src: "/images/araras.jpg",
      titulo: "Araras",
      subtitulo: "Filial",
      conteudo: ["Exames Ocupacionais", "Excelente localização"],
    },
  ],
};

const examesColors: Record<string, { primary: string; text: string }> = {
  "Acuidade Visual": { primary: "#C6B100", text: "#ffffff" },
  Audiometria: { primary: "#6B950B", text: "#ffffff" },
  "Exame Clínico": { primary: "#BC3112", text: "#ffffff" },
  Dinamometria: { primary: "#4B90BF", text: "#ffffff" },
  ECG: { primary: "#4E211E", text: "#ffffff" },
  EEG: { primary: "#17843A", text: "#ffffff" },
  Espirometria: { primary: "#835cb9", text: "#ffffff" },
  RECEPCAO: { primary: "#09008a", text: "#ffffff" },
  Laboratório: { primary: "#BB6101", text: "#ffffff" },
  Psicossocial: { primary: "#310966", text: "#ffffff" },
  "Raio-X": { primary: "#8F8E92", text: "#1a1a1a" },
  Triagem: { primary: "#0f97ff", text: "#ffffff" },
  Ultrassom: { primary: "#2a9d8f", text: "#ffffff" },
};

const { playNativeSpeechFallback, playPreparedAudioWithFallback } =
  painelAudioFallback;

const COLOR_PALETTE = {
  primary: "#44735e",
  accent: "#5a8c7a",
  light: "#f8fcf9",
  white: "#ffffff",
  lightGray: "#f0f5f2",
  border: "#e1e9e4",
  text: "#2a4a3a",
  textLight: "#6b7f76",
  dark: "#1a2a1f",
};

const getCallColors = (call?: PainelCall) => {
  if (!call) {
    return { primary: COLOR_PALETTE.primary, text: COLOR_PALETTE.white };
  }

  if (call.exame !== "RECEPCAO") {
    return examesColors[call.exame] || examesColors["Raio-X"];
  }

  return getReceptionToneByTicket(call.ticket);
};

const diaSemana = (date: Date): string => {
  const dias = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];

  return dias[date.getDay()];
};

const mesAtual = (date: Date): string => {
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return meses[date.getMonth()];
};

// Componentes responsivos
const CounterCard = ({ label, value }: { label: string; value: number }) => (
  <div
    className="rounded-2xl px-2 sm:px-3 md:px-4 py-1 sm:py-2 md:py-3 shadow-sm border min-w-[60px] sm:min-w-[80px] md:min-w-[100px] lg:min-w-[120px] backdrop-blur-sm"
    style={{
      backgroundColor: COLOR_PALETTE.white,
      borderColor: COLOR_PALETTE.border,
      boxShadow: "0 2px 12px rgba(68, 115, 94, 0.08)",
    }}
  >
    <div
      className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black leading-none tracking-tight text-center"
      style={{ color: COLOR_PALETTE.primary }}
    >
      {value}
    </div>
    <div
      className="mt-1 text-xs sm:text-xs md:text-sm uppercase tracking-wider font-semibold text-center truncate px-1"
      style={{ color: COLOR_PALETTE.textLight }}
    >
      {label}
    </div>
  </div>
);

const PreviousCallCard = ({ c }: { c: PainelCall }) => {
  const colors = useMemo(() => getCallColors(c), [c]);

  return (
    <motion.div
      className="rounded-xl p-2 sm:p-3 md:p-4 flex-1 min-w-0 shadow-sm border backdrop-blur-sm"
      style={{
        backgroundColor: colors.primary + "20",
        borderColor: colors.primary,
        color: COLOR_PALETTE.text,
        boxShadow: "0 2px 8px rgba(68, 115, 94, 0.05)",
      }}
      whileHover={{ y: -2, scale: 1.02 }}
    >
      <div
        className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold truncate"
        style={{ color: colors.primary }}
      >
        {c.name ? c.name : `SENHA ${c.ticket}`}
      </div>
      <div
        className="mt-1 sm:mt-2 inline-flex items-center gap-1 sm:gap-2 font-bold text-sm sm:text-base md:text-lg lg:text-xl rounded-full px-2 sm:px-3 py-0.5 sm:py-1"
        style={{
          backgroundColor: colors.primary,
          color: colors.text,
        }}
      >
        <span className="truncate">{c.sala}</span>
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-current animate-pulse" />
        <span className="truncate">{c.exame ?? "ATENDIMENTO"}</span>
      </div>
    </motion.div>
  );
};

// Modal de Ativação de Áudio com suporte a tela cheia
const AudioActivationModal = ({ onActivate }: { onActivate: () => void }) => {
  const handleActivate = () => {
    onActivate();
  };

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
    >
      <motion.div
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-md mx-auto shadow-2xl"
        initial={{ scale: 0.8, opacity: 0 }}
        style={{
          borderColor: COLOR_PALETTE.border,
        }}
      >
        <div className="text-center">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 rounded-2xl flex items-center justify-center"
            style={{
              backgroundColor: COLOR_PALETTE.primary,
              backgroundImage:
                "linear-gradient(135deg, #44735e 0%, #5a8c7a 100%)",
            }}
          >
            <Maximize2 className="text-white" size={20} />
          </div>

          <h2
            className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4"
            style={{ color: COLOR_PALETTE.primary }}
          >
            Ativação de Áudio e Tela Cheia
          </h2>
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-600 mb-2">
              <Maximize2 size={16} />
              <span>Modo tela cheia será ativado</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-600">
              <Volume2 size={16} />
              <span>Áudio será liberado</span>
            </div>
          </div>

          <button
            className="w-full rounded-xl px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-bold text-white transition-all hover:shadow-lg transform hover:scale-[1.02] text-sm sm:text-base"
            style={{
              background: `linear-gradient(135deg, ${COLOR_PALETTE.primary} 0%, ${COLOR_PALETTE.accent} 100%)`,
              boxShadow: "0 4px 14px rgba(68, 115, 94, 0.3)",
            }}
            onClick={handleActivate}
          >
            <Maximize2 className="inline mr-2" size={18} /> ATIVAR ÁUDIO E TELA
            CHEIA
          </button>

          <button
            className="w-full mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors"
            style={{ color: COLOR_PALETTE.textLight }}
            onClick={() => onActivate()}
          >
            Continuar sem áudio e tela cheia
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Idle Screen com conteúdo de divulgação
interface IdleProps {
  unidadeSelecionada: string;
}

const IdleScreen = ({ unidadeSelecionada }: IdleProps) => {
  const [itemAtual, setItemAtual] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const rotacionarItens = () => {
      setItemAtual((prev) =>
        prev === DIVULGACAO_CONFIG.items.length - 1 ? 0 : prev + 1,
      );
    };

    timeoutRef.current = setTimeout(
      rotacionarItens,
      DIVULGACAO_CONFIG.tempoExibicaoItem * 1000,
    );

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [itemAtual]);

  const item = DIVULGACAO_CONFIG.items[itemAtual];

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-white overflow-hidden"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute top-2 sm:top-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-1 sm:gap-2">
        {DIVULGACAO_CONFIG.items.map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
              index === itemAtual ? "bg-white scale-125" : "bg-white/50"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          key={item.id}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full h-full max-w-3xl sm:max-w-4xl md:max-w-5xl rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl bg-white"
          initial={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {item.tipo === "video" ? (
            <video
              loop
              muted
              autoPlay={true}
              className="w-full h-full object-cover"
              src={item.src}
            />
          ) : (
            <Image
              removeWrapper
              alt={item.titulo}
              className="w-full h-full object-cover"
              src={item.src}
            />
          )}
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 bg-gradient-to-br from-green-600 to-green-950">
        <motion.div
          key={`content-${item.id}`}
          animate={{ x: 0, opacity: 1 }}
          className="text-white max-w-xl sm:max-w-2xl w-full"
          initial={{ x: 50, opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            animate={{ y: 0, opacity: 1 }}
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black mb-2 sm:mb-3 md:mb-4 leading-tight"
            initial={{ y: 30, opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {item.titulo}
          </motion.h1>

          {item.subtitulo && (
            <motion.p
              animate={{ y: 0, opacity: 1 }}
              className="text-sm sm:text-base md:text-lg lg:text-xl font-light mb-3 sm:mb-4 md:mb-6 text-blue-200"
              initial={{ y: 20, opacity: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {item.subtitulo}
            </motion.p>
          )}

          <motion.div
            animate={{ y: 0, opacity: 1 }}
            className="space-y-2 sm:space-y-3"
            initial={{ y: 20, opacity: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            {Array.isArray(item.conteudo) ? (
              <ul className="space-y-1 sm:space-y-2">
                {item.conteudo.map((linha, index) => (
                  <motion.li
                    key={index}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-start gap-1 sm:gap-2 md:gap-3 text-xs sm:text-sm md:text-base lg:text-lg"
                    initial={{ x: -20, opacity: 0 }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                  >
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-400 rounded-full mt-1.5 sm:mt-2 md:mt-3 flex-shrink-0" />
                    <span className="leading-relaxed text-xs sm:text-sm md:text-base lg:text-lg">
                      {linha}
                    </span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <motion.p
                animate={{ x: 0, opacity: 1 }}
                className="text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed"
                initial={{ x: -20, opacity: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                {item.conteudo}
              </motion.p>
            )}
          </motion.div>

          <motion.div
            animate={{ scale: 1, opacity: 1 }}
            className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/20"
            initial={{ scale: 0, opacity: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-white/70 gap-1 sm:gap-2">
              <span>{new Date().getFullYear()} • CMSO</span>
              <span className="truncate">{unidadeSelecionada}</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Modal de Configurações
const ConfigModal = ({
  isOpen,
  onClose,
  audioHabilitado,
  identificacaoAtiva,
  unidadeSelecionada,
  filtroChamada,
  onSave,
  unidades,
}: {
  isOpen: boolean;
  onClose: () => void;
  audioHabilitado: boolean;
  identificacaoAtiva: boolean;
  unidadeSelecionada: string;
  filtroChamada: string;
  onSave: (payload: {
    unidade: string;
    filtro: "CONJUNTO" | "RECEPÇÃO" | "ATENDIMENTO";
    audioHabilitado: boolean;
    identificacaoAtiva: boolean;
  }) => void;
  unidades: string[];
}) => {
  const [draftUnidade, setDraftUnidade] = useState(unidadeSelecionada);
  const [draftFiltroChamada, setDraftFiltroChamada] = useState(filtroChamada);
  const [draftAudioHabilitado, setDraftAudioHabilitado] =
    useState(audioHabilitado);
  const [draftIdentificacaoAtiva, setDraftIdentificacaoAtiva] =
    useState(identificacaoAtiva);

  useEffect(() => {
    if (!isOpen) return;
    setDraftUnidade(unidadeSelecionada);
    setDraftFiltroChamada(filtroChamada);
    setDraftAudioHabilitado(audioHabilitado);
    setDraftIdentificacaoAtiva(identificacaoAtiva);
  }, [isOpen, unidadeSelecionada, filtroChamada, audioHabilitado, identificacaoAtiva]);

  if (!isOpen) return null;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-3 sm:p-4 md:p-6 w-full max-w-md mx-auto shadow-xl"
        exit={{ scale: 0.9, opacity: 0 }}
        initial={{ scale: 0.9, opacity: 0 }}
        style={{
          borderColor: COLOR_PALETTE.border,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4"
          style={{ color: COLOR_PALETTE.primary }}
        >
          Configurações do Painel
        </h2>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <label
              className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
              htmlFor="config-unidade"
              style={{ color: COLOR_PALETTE.text }}
            >
              Unidade
            </label>
            <select
              className="w-full rounded-xl border px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all text-xs sm:text-sm md:text-base"
              id="config-unidade"
              style={{
                borderColor: COLOR_PALETTE.border,
                color: COLOR_PALETTE.text,
                backgroundColor: COLOR_PALETTE.lightGray,
              }}
              value={draftUnidade}
              onChange={(e) => setDraftUnidade(e.target.value)}
            >
              {unidades.map((unidade) => (
                <option key={unidade} value={unidade}>
                  {unidade}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2"
              htmlFor="config-chamada"
              style={{ color: COLOR_PALETTE.text }}
            >
              Chamada
            </label>
            <select
              className="w-full rounded-xl border px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all text-xs sm:text-sm md:text-base"
              id="config-chamada"
              style={{
                borderColor: COLOR_PALETTE.border,
                color: COLOR_PALETTE.text,
                backgroundColor: COLOR_PALETTE.lightGray,
              }}
              value={draftFiltroChamada}
              onChange={(e) =>
                setDraftFiltroChamada(
                  e.target.value as "CONJUNTO" | "RECEPÇÃO" | "ATENDIMENTO",
                )
              }
            >
              <option value="CONJUNTO">CONJUNTO</option>
              <option value="RECEPÇÃO">RECEPÇÃO</option>
              <option value="ATENDIMENTO">ATENDIMENTO</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span
              className="text-xs sm:text-sm md:text-base"
              style={{ color: COLOR_PALETTE.text }}
            >
              Áudio
            </span>
            <button
              className={`relative inline-flex h-5 sm:h-6 w-10 sm:w-11 items-center rounded-full transition-colors ${
                draftAudioHabilitado ? "bg-green-500" : "bg-gray-300"
              }`}
              onClick={() => setDraftAudioHabilitado(!draftAudioHabilitado)}
            >
              <span
                className={`inline-block h-3.5 sm:h-4 w-3.5 sm:w-4 transform rounded-full bg-white transition-transform ${
                  draftAudioHabilitado
                    ? "translate-x-5 sm:translate-x-6"
                    : "translate-x-0.5 sm:translate-x-1"
                }`}
              />
            </button>
          </div>

          <div
            className="flex items-center gap-2 text-xs sm:text-sm"
            style={{ color: COLOR_PALETTE.textLight }}
          >
            {draftAudioHabilitado ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {draftAudioHabilitado ? "Audio ativado" : "Audio desativado"}
          </div>

          {/* Toggle: Identificação no Atendimento Geral */}
          <div
            className="border-t pt-3 sm:pt-4"
            style={{ borderColor: COLOR_PALETTE.border }}
          >
            <div className="flex items-center justify-between">
              <div>
                <span
                  className="block text-xs sm:text-sm md:text-base font-medium"
                  style={{ color: COLOR_PALETTE.text }}
                >
                  Identificação no Atendimento Geral
                </span>
                <span
                  className="block text-xs mt-0.5"
                  style={{ color: COLOR_PALETTE.textLight }}
                >
                  Solicitar mês e ano de nascimento ao funcionário
                </span>
              </div>
              <button
                className={`relative inline-flex h-5 sm:h-6 w-10 sm:w-11 items-center rounded-full transition-colors ${
                  draftIdentificacaoAtiva ? "bg-green-500" : "bg-gray-300"
                }`}
                onClick={() => setDraftIdentificacaoAtiva(!draftIdentificacaoAtiva)}
              >
                <span
                  className={`inline-block h-3.5 sm:h-4 w-3.5 sm:w-4 transform rounded-full bg-white transition-transform ${
                    draftIdentificacaoAtiva
                      ? "translate-x-5 sm:translate-x-6"
                      : "translate-x-0.5 sm:translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
          <button
            className="flex-1 rounded-xl px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 font-semibold transition-all border text-xs sm:text-sm md:text-base"
            style={{
              borderColor: COLOR_PALETTE.border,
              color: COLOR_PALETTE.text,
              backgroundColor: COLOR_PALETTE.lightGray,
            }}
            onClick={onClose}
          >
            Fechar
          </button>
          <button
            className="flex-1 rounded-xl px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 font-semibold text-white transition-all text-xs sm:text-sm md:text-base"
            style={{
              backgroundColor: COLOR_PALETTE.primary,
            }}
            onClick={() => {
              onSave({
                unidade: draftUnidade,
                filtro: draftFiltroChamada as
                  | "CONJUNTO"
                  | "RECEPÇÃO"
                  | "ATENDIMENTO",
                audioHabilitado: draftAudioHabilitado,
                identificacaoAtiva: draftIdentificacaoAtiva,
              });
            }}
          >
            Salvar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Socket como variável global fora do componente
let socket: Socket | null = null;

// Função para entrar em tela cheia
const enterFullscreen = (element: HTMLElement) => {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if ((element as any).webkitRequestFullscreen) {
    (element as any).webkitRequestFullscreen();
  } else if ((element as any).msRequestFullscreen) {
    (element as any).msRequestFullscreen();
  }
};

// Função para sair da tela cheia
const exitFullscreen = () => {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if ((document as any).webkitExitFullscreen) {
    (document as any).webkitExitFullscreen();
  } else if ((document as any).msExitFullscreen) {
    (document as any).msExitFullscreen();
  }
};

export default function PainelPage() {
  const { unidades } = useUnits();
  const [chamadaAtual, setChamadaAtual] = useState<PainelCall>();
  const [anteriores, setAnteriores] = useState<PainelCall[]>([]);
  const [hora, setHora] = useState<string>("");
  const [dataCompleta, setDataCompleta] = useState<string>("");

  const [ativas, setAtivas] = useState<PainelCall[]>([]);
  const [espera, setEspera] = useState<PainelCall[]>([]);

  const ativasRef = useRef<PainelCall[]>([]);
  const esperaRef = useRef<PainelCall[]>([]);
  const chamadaAtualRef = useRef<PainelCall | undefined>(undefined);
  const loopRodando = useRef<boolean>(false);
  const cancelLoop = useRef<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioCacheRef = useRef<Map<string, Blob>>(new Map());
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map());
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const notificacaoAudioRef = useRef<HTMLAudioElement | null>(null);
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);
  const nativeSpeechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [isLiberado, setIsLiberado] = useState(false);
  const [audioHabilitado, setAudioHabilitado] = useState(false);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("");
  const [showConfig, setShowConfig] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filtroChamada, setFiltroChamada] = useState<
    "CONJUNTO" | "RECEPÇÃO" | "ATENDIMENTO"
  >("CONJUNTO");
  const [identificacaoAtiva, setIdentificacaoAtiva] = useState(true);

  // Estados para controle do idle
  const [isIdle, setIsIdle] = useState(false);
  const isIdleRef = useRef(false);
  const [showPainel, setShowPainel] = useState(true);
  const ultimaChamadaRef = useRef<number>(Date.now());
  const idleTimeoutRef = useRef<NodeJS.Timeout>();
  const returnTimeoutRef = useRef<NodeJS.Timeout>();

  // Ref para controlar se o socket já foi inicializado
  const socketInitializedRef = useRef(false);

  const atualizaData = useCallback(() => {
    const now = new Date();
    const dia = diaSemana(now);
    const data = now.getDate();
    const mes = mesAtual(now);
    const ano = now.getFullYear();
    const tempo = now.toLocaleTimeString("pt-br").slice(0, 5);

    setDataCompleta(`${dia}, ${data} de ${mes}, ${ano}`);
    setHora(tempo);
  }, []);

  useEffect(() => {
    atualizaData();
    const t = setInterval(atualizaData, 60000);

    return () => clearInterval(t);
  }, [atualizaData]);

  // Sistema Idle
  const iniciarIdle = useCallback(() => {
    if (isIdleRef.current) return;
    setShowPainel(false);

    setTimeout(() => {
      setIsIdle(true);
      isIdleRef.current = true;
    }, 800);

    returnTimeoutRef.current = setTimeout(() => {
      retornarAoPainel();
    }, IDLE_CONFIG.duracaoIdleSegundos * 1000);
  }, []);

  const retornarAoPainel = useCallback(() => {
    if (!isIdleRef.current) return;

    if (returnTimeoutRef.current) {
      clearTimeout(returnTimeoutRef.current);
    }

    setIsIdle(false);
    isIdleRef.current = false;

    setTimeout(() => {
      setShowPainel(true);
      resetarIdleTimer();
    }, 800);
  }, []);

  const resetarIdleTimer = useCallback(() => {
    ultimaChamadaRef.current = Date.now();

    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    if (isLiberado) {
      idleTimeoutRef.current = setTimeout(() => {
        const tempoInativo = Date.now() - ultimaChamadaRef.current;
        const tempoMinimo = IDLE_CONFIG.tempoInatividadeMinutos * 60 * 1000;

        if (
          tempoInativo >= tempoMinimo &&
          !ativasRef.current.length &&
          !esperaRef.current.length
        ) {
          iniciarIdle();
        } else {
          resetarIdleTimer();
        }
      }, 60000);
    }
  }, [isLiberado]);

  const atualizarUltimaChamada = useCallback(() => {
    ultimaChamadaRef.current = Date.now();
    if (isIdleRef.current) {
      retornarAoPainel();
    } else {
      resetarIdleTimer();
    }
  }, []);

  const setAtivasSync = useCallback(
    (updater: (prev: PainelCall[]) => PainelCall[]) => {
      setAtivas((prev) => {
        const next = updater(prev);

        ativasRef.current = next;

        return next;
      });
    },
    [],
  );

  const setEsperaSync = useCallback(
    (updater: (prev: PainelCall[]) => PainelCall[]) => {
      setEspera((prev) => {
        const next = updater(prev);

        esperaRef.current = next;

        return next;
      });
    },
    [],
  );

  const setChamadaAtualSync = useCallback((call?: PainelCall) => {
    chamadaAtualRef.current = call;
    setChamadaAtual(call);
  }, []);

  const shouldIncludeCallByFilter = useCallback((call: PainelCall) => {
    const isRecepcao = call.exame === "RECEPCAO";
    const isAtendimento = !isRecepcao && call.exame !== "";
    const filtro = localStorage.getItem("painel_filtro") || "CONJUNTO";

    if (filtro === "RECEPÇÃO") {
      return isRecepcao;
    }

    if (filtro === "ATENDIMENTO") {
      return isAtendimento;
    }

    return true;
  }, []);

  const enqueuePainelCall = useCallback(
    (call: PainelCall) => {
      if (!shouldIncludeCallByFilter(call)) {
        return;
      }

      // Verifica se já existe chamada com mesmo ID
      const jaExisteAtivas = ativasRef.current.find((c) => c.id === call.id);
      const jaExisteEspera = esperaRef.current.find((c) => c.id === call.id);
      const chamadaExistente = jaExisteAtivas || jaExisteEspera;

      if (chamadaExistente) {
        // Se mudou a sala ou o áudio, atualiza a chamada existente
        const mudouSala = chamadaExistente.sala !== call.sala;
        const mudouAudio = chamadaExistente.audio !== call.audio;

        if (mudouSala || mudouAudio) {
          // Atualiza no cache de áudio se necessário
          if (call.audio && mudouAudio) {
            const fullUrl = `${NEST_URL}${call.audio}`;
            const cacheKey = `${fullUrl}|${call.sala}|${call.exame}`;

            fetch(fullUrl)
              .then((res) => res.blob())
              .then((blob) => {
                if (audioUrlCacheRef.current.has(cacheKey)) {
                  URL.revokeObjectURL(audioUrlCacheRef.current.get(cacheKey)!);
                  audioUrlCacheRef.current.delete(cacheKey);
                }
                audioCacheRef.current.set(cacheKey, blob);
              })
              .catch(() => undefined);
          }

          // Atualiza a chamada na fila
          if (jaExisteAtivas) {
            setAtivasSync((prev) =>
              prev.map((c) => (c.id === call.id ? call : c)),
            );
            // Se for a chamada atual sendo exibida, atualiza a UI imediatamente
            if (chamadaAtualRef.current?.id === call.id) {
              setChamadaAtualSync(call);
            }
          } else {
            setEsperaSync((prev) =>
              prev.map((c) => (c.id === call.id ? call : c)),
            );
          }
        }
        return;
      }

      // Nova chamada - carrega áudio
      if (call.audio) {
        if (audioCacheRef.current.size > 8) {
          audioUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
          audioUrlCacheRef.current.clear();
          audioCacheRef.current.clear();
        }

        const fullUrl = `${NEST_URL}${call.audio}`;
        const cacheKey = `${fullUrl}|${call.sala}|${call.exame}`;

        fetch(fullUrl)
          .then((res) => res.blob())
          .then((blob) => {
            if (audioUrlCacheRef.current.has(cacheKey)) {
              URL.revokeObjectURL(audioUrlCacheRef.current.get(cacheKey)!);
              audioUrlCacheRef.current.delete(cacheKey);
            }
            audioCacheRef.current.set(cacheKey, blob);
          })
          .catch(() => undefined);
      }

      if (ativasRef.current.length < PAINEL_CONFIG.qtdFilaPainel) {
        // Nova chamada vai para o início da fila para ser exibida imediatamente
        setAtivasSync((prev) => [call, ...prev.filter((c) => c.id !== call.id)]);
      } else {
        setEsperaSync((prev) => [...prev, call]);
      }
    },
    [setAtivasSync, setEsperaSync, shouldIncludeCallByFilter, setChamadaAtualSync],
  );

  const hydrateInitialCalls = useCallback(
    (schedules: SchedulingSnapshot[] = []) => {
      const activeCalls = schedules
        .filter((schedule) => schedule?.TICKET?.status === "EM CHAMADA")
        .map((schedule) => ({
          id: Number(schedule.TICKET?.id),
          name: schedule.NOME || "",
          ticket: `${schedule.TICKET?.prefixo || ""}${schedule.TICKET?.numero || ""}`,
          sala: schedule.TICKET?.sala || "",
          exame: schedule.TICKET?.exame || "ATENDIMENTO",
          unidade:
            schedule.TICKET?.unidade || schedule.UNIDADEATENDIMENTO || "",
        }))
        .filter(
          (call) => Number.isFinite(call.id) && shouldIncludeCallByFilter(call),
        )
        .sort((a, b) => {
          const dateA = new Date(
            schedules.find((schedule) => schedule.TICKET?.id === a.id)?.TICKET
              ?.updatedAt ||
              schedules.find((schedule) => schedule.TICKET?.id === a.id)?.TICKET
                ?.emissao ||
              0,
          ).getTime();
          const dateB = new Date(
            schedules.find((schedule) => schedule.TICKET?.id === b.id)?.TICKET
              ?.updatedAt ||
              schedules.find((schedule) => schedule.TICKET?.id === b.id)?.TICKET
                ?.emissao ||
              0,
          ).getTime();

          return dateA - dateB;
        });

      const nextAtivas = activeCalls.slice(0, PAINEL_CONFIG.qtdFilaPainel);
      const nextEspera = activeCalls.slice(PAINEL_CONFIG.qtdFilaPainel);

      setAtivasSync(() => nextAtivas);
      setEsperaSync(() => nextEspera);
    },
    [setAtivasSync, setEsperaSync, shouldIncludeCallByFilter],
  );

  const tocarSomNotificacao = useCallback(() => {
    if (!audioHabilitado) return;
    try {
      if (!notificacaoAudioRef.current) {
        notificacaoAudioRef.current = new Audio(
          PAINEL_CONFIG.audioUrls.notificacao,
        );
      }
      const audio = notificacaoAudioRef.current;
      audio.currentTime = 0;
      audio.play().catch(() => undefined);
    } catch {}
  }, [audioHabilitado]);

  const tocarFallbackDeVoz = useCallback((call: PainelCall): Promise<void> => {
    if (typeof window === "undefined") {
      return Promise.resolve();
    }

    return playNativeSpeechFallback({
      call,
      speechSynthesis:
        "speechSynthesis" in window ? window.speechSynthesis : undefined,
      SpeechSynthesisUtterance:
        typeof SpeechSynthesisUtterance === "undefined"
          ? undefined
          : SpeechSynthesisUtterance,
      setUtterance: (utterance: SpeechSynthesisUtterance | null) => {
        nativeSpeechRef.current = utterance;
      },
      timeoutMs: 10000,
      setTimeoutFn: window.setTimeout.bind(window),
      clearTimeoutFn: window.clearTimeout.bind(window),
    }).catch(() => undefined);
  }, []);

  const tocarAudioDaChamada = useCallback(
    (call: PainelCall): Promise<void> =>
      new Promise<void>((resolve) => {
        tocarSomNotificacao();

        const chamadaAnterior = chamadaAtualRef.current;
        const mudouChamadaPrincipal = chamadaAnterior?.id !== call.id;

        if (mudouChamadaPrincipal) {
          if (chamadaAnterior) {
            setAnteriores((prev) =>
              [
                chamadaAnterior,
                ...prev.filter((item) => item.id !== chamadaAnterior.id),
              ].slice(0, 2),
            );
          }

          setChamadaAtualSync(call);
        }

        atualizarUltimaChamada();

        const executar = async () => {
          await playPreparedAudioWithFallback({
            call,
            audioEnabled: audioHabilitado,
            playFallback: tocarFallbackDeVoz,
            disabledDelayMs: PAINEL_CONFIG.tempoChamada,
            afterPlayDelayMs: 1000,
            playbackTimeoutMs: 10000,
            setTimeoutFn:
              typeof window === "undefined"
                ? setTimeout
                : window.setTimeout.bind(window),
            clearTimeoutFn:
              typeof window === "undefined"
                ? clearTimeout
                : window.clearTimeout.bind(window),
            logger: console,
            prepareAudio: async () => {
              const fullAudioUrl = `${NEST_URL}${call.audio}`;
              const cacheKey = `${fullAudioUrl}|${call.sala}|${call.exame}`;

              let audioSrc = fullAudioUrl;

              if (audioCacheRef.current.has(cacheKey)) {
                const blob = audioCacheRef.current.get(cacheKey)!;

                if (audioUrlCacheRef.current.has(cacheKey)) {
                  audioSrc = audioUrlCacheRef.current.get(cacheKey)!;
                } else {
                  audioSrc = URL.createObjectURL(blob);
                  audioUrlCacheRef.current.set(cacheKey, audioSrc);
                }
              }

              if (!mainAudioRef.current) {
                mainAudioRef.current = new Audio();
              }

              const audio = mainAudioRef.current;

              audio.src = audioSrc;
              audio.preload = "auto";

              await new Promise<void>((res, rej) => {
                let carregado = false;
                const onCanPlay = () => {
                  carregado = true;
                  res();
                  audio.removeEventListener("canplaythrough", onCanPlay);
                };

                audio.addEventListener("canplaythrough", onCanPlay);
                audio.onerror = () => {
                  audio.removeEventListener("canplaythrough", onCanPlay);
                  rej(new Error("Erro ao carregar áudio"));
                };

                setTimeout(() => {
                  if (!carregado) {
                    audio.removeEventListener("canplaythrough", onCanPlay);
                    audio.onerror = null;
                    rej(new Error("Timeout ao carregar áudio"));
                  }
                }, 15000);
              });

              return audio;
            },
          });
          resolve();
        };

        executar();
      }),
    [
      audioHabilitado,
      tocarSomNotificacao,
      tocarFallbackDeVoz,
      atualizarUltimaChamada,
      setChamadaAtualSync,
    ],
  );

  const iniciarLoop = useCallback(async () => {
    if (loopRodando.current) return;
    loopRodando.current = true;
    cancelLoop.current = false;

    while (!cancelLoop.current) {
      const lista = ativasRef.current;

      if (lista.length > 0) {
        for (const call of [...lista]) {
          if (!ativasRef.current.some((c) => c.id === call.id)) continue;
          await tocarAudioDaChamada(call);
          if (!cancelLoop.current) {
            await new Promise((r) => setTimeout(r, 2000));
          }
          if (cancelLoop.current) break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    loopRodando.current = false;
  }, [tocarAudioDaChamada]);

  useEffect(() => {
    if (ativas.length > 0) iniciarLoop();
  }, [ativas, iniciarLoop]);

  // Função para ativar áudio e tela cheia
  const handleActivateAudioAndFullscreen = () => {
    setAudioHabilitado(true);
    setShowAudioModal(false);

    // Entrar em tela cheia após um breve delay para garantir que o modal foi fechado
    setTimeout(() => {
      if (containerRef.current) {
        enterFullscreen(containerRef.current);
        setIsFullscreen(true);
      }
    }, 300);
  };

  // Ativar modal de áudio após liberação
  useEffect(() => {
    if (isLiberado) {
      setTimeout(() => {
        setShowAudioModal(true);
      }, 1000);
    }
  }, [isLiberado]);

  // Inicializar idle timer
  useEffect(() => {
    if (isLiberado) {
      resetarIdleTimer();
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);
    };
  }, [isLiberado, resetarIdleTimer]);

  // Monitorar mudanças no modo tela cheia
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "msfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  // Inicialização do WebSocket - UMA VEZ APENAS
  useEffect(() => {
    if (!isLiberado || !unidadeSelecionada || socketInitializedRef.current)
      return;

    socketInitializedRef.current = true;

    socket = io(NEXT_WS_URL, {
      auth: {
        type: "PAINEL",
        unidade: unidadeSelecionada,
      },
      transports: ["websocket"],
      reconnectionAttempts: Infinity,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,

      timeout: 20000,
      // Forçar nova conexão ao reconectar
      forceNew: true,
      // Upgrade automático desabilitado (já usa websocket)
      upgrade: false,
      // Manter conexão ativa
      rememberUpgrade: true,
    });

    socket.on("connect", () => {
      socket?.emit("painel disponível", socket?.id);
      resetarIdleTimer();
    });

    socket.on("disconnect", () => undefined);

    socket.on("reconnect", () => {
      socket?.emit("painel disponível", socket.id);
    });

    socket.on("connect_error", () => undefined);

    socket.on("CONNECTION_REQUEST", (schedules: SchedulingSnapshot[]) => {
      hydrateInitialCalls(Array.isArray(schedules) ? schedules : []);
    });

    socket.on("chamar funcionario", (call: PainelCall) => {
      enqueuePainelCall(call);
    });

    socket.on("atendimento finalizado", (call: PainelCall) => {
      let liberouVaga = false;

      setAtivasSync((prev) => {
        const next = prev.filter((c) => c.id !== call.id);

        liberouVaga = next.length < prev.length;

        return next;
      });
      setEsperaSync((prev) => prev.filter((c) => c.id !== call.id));

      // Limpa chamadaAtual se for a mesma chamada
      if (chamadaAtualRef.current?.id === call.id) {
        setChamadaAtualSync(undefined);
      }

      if (liberouVaga && esperaRef.current.length > 0) {
        const [proxima, ...resto] = esperaRef.current;

        setEsperaSync(() => resto);
        setAtivasSync((prev) => [...prev, proxima]);
      }
    });

    socket.on("funcionario em atendimento", (call: PainelCall) => {
      setAtivasSync((prev) => prev.filter((c) => c.id !== call.id));
      setEsperaSync((prev) => prev.filter((c) => c.id !== call.id));
    });

    socket.on("atendimento retornado", (call: PainelCall) => {
      setAtivasSync((prev) => prev.filter((c) => c.id !== call.id));
      setEsperaSync((prev) => prev.filter((c) => c.id !== call.id));

      // Limpa chamadaAtual se for a mesma chamada
      if (chamadaAtualRef.current?.id === call.id) {
        setChamadaAtualSync(undefined);
      }
    });

    socket.on("pagina fechada", (socketId: string) => {
      setAtivasSync((prev) => prev.filter((c) => c.socketId !== socketId));
      setEsperaSync((prev) => prev.filter((c) => c.socketId !== socketId));
    });

    socket.on("UPDATE_SCHEDULE", (data: any) => {
      if (!data?.schedule) return;
      const sch = data.schedule;
      const ticketId = Number(sch?.TICKET?.id);
      const status = sch?.ATENDIMENTOSTATUS;
      const ticketStatus = sch?.TICKET?.status;

      if (
        status === "AGUARDANDO_RESULTADOS" ||
        status === "AVALIACAO_MEDICA" ||
        status === "FINALIZADO" ||
        (ticketStatus && ticketStatus !== "EM CHAMADA" && ticketStatus !== "EM_CHAMADA")
      ) {
        if (Number.isFinite(ticketId)) {
          setAtivasSync((prev) => prev.filter((c) => c.id !== ticketId));
          setEsperaSync((prev) => prev.filter((c) => c.id !== ticketId));
          if (chamadaAtualRef.current?.id === ticketId) {
            setChamadaAtualSync(undefined);
          }
        }
      }
    });

    const handleBeforeUnload = () => {
      socket?.emit("painel desconectado", socket?.id);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Não desconecta o socket aqui para manter a conexão
      cancelLoop.current = true;
      loopRodando.current = false;

      // Limpeza de cache de áudio
      audioUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      audioUrlCacheRef.current.clear();
      audioCacheRef.current.clear();

      if (mainAudioRef.current) {
        mainAudioRef.current.pause();
        mainAudioRef.current.src = "";
        mainAudioRef.current.load();
        mainAudioRef.current = null;
      }

      if (notificacaoAudioRef.current) {
        notificacaoAudioRef.current.pause();
        notificacaoAudioRef.current.src = "";
        notificacaoAudioRef.current.load();
        notificacaoAudioRef.current = null;
      }

      if (welcomeAudioRef.current) {
        welcomeAudioRef.current.pause();
        welcomeAudioRef.current.src = "";
        welcomeAudioRef.current.load();
        welcomeAudioRef.current = null;
      }
    };
  }, [
    isLiberado,
    unidadeSelecionada,
    enqueuePainelCall,
    hydrateInitialCalls,
    setAtivasSync,
    setEsperaSync,
    resetarIdleTimer,
  ]);

  // Tocar áudio de boas-vindas
  useEffect(() => {
    if (!isLiberado) return;

    const inicializarPainel = async () => {
      try {
        if (audioHabilitado) {
          if (!welcomeAudioRef.current) {
            welcomeAudioRef.current = new Audio(
              PAINEL_CONFIG.audioUrls.bemvindo,
            );
          }
          const bemVindo = welcomeAudioRef.current;
          bemVindo.currentTime = 0;
          await bemVindo.play().catch(() => undefined);
        }
      } catch {}
    };

    inicializarPainel();
  }, [isLiberado, audioHabilitado]);

  const validarAcesso = (serial: string, unidade: string, filtro: string) => {
    if (serial === SERVICES_KEY && unidade) {
      setUnidadeSelecionada(unidade);
      setFiltroChamada(filtro as any);
      setIsLiberado(true);
      localStorage.setItem("painel_validate", unidade);
      localStorage.setItem("painel_filtro", filtro);
    } else {
      alert("Chave inválida ou unidade não selecionada!");
    }
  };

  useEffect(() => {
    const unidadeSalva = localStorage.getItem("painel_validate");
    const filtroSalvo = localStorage.getItem("painel_filtro") as any;
    const identSalva = localStorage.getItem("totem_identificacao_ativa");

    if (unidadeSalva) {
      setUnidadeSelecionada(unidadeSalva);
      setIsLiberado(true);
    }

    if (filtroSalvo) {
      setFiltroChamada(filtroSalvo === "TODOS" ? "CONJUNTO" : filtroSalvo);
    }

    if (identSalva !== null) {
      setIdentificacaoAtiva(identSalva === "true");
    }
  }, []);

  const currentExamColors = useMemo(
    () => getCallColors(chamadaAtual),
    [chamadaAtual],
  );

  const handleSaveConfig = useCallback(
    ({
      unidade,
      filtro,
      audioHabilitado: novoAudioHabilitado,
      identificacaoAtiva: novaIdentificacaoAtiva,
    }: {
      unidade: string;
      filtro: "CONJUNTO" | "RECEPÇÃO" | "ATENDIMENTO";
      audioHabilitado: boolean;
      identificacaoAtiva: boolean;
    }) => {
      const unidadeAnterior = unidadeSelecionada;

      setAudioHabilitado(novoAudioHabilitado);
      setFiltroChamada(filtro);
      setUnidadeSelecionada(unidade);
      setIdentificacaoAtiva(novaIdentificacaoAtiva);

      localStorage.setItem("painel_validate", unidade);
      localStorage.setItem("painel_filtro", filtro);
      localStorage.setItem("totem_identificacao_ativa", String(novaIdentificacaoAtiva));

      setShowConfig(false);

      if (unidade !== unidadeAnterior) {
        socket?.emit("painel desconectado", socket?.id);
        socket?.disconnect();
        socket = null;
        socketInitializedRef.current = false;

        setAtivasSync(() => []);
        setEsperaSync(() => []);
        setChamadaAtualSync(undefined);
      }
    },
    [unidadeSelecionada, setAtivasSync, setEsperaSync, setChamadaAtualSync],
  );

  // Verificar se deve exibir idle
  const deveExibirIdle = isIdle;

  if (!isLiberado) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4"
        style={{
          backgroundColor: COLOR_PALETTE.light,
          backgroundImage: `linear-gradient(135deg, ${COLOR_PALETTE.light} 0%, ${COLOR_PALETTE.lightGray} 100%)`,
        }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg border"
          style={{
            backgroundColor: COLOR_PALETTE.white,
            borderColor: COLOR_PALETTE.border,
            boxShadow: "0 8px 32px rgba(68, 115, 94, 0.1)",
          }}
        >
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-20 mx-auto mb-3 sm:mb-4 rounded-2xl flex items-center justify-center shadow-sm"
                style={{
                  backgroundColor: COLOR_PALETTE.primary,
                  backgroundImage: `linear-gradient(135deg, ${COLOR_PALETTE.primary} 0%, ${COLOR_PALETTE.accent} 100%)`,
                }}
              >
                <Monitor className="text-white" size={20} />
              </div>
              <h1
                className="text-lg sm:text-xl md:text-2xl font-bold"
                style={{ color: COLOR_PALETTE.primary }}
              >
                Painel de Chamadas
              </h1>
              <p
                className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base"
                style={{ color: COLOR_PALETTE.textLight }}
              >
                Acesso restrito ao pessoal autorizado
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label
                  className="text-xs sm:text-sm font-semibold"
                  htmlFor="serialInput"
                  style={{ color: COLOR_PALETTE.text }}
                >
                  Chave de Acesso
                </label>
                <input
                  className="w-full rounded-xl border px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 focus:outline-none focus:ring-2 focus:ring-offset-1 mt-1 text-sm sm:text-base md:text-lg transition-all"
                  id="serialInput"
                  placeholder="Digite a chave..."
                  style={{
                    borderColor: COLOR_PALETTE.border,
                    color: COLOR_PALETTE.text,
                    backgroundColor: COLOR_PALETTE.lightGray,
                  }}
                  type="password"
                />
              </div>

              <div>
                <label
                  className="text-xs sm:text-sm font-semibold"
                  htmlFor="unidadeSelect"
                  style={{ color: COLOR_PALETTE.text }}
                >
                  Unidade
                </label>
                <select
                  className="w-full rounded-xl border px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 focus:outline-none focus:ring-2 focus:ring-offset-1 mt-1 transition-all text-xs sm:text-sm md:text-base"
                  defaultValue=""
                  id="unidadeSelect"
                  style={{
                    borderColor: COLOR_PALETTE.border,
                    color: COLOR_PALETTE.text,
                    backgroundColor: COLOR_PALETTE.lightGray,
                  }}
                >
                  <option disabled value="">
                    Selecione a unidade
                  </option>
                  {unidades.map((unidade) => (
                    <option key={unidade} value={unidade}>
                      {unidade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="text-xs sm:text-sm font-semibold"
                  htmlFor="filtroSelect"
                  style={{ color: COLOR_PALETTE.text }}
                >
                  Chamada
                </label>
                <select
                  className="w-full rounded-xl border px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 focus:outline-none focus:ring-2 focus:ring-offset-1 mt-1 transition-all text-xs sm:text-sm md:text-base"
                  id="filtroSelect"
                  style={{
                    borderColor: COLOR_PALETTE.border,
                    color: COLOR_PALETTE.text,
                    backgroundColor: COLOR_PALETTE.lightGray,
                  }}
                >
                  <option value="CONJUNTO">CONJUNTO</option>
                  <option value="RECEPÇÃO">RECEPÇÃO</option>
                  <option value="ATENDIMENTO">ATENDIMENTO</option>
                </select>
              </div>

              <button
                className="w-full rounded-xl px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-bold text-white mt-3 sm:mt-4 transition-all hover:shadow-lg transform hover:scale-[1.02] text-xs sm:text-sm md:text-base"
                style={{
                  background: `linear-gradient(135deg, ${COLOR_PALETTE.primary} 0%, ${COLOR_PALETTE.accent} 100%)`,
                  boxShadow: "0 4px 14px rgba(68, 115, 94, 0.3)",
                }}
                onClick={() => {
                  const serial =
                    (document.getElementById("serialInput") as HTMLInputElement)
                      ?.value || "";
                  const unidade =
                    (
                      document.getElementById(
                        "unidadeSelect",
                      ) as HTMLSelectElement
                    )?.value || "";
                  const filtro =
                    (
                      document.getElementById(
                        "filtroSelect",
                      ) as HTMLSelectElement
                    )?.value || "CONJUNTO";

                  validarAcesso(serial, unidade, filtro);
                }}
              >
                <Monitor className="inline mr-2" size={16} /> ACESSAR PAINEL
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full flex flex-col overflow-hidden relative"
      style={{
        backgroundColor: COLOR_PALETTE.light,
        backgroundImage: `linear-gradient(135deg, ${COLOR_PALETTE.light} 0%, ${COLOR_PALETTE.lightGray} 100%)`,
      }}
    >
      {/* Modal de Ativação de Áudio */}
      <AnimatePresence>
        {showAudioModal && (
          <AudioActivationModal onActivate={handleActivateAudioAndFullscreen} />
        )}
      </AnimatePresence>

      {/* Botão de Tela Cheia */}
      <motion.button
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-16 sm:bottom-20 right-4 sm:right-6 z-40 rounded-full p-2 sm:p-3 shadow-lg border transition-all"
        initial={{ scale: 0, opacity: 0 }}
        style={{
          backgroundColor: COLOR_PALETTE.white,
          borderColor: COLOR_PALETTE.border,
          color: COLOR_PALETTE.primary,
          boxShadow: "0 4px 20px rgba(68, 115, 94, 0.2)",
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (isFullscreen && containerRef.current) {
            exitFullscreen();
            setIsFullscreen(false);
          } else if (containerRef.current) {
            enterFullscreen(containerRef.current);
            setIsFullscreen(true);
          }
        }}
      >
        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </motion.button>

      {/* Botão de Configurações Flutuante */}
      <motion.button
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 rounded-full p-2 sm:p-3 shadow-lg border transition-all"
        initial={{ scale: 0, opacity: 0 }}
        style={{
          backgroundColor: COLOR_PALETTE.white,
          borderColor: COLOR_PALETTE.border,
          color: COLOR_PALETTE.primary,
          boxShadow: "0 4px 20px rgba(68, 115, 94, 0.2)",
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowConfig(true)}
      >
        <Settings size={18} />
      </motion.button>

      {/* Modal de Configurações */}
      <ConfigModal
        audioHabilitado={audioHabilitado}
        identificacaoAtiva={identificacaoAtiva}
        filtroChamada={filtroChamada}
        isOpen={showConfig}
        onSave={handleSaveConfig}
        unidadeSelecionada={unidadeSelecionada}
        onClose={() => setShowConfig(false)}
        unidades={unidades}
      />

      {/* Idle Screen */}
      <AnimatePresence>
        {deveExibirIdle && (
          <IdleScreen unidadeSelecionada={unidadeSelecionada} />
        )}
      </AnimatePresence>

      {/* Painel Principal */}
      <AnimatePresence>
        {showPainel && !deveExibirIdle && (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col min-h-0 p-1 sm:p-2"
            exit={{ opacity: 0, scale: 1.05 }}
            initial={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8 }}
          >
            <header
              className="w-full border-b py-1 sm:py-2 px-2 sm:px-3 md:px-4 lg:px-6 backdrop-blur-sm shrink-0"
              style={{
                backgroundColor: COLOR_PALETTE.white,
                borderColor: COLOR_PALETTE.border,
                boxShadow: "0 1px 3px rgba(68, 115, 94, 0.05)",
              }}
            >
              <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 items-center gap-1 sm:gap-2 md:gap-4">
                <div className="flex items-center gap-1 sm:gap-2 md:gap-4 justify-center sm:justify-start order-2 sm:order-1">
                  <div className="rounded-2xl p-1.5 sm:p-2 md:p-3">
                    {/* <Monitor className="text-white" size={16} /> */}
                    <Image
                      alt="ícone CMSO"
                      src="/images/cmso_icone.png"
                      width={84}
                    />
                  </div>
                  <div>
                    <div
                      className="text-xs sm:text-xs md:text-sm uppercase tracking-wide font-semibold"
                      style={{ color: COLOR_PALETTE.textLight }}
                    >
                      {filtroChamada}
                    </div>
                    <div
                      className="text-sm sm:text-base md:text-lg font-bold truncate max-w-[120px] sm:max-w-[150px] md:max-w-none"
                      style={{ color: COLOR_PALETTE.text }}
                    >
                      {unidadeSelecionada}
                    </div>
                  </div>
                </div>

                <div className="text-center order-1 sm:order-2">
                  <div
                    className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold"
                    style={{ color: COLOR_PALETTE.text }}
                  >
                    {dataCompleta}
                  </div>
                  <div
                    className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black tabular-nums flex items-center justify-center gap-1 sm:gap-2 md:gap-3 mt-0.5 sm:mt-1"
                    style={{ color: COLOR_PALETTE.primary }}
                  >
                    {hora}
                  </div>
                </div>

                <div className="flex justify-center sm:justify-end gap-1 sm:gap-2 md:gap-4 order-3">
                  <CounterCard label="Chamando" value={ativas.length} />
                  <CounterCard label="Aguardando" value={espera.length} />
                </div>
              </div>
            </header>

            <main className="flex-1 flex flex-col px-1 sm:px-2 md:px-3 lg:px-4 py-1 sm:py-2 md:py-3 lg:py-4 max-w-7xl mx-auto w-full min-h-0">
              <section className="flex-1 flex items-center justify-center mb-1 sm:mb-2 md:mb-3 lg:mb-4 min-h-0">
                <AnimatePresence mode="wait">
                  {chamadaAtual ? (
                    <motion.div
                      key={chamadaAtual.id}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full max-w-4xl sm:max-w-5xl lg:max-w-6xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 shadow-lg border text-center backdrop-blur-sm mx-1"
                      exit={{ opacity: 0, scale: 0.9 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      style={{
                        backgroundColor: currentExamColors.primary + "15",
                        borderColor: COLOR_PALETTE.border,
                        color: COLOR_PALETTE.text,
                        boxShadow: "0 8px 32px rgba(68, 115, 94, 0.1)",
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        animate={{ scale: 1, opacity: 1 }}
                        className="mb-2 sm:mb-3 md:mb-4 lg:mb-6"
                        initial={{ scale: 0.95, opacity: 0 }}
                        transition={{ delay: 0.05 }}
                      >
                        <div
                          className={
                            chamadaAtual.name
                              ? chamadaAtual.exame === "RECEPCAO"
                                ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-black mb-1 sm:mb-2 md:mb-3 uppercase tracking-wider break-words px-1"
                                : "text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-black mb-1 sm:mb-2 md:mb-3 uppercase tracking-wider break-words px-1"
                              : chamadaAtual.exame === "RECEPCAO"
                                ? "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-black mb-1 sm:mb-2 md:mb-4 uppercase tracking-wider px-1"
                                : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black mb-1 sm:mb-2 md:mb-3 uppercase tracking-wider px-1"
                          }
                          style={{ color: currentExamColors.primary }}
                        >
                          {chamadaAtual.name || chamadaAtual.ticket}
                        </div>
                      </motion.div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 mb-1 lg:mb-2">
                        <motion.div
                          animate={{ y: 0, opacity: 1 }}
                          className="flex items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 text-base sm:text-lg md:text-xl lg:text-3xl xl:text-4xl 2xl:text-5xl 3xl:text-6xl font-black px-2 sm:px-3 md:px-4 lg:px-6 py-0.5 sm:py-1 md:py-2 lg:py-3 rounded-full border"
                          initial={{ y: 10, opacity: 0 }}
                          style={{
                            backgroundColor: currentExamColors.primary,
                            color: currentExamColors.text,
                            borderColor: currentExamColors.primary,
                          }}
                          transition={{ delay: 0.1 }}
                        >
                          <span className="truncate">{chamadaAtual.sala}</span>
                        </motion.div>

                        <motion.div
                          animate={{ y: 0, opacity: 1 }}
                          className="text-base sm:text-lg md:text-xl lg:text-3xl xl:text-4xl 2xl:text-5xl 3xl:text-6xl font-black px-2 sm:px-3 md:px-4 lg:px-6 py-0.5 sm:py-1 md:py-2 lg:py-3 rounded-full border-2 text-center"
                          initial={{ y: 10, opacity: 0 }}
                          style={{
                            borderColor: currentExamColors.primary,
                            color: currentExamColors.primary,
                            backgroundColor: currentExamColors.primary + "20",
                          }}
                          transition={{ delay: 0.15 }}
                        >
                          <span className="break-words px-1">
                            {chamadaAtual.exame || "ATENDIMENTO"}
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="aguardando"
                      animate={{ opacity: 1 }}
                      className="text-center mx-1 sm:mx-2 md:mx-4"
                      initial={{ opacity: 0 }}
                    >
                      <Loader2
                        className="animate-spin mx-auto mb-2 sm:mb-3 md:mb-4 lg:mb-6"
                        size={24}
                        style={{ color: COLOR_PALETTE.primary }}
                      />
                      <h2
                        className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold mb-1 sm:mb-2 md:mb-3 lg:mb-4"
                        style={{ color: COLOR_PALETTE.text }}
                      >
                        AGUARDANDO CHAMADAS
                      </h2>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              <section className="mt-auto px-1 w-full shrink-0">
                <div
                  className="flex ml-8 items-center gap-1 sm:gap-2 md:gap-3 text-sm sm:text-base md:text-lg lg:text-xl font-bold mb-1 sm:mb-2 md:mb-3 lg:mb-4"
                  style={{ color: COLOR_PALETTE.text }}
                >
                  <History size={24} style={{ color: COLOR_PALETTE.primary }} />
                  <span className="truncate">CHAMADAS ANTERIORES</span>
                </div>

                <div className="w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 sm:gap-2 md:gap-3 lg:gap-4 w-full">
                    {anteriores.length === 0 ? (
                      <div
                        className="col-span-2 text-xs sm:text-sm md:text-base lg:text-lg italic py-2 sm:py-3 md:py-4 lg:py-6 text-center w-full rounded-lg border"
                        style={{
                          color: COLOR_PALETTE.textLight,
                          borderColor: COLOR_PALETTE.border,
                          backgroundColor: COLOR_PALETTE.white,
                        }}
                      >
                        Nenhuma chamada recente
                      </div>
                    ) : (
                      anteriores
                        .slice(0, 2)
                        .map((c, idx) => (
                          <PreviousCallCard key={`${c.id}-${idx}`} c={c} />
                        ))
                    )}
                  </div>
                </div>
              </section>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
