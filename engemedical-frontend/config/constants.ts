// ---------------------------------------------------------
// NEST BACKEND
// ---------------------------------------------------------
const PORT = 3333;
const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "") + "/";
const NEST_URL_DEVELOP = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_NEST_URL_DEVELOP || `http://127.0.0.1:${PORT}`,
);

export const NEST_URL =
  process.env.NODE_ENV === "development"
    ? NEST_URL_DEVELOP
    : normalizeBaseUrl(
        process.env.NEXT_PUBLIC_NEST_URL_PRODUCTION ||
          "https://cmso360-backend.fly.dev",
      );
// export const NEST_URL = `http://192.168.0.222:${PORT}/`
export const NEXT_WS_URL = NEST_URL?.replace("http", "ws").replace(
  "https",
  "wss",
);

export const isLoopbackHost = (host: string) => {
  const normalized = String(host || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized.startsWith("127.")
  );
};

export const getHostnameFromUrl = (value: string) => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
};

export const isLoopbackUrl = (value: string) =>
  isLoopbackHost(getHostnameFromUrl(value));

export const resolveTeleatendimentoWsUrl = () => {
  if (typeof window === "undefined") {
    return NEXT_WS_URL;
  }

  const pageHost = window.location.hostname.toLowerCase();
  const configuredHost = getHostnameFromUrl(NEXT_WS_URL || NEST_URL_DEVELOP);

  if (!isLoopbackHost(pageHost) && isLoopbackHost(configuredHost)) {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${pageHost}:${PORT}/`;
  }

  return NEXT_WS_URL;
};

export const getDynamicNestUrl = () => {
  if (typeof window === "undefined") {
    return NEST_URL;
  }

  const pageHost = window.location.hostname.toLowerCase();
  const configuredHost = getHostnameFromUrl(NEST_URL);

  if (!isLoopbackHost(pageHost) && isLoopbackHost(configuredHost)) {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    return `${protocol}://${pageHost}:${PORT}/`;
  }

  return NEST_URL;
};

// ---------------------------------------------------------
// WORKER (Scraping Metrics)
// ---------------------------------------------------------
export const WORKER_URL = NEST_URL;

export const WORKER_WS_URL = WORKER_URL?.replace("http", "ws").replace(
  "https",
  "wss",
);

export const WORKER_SCRAPER_STATUS = `${WORKER_URL}scraper/status`;

export const NEST_TICKETS_URL = `${NEST_URL}ticket`;
export const NEST_TICKET_QUERY = `${NEST_URL}ticket?unidade=`;
export const NEST_TICKET_DELETE = `${NEST_URL}ticket/delete/`;
export const NEST_TICKET_CHECK_SCHEDULING = `${NEST_URL}ticket/check-scheduling`;
export const NEST_TICKETS_ALL_URL = `${NEST_URL}ticket/all`;

export const NEST_DASHBOARD = NEST_URL + "schedulings/dashboard";

export const NEST_SCHEDULINGS_ANEXO_UPLOAD = `${NEST_URL}schedulings/upload-anexo`;
export const NEST_SCHEDULINGS_ANEXO_REMOVE = `${NEST_URL}schedulings/remove-anexo`;
export const NEST_SCHEDULINGS_DELETE = `${NEST_URL}schedulings/delete`;
export const NEST_SCHEDULINGS_DELETE_ATTACHMENT = `${NEST_URL}schedulings/delete-attachment`;
export const NEST_SCHEDULINGS_EXAM_UPDATE = `${NEST_URL}schedulings/exame/update`;
export const NEST_SCHEDULINGS_EXAM_REISSUE = `${NEST_URL}schedulings/exame/reissue`;
export const NEST_SCHEDULINGS_FINISH = `${NEST_URL}schedulings/finish`;
export const NEST_SCHEDULINGS_PRONTUARIO = `${NEST_URL}schedulings/prontuario/`; // adiciona id na query
export const NEST_SCHEDULINGS_STATISTICS = `${NEST_URL}schedulings/statistics`;
export const NEST_SCHEDULINGS_TODAY = `${NEST_URL}schedulings/today`;
export const NEST_SCHEDULINGS_UPDATE = `${NEST_URL}schedulings/update`;
export const NEST_SCHEDULINGS_UPDATE_EXAM_RESULT = `${NEST_URL}schedulings/update/resultadoexame`; // envia resultados de exame pdf

