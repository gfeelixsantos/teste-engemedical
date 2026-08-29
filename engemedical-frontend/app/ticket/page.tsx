// ticket.ts - VERSÃO CORRIGIDA PARA PREENCHER TELA
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/react";
import {
  KeyIcon,
  MapPinIcon,
  UserIcon,
  UserPlusIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
  QueueListIcon,
  BuildingOfficeIcon,
  ClockIcon,
  CalendarIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/outline";

import PreferencialTipo from "./components/PreferencialTipo";
import BirthYearModal from "./components/BirthYearModal";
import SelectNameModal, { SchedulingEntry } from "./components/SelectNameModal";

import { useUnits } from "@/lib/config/useUnits";
import {
  Ticket,
  TicketEmitedDto,
  TicketGroups,
  TicketStatus,
  TicketTypes,
} from "@/lib/ticket/ticket";
import {
  getTicketButtonGradient,
  getTicketCardSurface,
  getTicketTypeTone,
} from "@/lib/ticket/ticket-colors";
import { WebsocketType } from "@/lib/websocket/enums/websocket.enum";
import {
  COLOR_PALETTE,
  NEST_TICKETS_URL,
  NEST_TICKET_CHECK_SCHEDULING,
  SERVICES_KEY,
} from "@/config/constants";

// Interface para dados de autenticação salvos
interface AuthData {
  serial: string;
  unidade: string;
  timestamp: number;
}

// Hook para fullscreen
const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(() => {
    const docElement = document.documentElement as any;

    try {
      if (docElement.requestFullscreen) {
        docElement.requestFullscreen().catch(() => undefined);
      } else if (docElement.mozRequestFullScreen) {
        docElement.mozRequestFullScreen();
      } else if (docElement.webkitRequestFullscreen) {
        docElement.webkitRequestFullscreen();
      } else if (docElement.msRequestFullscreen) {
        docElement.msRequestFullscreen();
      }
    } catch {}
  }, []);

  const exitFullscreen = useCallback(() => {
    const doc = document as any;

    if (doc.exitFullscreen) {
      doc.exitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen();
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    } else if (doc.msExitFullscreen) {
      doc.msExitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange,
      );
    };
  }, []);

  return { isFullscreen, enterFullscreen, exitFullscreen };
};

// Hook para gerenciamento de autenticação no localStorage
const useAuthStorage = () => {
  const AUTH_STORAGE_KEY = "ticket_auth_data";
  const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 horas

  const saveAuthData = (serial: string, unidade: string) => {
    const authData: AuthData = {
      serial,
      unidade,
      timestamp: Date.now(),
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
  };

  const getAuthData = (): AuthData | null => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);

      if (!stored) return null;

      const authData: AuthData = JSON.parse(stored);
      const isExpired = Date.now() - authData.timestamp > STORAGE_EXPIRY_MS;

      if (isExpired) {
        localStorage.removeItem(AUTH_STORAGE_KEY);

        return null;
      }

      return authData;
    } catch {
      return null;
    }
  };

  const clearAuthData = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return { saveAuthData, getAuthData, clearAuthData };
};

// Hook para horário do Brasil
const useBrazilTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date());
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Sao_Paulo",
    });
  };

  return { currentTime, formatTime, formatDate };
};

