import { IUserInfo } from "./user/interfaces/IUser";
import { ICadastroPessoas } from "./soc/interfaces/ICadastroPessoas";
import { AtendimentoStatus } from "./scheduling/enum/scheduling.enum";

const BRAZIL_TIMEZONE = "America/Sao_Paulo";

export function getBrazilDateISO(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function addDaysToISODate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);

  if (!year || !month || !day) return isoDate;

  const utcDate = new Date(Date.UTC(year, month - 1, day));

  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  return utcDate.toISOString().slice(0, 10);
}

export async function fetchBodyJson<T>(
  url: string,
  method: string,
  body: object,
): Promise<T> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.message || `HTTP error! status: ${response.status}`;

      throw new Error(errorMessage);
    }

    return (await response.json()) as T;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function mapCadastroPessoasToUserInfo(
  socUser: ICadastroPessoas,
): IUserInfo {
  return {
    codigo: socUser.CODIGO,
    nome: socUser.NOME ?? "",
    cpf: socUser.CPF ?? "",
    conselho: socUser.CONSELHO_CLASSE ?? "",
    ufconselho: socUser.UF_CONSELHO ?? "",
    perfil: socUser.REGISTRO_FUNCIONAL || "CONVIDADO",
  };
}

export const getCurrentUser = (): IUserInfo | null => {
  if (typeof window !== "undefined") {
    const userData = sessionStorage.getItem("currentUser");

    return userData ? (JSON.parse(userData) as IUserInfo) : null;
  }

  return null;
};

export const setCurrentUser = (user: IUserInfo) => {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("currentUser", JSON.stringify(user));
  }
};

export const logout = () => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("currentUser");
    import("@/lib/notification-store").then(({ clearAllNotifications }) => {
      clearAllNotifications();
    });
  }
  // Registrar logout na auditoria (fire-and-forget)
  fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
};

export const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, "");

  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

export function formatPhone(value: string): string {
  if (!value) return "";

  // Remove tudo que não for número
  const onlyNums = value.replace(/\D/g, "");

  // Aplica a máscara passo a passo
  if (onlyNums.length <= 2) {
    return `(${onlyNums}`;
  } else if (onlyNums.length <= 7) {
    return `(${onlyNums.slice(0, 2)}) ${onlyNums.slice(2)}`;
  } else if (onlyNums.length <= 11) {
    return `(${onlyNums.slice(0, 2)}) ${onlyNums.slice(2, 7)}-${onlyNums.slice(7)}`;
  } else {
    return `(${onlyNums.slice(0, 2)}) ${onlyNums.slice(2, 7)}-${onlyNums.slice(7, 11)}`;
  }
}

export function formatBrithdayDate(value: string) {
  const numeric = value.replace(/\D/g, "").slice(0, 8);
  let formatted = numeric;

  if (numeric.length > 4)
    formatted = `${numeric.slice(0, 2)}/${numeric.slice(2, 4)}/${numeric.slice(4)}`;
  else if (numeric.length > 2)
    formatted = `${numeric.slice(0, 2)}/${numeric.slice(2)}`;

  return formatted;
}

export const copyToClipboard = async (text: string) => {
  if (!text) return;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback: cria um textarea invisível
      const textarea = document.createElement("textarea");

      textarea.value = text;
      textarea.style.position = "fixed"; // evita scroll
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  } catch (err) {
    console.error("Erro ao copiar: ", err);
  }
};

/**
 * Esta tabela de conversão trata-se para o exporta dados
 * ASO Funcionário.
 *
 * @param tipoexame (string)
 * @returns nome tipo de exame (string)
 */
export const convertTipoAsoNome = (tipoexame: string) => {
  let result;

  switch (tipoexame) {
    case "0":
      result = "ADMISSIONAL";
      break;
    case "1":
      result = "ADMISSIONAL";
      break;
    case "2":
      result = "PERIODICO";
      break;
    case "3":
      result = "RETORNO TRABALHO";
      break;
    case "4":
      result = "MUDANCA FUNCAO";
      break;
    case "6":
      result = "MONITORACAO PONTUAL";
      break;
    case "5":
    case "8":
      result = "DEMISSIONAL";
      break;
  }

  return result ?? tipoexame;
};

/**
 * Esta tabela de parecer médico trata-se para o exporta dados
 * ASO Funcionário.
 *
 * @param parecer (string)
 * @returns parecer do ASO (string)
 */
export const convertRespAso = (parecer: string) => {
  let result;

  switch (parecer) {
    case "0":
      result = "Sem parecer médico";
      break;
    case "1":
      result = "Apto para função";
      break;
    case "2":
      result = "Inapto para função";
      break;
  }

  return result ?? parecer;
};

/**
 * Função para converter o content de arquivos para base 64
 * @param file
 * @returns string
 */
export const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(",")[1]); // remove prefixo "data:*/*;base64,"
    reader.onerror = (error) => reject(error);
  });
};

export function ordemAlfabetica(data: string[]) {
  if (data.length === 0) return;

  return data.sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 *
 * @param status em que o ATENDIMENTOSTATUS se encontra
 * @returns cor referente a situação
 */
export const getStatusColor = (status: string) => {
  switch (status) {
    case AtendimentoStatus.AGENDADO:
      return "default"; // Cinza neutro
    case AtendimentoStatus.EM_ATENDIMENTO:
      return "primary"; // Azul (Em Atendimento - Ativo) - Substituído 'danger'
    case AtendimentoStatus.AGUARDANDO_RESULTADOS:
      return "secondary"; // Roxo/Índigo (Aguardando exames externos)
    case AtendimentoStatus.AVALIACAO_MEDICA:
      return "warning"; // Âmbar (Aguardando liberação médica)
    case AtendimentoStatus.FINALIZADO:
      return "success"; // Verde (Fluxo concluído)
    case AtendimentoStatus.PENDENTE:
      return "warning"; // Âmbar/Laranja para consistência com o painel de gestão
    default:
      return "primary";
  }
};
/**
 * Normaliza uma string para uso como ID ou nome de sala (remove acentos e caracteres especiais)
 * Ex: "RECEPÇÃO 2" -> "RECEPCAO_2"
 */
export function normalizeId(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9]/g, "_") // Substitui não-alfanuméricos por _
    .toUpperCase();
}