export const NEST_FACIAL_SESSION = "/api/facial/session";
export const NEST_FACIAL_STATUS = "/api/facial/status/";
export const NEST_FACIAL_FINALIZE = "/api/facial/finalize";
export const NEST_TELEATENDIMENTO_SESSION = "/api/teleatendimento/session";
export const NEST_TELEATENDIMENTO_INVITE = "/api/teleatendimento/invite/";

export const NEST_PRONTUARIO_PARAMETROS =
  NEST_URL + "schedulings/record-params";
export const NEST_PRONTUARIO_REGISTROS = NEST_URL + "schedulings/records";
export const NEST_GED_EMPRESAS = NEST_URL + "schedulings/ged/empresas";
export const NEST_GED_PERIODOS = NEST_URL + "schedulings/ged/periodos";
export const NEST_GED_DIAS = NEST_URL + "schedulings/ged/dias";
export const NEST_GED_PRONTUARIOS = NEST_URL + "schedulings/ged/prontuarios";
export const NEST_GED_ARQUIVOS = NEST_URL + "schedulings/ged/arquivos";
export const NEST_GED_BATCH = NEST_URL + "schedulings/ged/batch";
export const NEST_RELATORIO_PARAMETROS = NEST_URL + "schedulings/report-params";
export const NEST_RELATORIO_FILTROS = NEST_URL + "schedulings/report-filters";
export const NEST_RELATORIO_FUNCIONARIO = NEST_URL + "schedulings/report/"; // schedulings/report/:ID ---> Busca funcionário
export const NEST_RELATORIO_CSV_DOWNLOAD =
  NEST_URL + "schedulings/csv-download"; // schedulings/report/:ID ---> Busca funcionário

export const NEST_SOC_AUDIOMETRIA_ANTERIOR = `${NEST_URL}soc/audiometria-anterior`;
export const NEST_SOC_COMPANIES = `${NEST_URL}soc/empresas`;
export const NEST_SOC_CADASTROPESSOAS = `${NEST_URL}soc/cadastropessoas`;
export const NEST_SOC_PEDIDOEXAME = `${NEST_URL}soc/pedidoexame?`;
export const NEST_SOC_PEDIDOEXAME_OPTIONS = `${NEST_URL}soc/pedidoexame/options?`;
export const NEST_SOC_PEDIDOEXAME_VALIDADE = `${NEST_URL}soc/pedidoexame/validate?`;
export const NEST_SOC_PEDIDOEXAME_CREDENCIADAS = 
`${NEST_URL}soc/pedidoexame/credenciadas`;
export const NEST_SOC_RECORDS = `${NEST_URL}soc/asos?`;
export const NEST_SOC_SINCRONIZAR_PRONTUARIO = `${NEST_URL}soc/sincronizar-prontuario`;

export const NEST_NOTIFICATION_URL = `${NEST_URL}push/subscribe`;
export const NEST_USER_SETTINGS_URL = `${NEST_URL}user-settings/`;
export const NEST_AUDIT_LOGS_URL = `${NEST_URL}audit-logs`;

export const NEST_INTERNAL_HEALTH_WORKERS = `${NEST_URL}internal/health/workers`;
export const NEST_AZURE_QUEUES_STATS = `${NEST_URL}azure/queues/stats`;
export const NEST_AZURE_QUEUE_PEEK = `${NEST_URL}azure/queues`;

// ---------------------------------------------------------
// NEXT APPLICATION
// ---------------------------------------------------------
export const API_REGISTER_URL = "/api/register";
export const SERVICES_KEY = "123";

export const PRIMARY_COLOR = "#114e34";
export const SECOND_COLOR = "#afca07";

export const USER_PROFILE = {
  MASTER: "MASTER",

  // PERFIS DE SISTEMA
  RECEPCAO: "RECEPÇÃO",
  ATENDIMENTO: "ATENDIMENTO",
  ADMINISTRATIVO: "ADMINISTRATIVO",

  // PERFIS CLÍNICOS
  MEDICO: "MÉDICO",
  ENFERMAGEM: "ENFERMAGEM",
  FONOAUDIOLOGIA: "FONOAUDIOLOGIA",
  LABORATORIO: "LABORATÓRIO",
  RADIOLGIA: "RADIOLOGIA",
  PSICOLOGO: "PSICÓLOGO",
};

export const PREFERENCIAL_OPTIONS = [
  "Gestante",
  "Criança de colo",
  "Idoso",
  "PCD",
  "Outros",
];