// Componente Header com informações institucionais
const Header = ({
  unidade,
  onSettingsClick,
}: {
  unidade?: string;
  onSettingsClick?: () => void;
}) => {
  const { currentTime, formatTime, formatDate } = useBrazilTime();

  return (
    <header
      className="w-full text-white p-3 md:p-4 rounded-t-2xl shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${COLOR_PALETTE.primary} 0%, ${COLOR_PALETTE.dark} 100%)`,
      }}
    >
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-2 md:gap-3">
        <div className="flex items-center">
          <div className="text-center md:text-left">
            {unidade && (
              <div className="flex items-center justify-start">
                <MapPinIcon
                  className="h-5 w-5 md:h-6 md:w-6 mr-2"
                  style={{ color: COLOR_PALETTE.secondary }}
                />
                <span
                  className="font-bold text-base md:text-lg lg:text-xl"
                  style={{ color: COLOR_PALETTE.light }}
                >
                  CMSO {unidade}
                </span>
              </div>
            )}
            <div className="flex items-center justify-center md:justify-start gap-2">
              <p
                className="text-sm md:text-base"
                style={{ color: COLOR_PALETTE.secondary }}
              >
                Sistema de Atendimento
              </p>
              {onSettingsClick && (
                <button
                  onClick={onSettingsClick}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center focus:outline-none"
                  title="Configurações do Totem"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-white/70 hover:text-white transition-colors">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827a1.125 1.125 0 0 1 .26 1.43l-1.297 2.247a1.125 1.125 0 0 1-1.37.491l-1.216-.456c-.356-.133-.751-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-center md:text-right flex-1">
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-end gap-1 md:gap-3">
            <div className="flex items-center">
              <CalendarIcon
                className="h-4 w-4 md:h-5 md:w-5 mr-2"
                style={{ color: COLOR_PALETTE.secondary }}
              />
              <span className="text-sm md:text-base">
                {formatDate(currentTime)}
              </span>
            </div>

            <div className="flex items-center">
              <ClockIcon
                className="h-4 w-4 md:h-5 md:w-5 mr-2"
                style={{ color: COLOR_PALETTE.secondary }}
              />
              <span className="font-mono text-lg md:text-xl lg:text-2xl font-bold">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// Componente para a tela de autenticação e conexão
const InitialScreen = ({
  onConnect,
  unidades,
}: {
  onConnect: (unidade: string) => void;
  unidades: string[];
}) => {
  const [serial, setSerial] = useState("");
  const [unidade, setUnidade] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { saveAuthData, getAuthData } = useAuthStorage();

  // Carregar credenciais salvas ao montar o componente
  useEffect(() => {
    const savedAuth = getAuthData();

    if (savedAuth) {
      setSerial(savedAuth.serial);
      setUnidade(savedAuth.unidade);
    }
  }, [getAuthData]);

  const handleConnect = async () => {
    setError("");

    if (serial !== SERVICES_KEY) {
      setError("Código de acesso inválido.");

      return;
    }

    if (!unidade) {
      setError("Selecione a unidade.");

      return;
    }

    setIsLoading(true);
    try {
      // Salvar credenciais no localStorage
      saveAuthData(serial, unidade);

      setTimeout(() => {
        onConnect(unidade);
      }, 1000);
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConnect();
    }
  };

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl rounded-2xl shadow-xl overflow-hidden border"
      initial={{ opacity: 0, y: 20 }}
      style={{
        backgroundColor: COLOR_PALETTE.background,
        borderColor: COLOR_PALETTE.primary,
      }}
      transition={{ duration: 0.5 }}
    >
      <div
        className="p-5 md:p-6 text-center"
        style={{
          background: `linear-gradient(135deg, ${COLOR_PALETTE.primary} 0%, ${COLOR_PALETTE.accent} 100%)`,
        }}
      >
        <h2 className="text-xl md:text-2xl font-bold text-white">
          Acesso ao Totem
        </h2>
        <p
          className="mt-2 text-base md:text-lg"
          style={{ color: COLOR_PALETTE.light }}
        >
          Informe as credenciais para continuar
        </p>
      </div>

      <div className="p-6 md:p-8 space-y-4 md:space-y-5">
        <div className="relative">
          <KeyIcon
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6"
            style={{ color: COLOR_PALETTE.primary }}
          />
          <input
            className="w-full pl-12 pr-4 py-4 md:py-5 rounded-xl border text-lg placeholder-gray-500 focus:ring-2 focus:border-transparent transition-all"
            placeholder="Informe o código serial"
            style={{
              backgroundColor: "white",
              borderColor: COLOR_PALETTE.gray,
              color: COLOR_PALETTE.text,
            }}
            type="password"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>

        <div className="relative">
          <MapPinIcon
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6"
            style={{ color: COLOR_PALETTE.primary }}
          />
          <select
            className="w-full pl-12 pr-4 py-4 md:py-5 rounded-xl border text-lg appearance-none focus:ring-2 focus:border-transparent transition-all"
            style={{
              backgroundColor: "white",
              borderColor: COLOR_PALETTE.gray,
              color: COLOR_PALETTE.text,
            }}
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            onKeyPress={handleKeyPress}
          >
            <option disabled value="">
              Selecione a unidade
            </option>
            {unidades.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <motion.p
            animate={{ opacity: 1 }}
            className="text-center font-medium p-3 rounded-lg text-base"
            initial={{ opacity: 0 }}
            style={{
              backgroundColor: "#fed7d7",
              color: "#c53030",
            }}
          >
            {error}
          </motion.p>
        )}
      </div>

      <div className="px-6 md:px-8 pb-6 md:pb-8">
        <Button
          className="w-full py-4 md:py-5 text-lg font-bold text-white rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl"
          disabled={isLoading}
          style={{
            background: isLoading
              ? COLOR_PALETTE.gray
              : `linear-gradient(135deg, ${COLOR_PALETTE.primary} 0%, ${COLOR_PALETTE.accent} 100%)`,
          }}
          onClick={handleConnect}
        >
          {isLoading ? (
            <>
              <ArrowPathIcon className="w-5 h-5 md:w-6 md:h-6 animate-spin mr-3" />
              Conectando...
            </>
          ) : (
            "Conectar Totem"
          )}
        </Button>
      </div>
    </motion.div>
  );
};

