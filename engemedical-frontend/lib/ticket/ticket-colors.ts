import { TicketTypes } from "@/lib/ticket/ticket";

type ToneScale = {
  primary: string;
  secondary: string;
  soft: string;
  border: string;
  text: string;
  shadow: string;
};

const COMMON_TONE: ToneScale = {
  primary: "#1D4ED8",
  secondary: "#2563EB",
  soft: "#DBEAFE",
  border: "#93C5FD",
  text: "#FFFFFF",
  shadow: "rgba(37, 99, 235, 0.28)",
};

const PRIORITY_TONE: ToneScale = {
  primary: "#C62828",
  secondary: "#E53935",
  soft: "#FEE2E2",
  border: "#FCA5A5",
  text: "#FFFFFF",
  shadow: "rgba(198, 40, 40, 0.28)",
};

const AGENDADOS_TONE: ToneScale = {
  primary: "#EA580C",
  secondary: "#F97316",
  soft: "#FFEDD5",
  border: "#FDBA74",
  text: "#FFFFFF",
  shadow: "rgba(249, 115, 22, 0.28)",
};

const PREFIXED_TONE: ToneScale = {
  primary: "#0F766E",
  secondary: "#0D9488",
  soft: "#CCFBF1",
  border: "#5EEAD4",
  text: "#FFFFFF",
  shadow: "rgba(13, 148, 136, 0.26)",
};

export const extractTicketPrefix = (ticket?: string) => {
  if (!ticket) return "";

  const match = ticket.trim().match(/^([A-Za-z]+)/);

  return match?.[1]?.toUpperCase() || "";
};

export const getReceptionToneByPrefix = (prefix?: string): ToneScale => {
  const normalizedPrefix = (prefix || "").trim().toUpperCase();

  if (!normalizedPrefix) return COMMON_TONE;
  if (normalizedPrefix === "P") return PRIORITY_TONE;
  if (normalizedPrefix === "C") return AGENDADOS_TONE;

  return PREFIXED_TONE;
};

export const getReceptionToneByTicket = (ticket?: string): ToneScale =>
  getReceptionToneByPrefix(extractTicketPrefix(ticket));

export const getTicketTypeTone = (type: TicketTypes): ToneScale => {
  switch (type) {
    case TicketTypes.PREFERENCIAL:
      return PRIORITY_TONE;
    case TicketTypes.RETIRADA_EXAMES:
    case TicketTypes.WHIRLPOOL:
      return PREFIXED_TONE;
    case TicketTypes.ATENDIMENTO:
    case TicketTypes.NORMAL:
    default:
      return COMMON_TONE;
  }
};

export const getTicketButtonGradient = (type: TicketTypes) => {
  const tone = getTicketTypeTone(type);

  return `linear-gradient(135deg, ${tone.primary} 0%, ${tone.secondary} 100%)`;
};

export const getTicketCardSurface = (type: TicketTypes) => {
  const tone = getTicketTypeTone(type);

  return {
    background: `linear-gradient(160deg, ${tone.primary} 0%, ${tone.secondary} 100%)`,
    borderColor: tone.border,
    boxShadow: `0 18px 38px -20px ${tone.shadow}`,
    textColor: tone.text,
  };
};

export const getPreferentialCardSurface = (
  selected: boolean,
  hovered: boolean,
) => {
  const tone = PRIORITY_TONE;

  if (selected) {
    return {
      background: `linear-gradient(160deg, ${tone.primary} 0%, ${tone.secondary} 100%)`,
      borderColor: "rgba(255,255,255,0.26)",
      boxShadow: `0 22px 45px -24px ${tone.shadow}`,
    };
  }

  if (hovered) {
    return {
      background: `linear-gradient(160deg, ${tone.primary} 0%, #EF5350 100%)`,
      borderColor: "rgba(255,255,255,0.22)",
      boxShadow: `0 20px 40px -24px ${tone.shadow}`,
    };
  }

  return {
    background: `linear-gradient(160deg, #D14343 0%, ${tone.primary} 100%)`,
    borderColor: "rgba(255,255,255,0.18)",
    boxShadow: `0 16px 34px -24px ${tone.shadow}`,
  };
};

export type { ToneScale };