// Paleta de cores baseada no logo
export const COLOR_PALETTE = {
  primary: "#44735e", // Verde principal
  secondary: "#b8d864", // Verde claro/amarelado
  accent: "#5a8c7a", // Verde médio
  light: "#e8f4e3", // Verde muito claro
  dark: "#2a4a3a", // Verde escuro
  background: "#f5f9f7", // Fundo claro
  text: "#1a2a1f", // Texto escuro
  gray: "#6b7f76", // Cinza esverdeado
};

export const UNIDADES_ATENDIMENTO = ["ARARAS", "CORDEIRÓPOLIS", "RIO CLARO"];
export const SALAS_RECEPCAO = [
  "BALCÃO",
  "FINALIZAÇÃO",
  "GUICHÊ 1",
  "GUICHÊ 2",
  "GUICHÊ 3",
  "GUICHÊ 4",
  "GUICHÊ 5",
  "GUICHÊ 6",
  "GUICHÊ 7",
  "GUICHÊ 8",
  "GUICHÊ 9",
  "GUICHÊ 10",
  "GUICHÊ 11",
  "GUICHÊ 12",
  "RECEPÇÃO 1",
  "RECEPÇÃO 2",
  "RECEPÇÃO 3",
  "PREPARO AGENDA",
];
export const SALAS_EXAMES = [
  "SALA 1",
  "SALA 1 - LAB",
  "SALA 1 - ESP",
  "SALA 2",
  "SALA 3-A",
  "SALA 3-B",
  "SALA 4",
  "SALA 5-A",
  "SALA 5-B",
  "SALA 6-A",
  "SALA 6-B",
  "SALA 6-C",
  "SALA 7",
  "SALA 8",
  "SALA 9",
  "SALA 10",
  "SALA 11",
  "SALA 12",
  "SALA 13",
  "UNIDADE MÓVEL",
];

export const TIPOS_EXAME: Record<string, string> = {
  ADMISSIONAL: "ADMISSIONAL",
  PERIODICO: "PERIÓDICO",
  DEMISSIONAL: "DEMISSIONAL",
  "RETORNO TRABALHO": "RETORNO TRABALHO",
  "MUDANCA FUNCAO": "MUDANÇA DE RISCO",
  "MONITORACAO PONTUAL": "MONITORAÇÃO PONTUAL",
};

export const ESTIMATIVA_EXAMES: Record<string, number> = {
  Triagem: 10,

  "Acuidade Visual": 15,
  Espirometria: 18,
  Audiometria: 18,

  Laboratorial: 22,
  "Avaliação Psicossocial": 22,

  EEG: 40,
  ECG: 25,
  "Raio-X": 50,

  "Exame Clínico": 25,
};

export const EMPRESAS_COM_PSICOLOGA = new Set([
  "263126", // RICLAN
  "690978", // AUTOPORT
  "310540", // OWENS 45
  "310539", // OWENS 83
  "310538", // OWENS 92
  "270281", // ALISUL
  "176792", // SEW
  "122878", // 3 FAZENDAS
  "821445", // EXPERT
]);

export const EMPRESAS_CREDENCIADAS_SOC = new Set([
  // KIT SW OCUPACIONAL ---> Grupo savegnago
  "1712886",
  // KIT UNIMED SOU RJ ---> Grupo Bauminas / Nheel Quimica
  "2008962",
  // KIT SALU
  "1246478",
  // KIT ESMALGLASS
  "353226",
]);

export const CODIGOS_RISCO_ALTURA = new Set([
  "179", // Trabalho em altura
  "213", // Acidentes - trabalho em altura
  "252", // Preventivo - Trabalho em Altura
  "263", // Quedas de altura superior a 2 metros
  "336", // Diferença de nível maior que 2 metros / Queda em altura
  "395", // Queda em altura
  "777", // Trabalho eventual em altura
  "782", // Queda com diferença de nível maior que dois metros
  "941", // Queda de pessoa com diferença de nível acima de dois metros (queda de altura)
  "978", // Trabalho em altura no acesso a partes superiores de tanques e instalações do Binder
  "1277", // Queda de altura em nivel dferente - ACID 1
  "1302", // Trabalho com diferença de nível maior que dois metros
  "1379", // Queda - Altura - Diferença de nível maior que dois metros
]);

export const CODIGOS_ESPACO_CONFINADO = new Set([
  "237", // Espaço Confinado
  "364", // Operações em Espaço Confinado
  "382", // Trabalho em Espaço confinado
  "666", // Catalogação dos espaços confinados
  "977", // Espaço confinado no acesso a tanques para inspeção e limpeza
]);