// Componente para exibir mensagens de feedback em tela cheia
const FullScreenFeedback = ({
  type,
  message,
  ticketNumber,
  ticketTheme,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  ticketNumber?: string;
  ticketTheme?: TicketTypes;
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const themeTone = ticketTheme ? getTicketTypeTone(ticketTheme) : null;
  const successGradient = themeTone
    ? `linear-gradient(135deg, ${themeTone.primary} 0%, ${themeTone.secondary} 100%)`
    : `linear-gradient(135deg, ${COLOR_PALETTE.primary} 0%, ${COLOR_PALETTE.accent} 100%)`;
  const errorGradient = `linear-gradient(135deg, #e53e3e 0%, #c53030 100%)`;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      style={{
        backgroundColor:
          type === "success"
            ? themeTone?.soft || COLOR_PALETTE.light
            : "#fed7d7",
      }}
    >
      <div
        className="relative w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-6 md:p-8 rounded-3xl shadow-2xl text-center text-white"
        style={{
          background: type === "success" ? successGradient : errorGradient,
        }}
      >
        <button
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
          onClick={onClose}
        >
          <XMarkIcon className="h-6 w-6 md:h-8 md:w-8" />
        </button>

        <motion.h2
          animate={{ y: 0, opacity: 1 }}
          className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6"
          initial={{ y: 20, opacity: 0 }}
          transition={{ delay: 0.4 }}
        >
          {type === "success"
            ? "SENHA EMITIDA COM SUCESSO!"
            : "ERRO NA EMISSÃO"}
        </motion.h2>

        {ticketNumber && (
          <motion.div
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/20 p-4 md:p-6 rounded-2xl mb-4 md:mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
          >
            <p className="text-lg md:text-xl mb-2">Sua senha é:</p>
            <p className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-wider">
              {ticketNumber}
            </p>
          </motion.div>
        )}

        <motion.p
          animate={{ y: 0, opacity: 1 }}
          className="text-lg md:text-xl mb-6 md:mb-8"
          initial={{ y: 20, opacity: 0 }}
          transition={{ delay: 0.8 }}
        >
          {message}
        </motion.p>

        <motion.div
          animate={{ y: 0, opacity: 1 }}
          initial={{ y: 20, opacity: 0 }}
          transition={{ delay: 1 }}
        >
          <Button
            className="px-6 py-3 md:px-8 md:py-4 text-lg font-bold rounded-xl bg-white/20 hover:bg-white/30 border border-white/30"
            onClick={onClose}
          >
            Fechar
          </Button>
        </motion.div>

        {/* Contador regressivo */}
        <motion.div
          animate={{ width: "100%" }}
          className="absolute bottom-0 left-0 h-2 bg-white/30 rounded-b-3xl"
          initial={{ width: 0 }}
          transition={{ duration: 3, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
};

// Componente de Configurações do Totem
const TotemConfigModal = ({
  isOpen,
  onClose,
  unidadeSelecionada,
  onSave,
  unidades,
}: {
  isOpen: boolean;
  onClose: () => void;
  unidadeSelecionada: string;
  onSave: (unidade: string, identificacaoAtiva: boolean) => void;
  unidades: string[];
}) => {
  const [chave, setChave] = useState("");
  const [draftUnidade, setDraftUnidade] = useState(unidadeSelecionada);
  const [draftIdentificacaoAtiva, setDraftIdentificacaoAtiva] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setDraftUnidade(unidadeSelecionada);
    const identAtiva = localStorage.getItem("totem_identificacao_ativa") !== "false";
    setDraftIdentificacaoAtiva(identAtiva);
    setChave("");
    setError("");
  }, [isOpen, unidadeSelecionada]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (chave !== SERVICES_KEY) {
      setError("Chave de acesso incorreta.");
      return;
    }
    onSave(draftUnidade, draftIdentificacaoAtiva);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto shadow-2xl border border-gray-100 space-y-4">
        <h2 className="text-xl font-bold text-gray-800">
          Configurações do Totem
        </h2>

        {error && (
          <p className="text-sm font-semibold text-red-500 bg-red-50 p-2 rounded-lg text-center">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
              Chave de Acesso
            </label>
            <input
              type="password"
              placeholder="Digite a senha do totem"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              value={chave}
              onChange={(e) => setChave(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
              Unidade do Totem
            </label>
            <select
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-gray-50"
              value={draftUnidade}
              onChange={(e) => setDraftUnidade(e.target.value)}
            >
              {unidades.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="block text-sm font-semibold text-gray-700">
                Identificação por Mês/Ano
              </span>
              <span className="block text-xs text-gray-500">
                Solicitar mês e ano de nascimento
              </span>
            </div>
            <button
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                draftIdentificacaoAtiva ? "bg-green-500" : "bg-gray-300"
              }`}
              onClick={() => setDraftIdentificacaoAtiva(!draftIdentificacaoAtiva)}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  draftIdentificacaoAtiva ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <Button
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 bg-white"
            onClick={onClose}
          >
            Fechar
          </Button>
          <Button
            className="flex-1 py-3 rounded-xl text-white font-semibold"
            style={{ backgroundColor: COLOR_PALETTE.primary }}
            onClick={handleSave}
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

// Botão para ativar/desativar fullscreen
const FullscreenToggle = ({
  isFullscreen: _isFullscreen,
  onToggle,
}: {
  isFullscreen: boolean;
  onToggle: () => void;
}) => (
  <Button
    className="fixed top-4 right-4 z-40 p-2 rounded-full bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-sm shadow-lg"
    size="sm"
    onClick={onToggle}
  >
    <ArrowsPointingOutIcon className="h-5 w-5 text-white" />
  </Button>
);

// Helper de mascaramento LGPD — oculta apenas os nomes do meio
// Primeiro e último nomes ficam visíveis; nomes do meio são mascarados
// Preposições curtas (de, da, do) são mantidas intactas
const maskName = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName; // Nome simples ou duplo: sem máscara

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

// Componente para a tela principal de opções de ticket - OTIMIZADO PARA PREENCHER TELA
const TicketOptionsScreen = ({
  unidadeSelecionada,
  onUpdateUnidade,
  unidades,
}: {
  unidadeSelecionada: string;
  onUpdateUnidade: (unidade: string) => void;
  unidades: string[];
}) => {
  const [subOptions, setSubOptions] = useState<TicketTypes[] | null>(null);
  const [showPreferencialTypes, setShowPreferencialTypes] = useState(false);
  const [showBirthYearModal, setShowBirthYearModal] = useState(false);
  const [collisionNames, setCollisionNames] = useState<SchedulingEntry[] | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const handleSaveConfig = (novaUnidade: string, novaIdentAtiva: boolean) => {
    localStorage.setItem("totem_identificacao_ativa", String(novaIdentAtiva));
    const savedAuth = localStorage.getItem("ticket_auth_data");
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        parsed.unidade = novaUnidade;
        parsed.timestamp = Date.now();
        localStorage.setItem("ticket_auth_data", JSON.stringify(parsed));
      } catch {
        localStorage.setItem("ticket_auth_data", JSON.stringify({
          serial: SERVICES_KEY,
          unidade: novaUnidade,
          timestamp: Date.now()
        }));
      }
    }
    onUpdateUnidade(novaUnidade);
    setShowConfigModal(false);
  };
  const [checkingScheduling, setCheckingScheduling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    ticketNumber?: string;
    ticketTheme?: TicketTypes;
  } | null>(null);
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen();

  // Sugerir fullscreen após um breve delay, mas não forçar
  useEffect(() => {
    const timer = setTimeout(() => undefined, 1000);

    return () => clearTimeout(timer);
  }, [isFullscreen]);

  const handleFullscreenToggle = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  // Memoização da função de emissão de ticket para performance
  // prefixoOverride permite forçar um prefixo diferente do padrão (ex: "C" para agendados)
  const emitirTicket = async (tipo: TicketTypes, tipoPreferencial?: string, prefixoOverride?: string) => {
    if (isLoading) return;

    setIsLoading(true);
    const ticketPrefix = prefixoOverride !== undefined
      ? prefixoOverride
      : tipo === "NORMAL" ? "" : tipo[0];

    const ticket: TicketEmitedDto = {
      emissao: new Date(),
      numero: 0,
      prefixo: ticketPrefix,
      preferencial: [TicketTypes.PREFERENCIAL].includes(tipo),
      preferencialTipo: tipoPreferencial || undefined,
      status: TicketStatus.AGUARDANDO,
      type: WebsocketType.TICKET,
      unidade: unidadeSelecionada,
      grupo: TicketGroups.RECEPCAO,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(NEST_TICKETS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(ticket),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Erro ao emitir o ticket.");
      }

      const ticketResponse: Ticket = await response.json();
      const formattedTicket = `${ticketPrefix}${ticketResponse.numero}`;

      // Opções padrão de prioridade física não devem ser mascaradas (ex: "Idoso")
      const OPCOES_PREFERENCIAIS = ["Gestante", "Criança de colo", "Idoso", "PCD", "Outros"];
      const displayPreferencial = tipoPreferencial
        ? (OPCOES_PREFERENCIAIS.includes(tipoPreferencial) ? tipoPreferencial : maskName(tipoPreferencial))
        : "";

      setFeedback({
        type: "success",
        message: `Aguarde ser chamado.${displayPreferencial ? ` (${displayPreferencial})` : ""}`,
        ticketNumber: formattedTicket,
        ticketTheme: tipo,
      });
    } catch {
      setFeedback({
        type: "error",
        message:
          "Não foi possível emitir a senha. Por favor, tente novamente ou procure um funcionário.",
      });
    } finally {
      setIsLoading(false);
      setSubOptions(null);
      setShowPreferencialTypes(false);
    }
  };

  const handleTicketOption = (tipo: TicketTypes) => {
    if (tipo === TicketTypes.ATENDIMENTO) {
      setSubOptions([TicketTypes.NORMAL, TicketTypes.WHIRLPOOL]);
    } else if (tipo === TicketTypes.PREFERENCIAL) {
      setShowPreferencialTypes(true);
    } else {
      emitirTicket(tipo);
    }
  };

  /**
   * Chamado quando o usuário clica em "ATENDIMENTO GERAL" (TicketTypes.NORMAL).
   * Abre o modal de identificação por ano de nascimento.
   */
  const handleAtendimentoGeral = () => {
    const identAtiva = localStorage.getItem("totem_identificacao_ativa") !== "false";
    if (identAtiva) {
      setSubOptions(null);
      setShowBirthYearModal(true);
    } else {
      emitirTicket(TicketTypes.NORMAL, undefined, undefined);
    }
  };

  /**
   * Chamado após o usuário confirmar o ano de nascimento no teclado.
   * Consulta o backend e emite o ticket com ou sem prefixo "C".
   */
  const handleBirthYearConfirm = async (mesAnoNascimento: string) => {
    setCheckingScheduling(true);
    try {
      // Adicionamos timestamp (&t=...) para evitar cacheamento agressivo pelo navegador/totem
      const url = `${NEST_TICKET_CHECK_SCHEDULING}?unidade=${encodeURIComponent(unidadeSelecionada)}&mesAnoNascimento=${encodeURIComponent(mesAnoNascimento)}&t=${Date.now()}`;
      console.log("[totem] Consultando agendamento:", url);
      const res = await fetch(url, { method: "GET" });
      console.log("[totem] Status HTTP:", res.status, res.ok);
      const data: {
        found: boolean;
        multiple: boolean;
        results?: SchedulingEntry[];
        nome?: string;
        cpf?: string;
        dataNascimento?: string;
      } = res.ok ? await res.json() : { found: false, multiple: false };
      console.log("[totem] Resposta do backend:", JSON.stringify(data));

      if (data.found) {
        if (data.multiple && data.results && data.results.length > 0) {
          // Colisão: exibe modal de seleção de nome
          setCollisionNames(data.results);
          setShowBirthYearModal(false);
        } else if (data.nome) {
          // Único resultado: emite com prefixo "C" e o nome do funcionário
          await emitirTicket(TicketTypes.NORMAL, data.nome, "C");
          setShowBirthYearModal(false);
        } else {
          await emitirTicket(TicketTypes.NORMAL, undefined, undefined);
          setShowBirthYearModal(false);
        }
      } else {
        // Não agendado: sem prefixo → fila "Atendimento"
        await emitirTicket(TicketTypes.NORMAL, undefined, undefined);
        setShowBirthYearModal(false);
      }
    } catch (err) {
      console.error("[totem] Erro ao verificar agendamento:", err);
      await emitirTicket(TicketTypes.NORMAL, undefined, undefined);
      setShowBirthYearModal(false);
    } finally {
      setCheckingScheduling(false);
    }
  };

  /**
   * Chamado após o usuário selecionar o nome no modal de colisões.
   */
  const handleCollisionNameSelect = async (entry: SchedulingEntry | null) => {
    setCollisionNames(null);
    if (entry) {
      await emitirTicket(TicketTypes.NORMAL, entry.nome, "C");
    } else {
      await emitirTicket(TicketTypes.NORMAL, undefined, undefined);
    }
  };

  const handlePreferencialTypeSelect = (tipoPreferencial: string) => {
    emitirTicket(TicketTypes.PREFERENCIAL, tipoPreferencial);
  };

  const handleBackFromPreferencial = () => {
    setShowPreferencialTypes(false);
  };

  const getIcon = (tipo: TicketTypes) => {
    const iconClass = "w-9 h-9 md:w-10 md:h-10 lg:w-12 lg:h-12";

    switch (tipo) {
      case TicketTypes.ATENDIMENTO:
        return <QueueListIcon className={iconClass} />;
      case TicketTypes.PREFERENCIAL:
        return <UserPlusIcon className={iconClass} />;
      case TicketTypes.RETIRADA_EXAMES:
        return <ClipboardDocumentCheckIcon className={iconClass} />;
      case TicketTypes.WHIRLPOOL:
        return <BuildingOfficeIcon className={iconClass} />;
      default:
        return <UserIcon className={iconClass} />;
    }
  };

  const mainButtons = [
    { type: TicketTypes.ATENDIMENTO, label: "ATENDIMENTO" },
    { type: TicketTypes.PREFERENCIAL, label: "PREFERENCIAL" },
    {
      type: TicketTypes.RETIRADA_EXAMES,
      label: "REPETIÇÃO/RETIRADA EXAME",
    },
  ];

  const subButtons = subOptions?.map((type) => ({
    type,
    label: type === TicketTypes.NORMAL ? "ATENDIMENTO GERAL" : type,
  }));

  const buttonsToRender = subOptions ? subButtons : mainButtons;

  return (
    <div className="w-full max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-2 sm:px-4 relative">
      {/* Botão de toggle para fullscreen */}
      <FullscreenToggle
        isFullscreen={isFullscreen}
        onToggle={handleFullscreenToggle}
      />

      <Header
        unidade={unidadeSelecionada}
        onSettingsClick={() => setShowConfigModal(true)}
      />

      <TotemConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        unidadeSelecionada={unidadeSelecionada}
        onSave={handleSaveConfig}
        unidades={unidades}
      />

      <div
        className="p-4 md:p-6 lg:p-8 rounded-b-2xl shadow-lg border"
        style={{
          backgroundColor: COLOR_PALETTE.background,
          borderColor: COLOR_PALETTE.primary,
        }}
      >
        <AnimatePresence mode="wait">
          {showBirthYearModal ? (
            <div key="birth-year-modal" className="w-full flex justify-center py-1">
              <BirthYearModal
                isLoading={checkingScheduling}
                onBack={() => {
                  setShowBirthYearModal(false);
                  setSubOptions([TicketTypes.NORMAL, TicketTypes.WHIRLPOOL]);
                }}
                onConfirm={handleBirthYearConfirm}
                onOptOut={async () => {
                  setShowBirthYearModal(false);
                  await emitirTicket(TicketTypes.NORMAL, undefined, undefined);
                }}
              />
            </div>
          ) : collisionNames ? (
            <div key="select-name-modal" className="w-full flex justify-center py-1">
              <SelectNameModal
                entries={collisionNames}
                onBack={() => {
                  setCollisionNames(null);
                  setShowBirthYearModal(true);
                }}
                onSelect={handleCollisionNameSelect}
              />
            </div>
          ) : showPreferencialTypes ? (
            <div key="preferencial-types" className="w-full flex justify-center py-4">
              <PreferencialTipo
                onBack={handleBackFromPreferencial}
                onSelect={handlePreferencialTypeSelect}
              />
            </div>
          ) : (
            <motion.div
              key="main-options"
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Título */}
              <div className="text-center mb-5 md:mb-7 lg:mb-8">
                <h2
                  className="text-2xl md:text-3xl lg:text-4xl font-bold"
                  style={{ color: COLOR_PALETTE.primary }}
                >
                  {subOptions ? "Selecione o tipo de atendimento" : "Selecione o atendimento"}
                </h2>
              </div>

              {/* Grid de botões */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-6 md:mb-8 lg:mb-10">
                {buttonsToRender?.map(({ type, label }) => {
                  const cardSurface = getTicketCardSurface(type as TicketTypes);
                  const handleClick = type === TicketTypes.NORMAL
                    ? handleAtendimentoGeral
                    : () => handleTicketOption(type as TicketTypes);

                  return (
                    <motion.div
                      key={type}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex"
                      exit={{ opacity: 0, scale: 0.96 }}
                      initial={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.24, ease: "easeOut" }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.985 }}
                    >
                      <Button
                        className="flex flex-col items-center justify-center p-4 md:p-5 lg:p-6 h-40 md:h-44 lg:h-52 w-full text-lg md:text-xl lg:text-2xl font-bold rounded-2xl border transition-all duration-200 relative overflow-hidden"
                        disabled={isLoading}
                        style={{
                          background: getTicketButtonGradient(type as TicketTypes),
                          borderColor: cardSurface.borderColor,
                          color: cardSurface.textColor,
                          boxShadow: cardSurface.boxShadow,
                        }}
                        onClick={handleClick}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_58%)]" />
                        <div className="absolute inset-[1px] rounded-[calc(1rem-1px)] border border-white/10" />

                        <motion.div
                          animate={{ scale: 1 }}
                          className="mb-3 md:mb-4 relative z-10"
                          initial={{ scale: 0.92 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                        >
                          {getIcon(type as TicketTypes)}
                        </motion.div>
                        <span className="text-center leading-tight px-2 relative z-10">
                          {label}
                        </span>
                      </Button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Botão de Voltar (se houver subOptions) */}
              {subOptions && (
                <div className="flex justify-center">
                  <Button
                    className="px-8 py-4 rounded-xl border text-lg md:text-xl"
                    style={{
                      backgroundColor: COLOR_PALETTE.primary,
                      color: "white",
                      borderColor: COLOR_PALETTE.accent,
                    }}
                    onClick={() => setSubOptions(null)}
                  >
                    Voltar
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {feedback && (
            <FullScreenFeedback
              message={feedback.message}
              ticketNumber={feedback.ticketNumber}
              ticketTheme={feedback.ticketTheme}
              type={feedback.type}
              onClose={() => setFeedback(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Página Principal (Home) - PREENCHE TELA COMPLETA
export default function Home() {
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string | null>(
    null,
  );
  const { getAuthData } = useAuthStorage();
  const { unidades } = useUnits();

  useEffect(() => {
    const savedAuth = getAuthData();

    if (savedAuth && savedAuth.serial === SERVICES_KEY) {
      setUnidadeSelecionada(savedAuth.unidade);
    }
  }, [getAuthData]);

  const handleConnect = (unidade: string) => {
    setUnidadeSelecionada(unidade);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-2 sm:p-4 md:p-6"
      style={{
        background: `linear-gradient(135deg, ${COLOR_PALETTE.background} 0%, #e8f4e3 100%)`,
      }}
    >
      <AnimatePresence mode="wait">
        {unidadeSelecionada ? (
          <motion.div
            key="ticket-screen"
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex-1 flex items-center justify-center"
            exit={{ opacity: 0, scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <TicketOptionsScreen
              unidadeSelecionada={unidadeSelecionada}
              onUpdateUnidade={(u) => setUnidadeSelecionada(u)}
              unidades={unidades}
            />
          </motion.div>
        ) : (
          <motion.div
            key="initial-screen"
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex-1 flex items-center justify-center"
            exit={{ opacity: 0, scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <InitialScreen onConnect={handleConnect} unidades={unidades} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.footer
        animate={{ opacity: 1 }}
        className="mt-4 md:mt-6 text-center text-sm md:text-base py-2"
        initial={{ opacity: 0 }}
        style={{ color: COLOR_PALETTE.gray }}
        transition={{ delay: 0.5 }}
      >
        <p>Centro Médico de Saúde Ocupacional</p>
        <p>© {new Date().getFullYear()} - Todos os direitos reservados</p>
      </motion.footer>
    </div>
  );
}
