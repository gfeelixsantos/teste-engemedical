"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Users,
  Stethoscope,
  FileText,
  ChartNoAxesCombined,
  BarChart3,
  CalendarDays,
  Settings,
  LayoutGrid,
  Bell,
  X,
  ChevronDown,
} from "lucide-react";
import {
  Button,
  addToast,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

import { StatisticsSection } from "./components/StatisticsSection";
import { ConsentModal } from "@/lib/consent/ConsentModal";
import {
  getCurrentMessage,
  Message,
  sanitizeMessageHtml,
} from "./message/messageDisplay";

import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { getCurrentUser, logout } from "@/lib/utils";
import { HeaderApp } from "@/components/shared/HeaderApp";
import EngemedicalLoading from "@/components/shared/EngemedicalLoading";
import PremiumCyberLoading from "@/components/shared/PremiumCyberLoading";
import { usePscAuthStatus } from "@/hooks/usePscAuthStatus";
import { SidebarMenu } from "@/components/shared/SidebarMenu";
import { getHomeRoute } from "@/lib/user/home-route.mjs";

// Constantes
const SESSION_MESSAGE_KEY = "dashboard_current_message";
const SESSION_SEEN_KEY = "message_seen";

// Componente Modal de Mensagem
const MessageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}> = ({ isOpen, onClose, message }) => {
  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-[#0698C2]/15"
        exit={{ opacity: 0, scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.95 }}
      >
        <div className="p-6 border-b border-[#0698C2]/15 bg-[#F2F9FC]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="h-20 w-20 object-contain"
                src="/images/gifs/Notification.webm"
              />
              <div>
                <h2 className="text-xl font-bold text-[#005C7A]">
                  {message.title}
                </h2>
                <p className="text-md text-gray-500">{message.date}</p>
              </div>
            </div>
            <button
              aria-label="Fechar"
              className="p-2 hover:bg-[#E6F5FA] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0698C2]/40"
              onClick={onClose}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[58vh]">
          <div className="prose prose-lg max-w-none">
            {message.contentType === "html" ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeMessageHtml(message.content),
                }}
                className="text-gray-700 leading-relaxed [&_p]:my-3 [&_strong]:text-[#005C7A] [&_a]:text-[#0698C2] [&_a:hover]:text-[#005C7A] [&_a]:underline [&_img]:rounded-2xl [&_img]:max-h-56 [&_img]:w-auto [&_img]:mx-auto [&_img]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_h3]:text-[#005C7A] [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_blockquote]:mt-5 [&_blockquote]:rounded-xl [&_blockquote]:border-l-4 [&_blockquote]:border-[#0698C2] [&_blockquote]:bg-[#F2F9FC] [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-[#005C7A]"
              />
            ) : (
              <div className="whitespace-pre-line text-gray-700">
                {message.content}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-[#0698C2]/15 bg-[#F2F9FC]">
          <div className="flex justify-end">
            <Button
              className="px-6 py-2 text-[#005C7A] hover:bg-[#E6F5FA]"
              color="default"
              variant="flat"
              onPress={onClose}
            >
              Fechar
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Botão flutuante para mensagens
const MessageFloatingButton: React.FC<{
  onClick: () => void;
  hasMessage: boolean;
}> = ({ onClick, hasMessage }) => (
  <button
    aria-label="Visualizar mensagem atual"
    className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#0698C2] rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center group"
    disabled={true}
    onClick={onClick}
  >
    <Bell className="h-6 w-6 text-white" />
    {hasMessage && (
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
    )}
    <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
      Ver mensagem
    </span>
  </button>
);

// Funções para gerenciar sessão
const setSessionMessage = (message: Message): void => {
  if (typeof window !== "undefined") {
    // Remove mensagem anterior e marcação de vista
    sessionStorage.removeItem(SESSION_SEEN_KEY);
    sessionStorage.setItem(SESSION_MESSAGE_KEY, JSON.stringify(message));
  }
};

const getSessionMessage = (): Message | null => {
  if (typeof window !== "undefined") {
    const messageStr = sessionStorage.getItem(SESSION_MESSAGE_KEY);

    return messageStr ? JSON.parse(messageStr) : null;
  }

  return null;
};

const markMessageAsSeen = (): void => {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_SEEN_KEY, "true");
  }
};

const hasSeenMessage = (): boolean => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(SESSION_SEEN_KEY) === "true";
  }

  return false;
};

const clearSessionMessage = (): void => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_MESSAGE_KEY);
    sessionStorage.removeItem(SESSION_SEEN_KEY);
  }
};

const DASHBOARDS_PREMIUM = [
  { title: "Convocação de Exames", path: "/dashboards/convocacao" },
  { title: "Volumetria", path: "/dashboards/volumetria" },
  { title: "Absenteísmo", path: "/dashboards/absenteismo" },
  { title: "eSocial", path: "/dashboards/esocial" },
  { title: "Gestão de Vidas", path: "/dashboards/vidas" },
  { title: "Documentos SST", path: "/dashboards/documentos" },
] as const;

const dashboardNavItems = {
  primary: [
    {
      title: "Atendimento",
      description: "Fluxo clínico e exames",
      icon: Stethoscope,
      path: "/atendimento",
    },
    {
      title: "Recepção",
      description: "Fila, chegada e triagem",
      icon: Users,
      path: "/recepcao",
    },
    {
      title: "Relatórios",
      description: "Indicadores e documentos",
      icon: ChartNoAxesCombined,
      path: "/relatorio",
    },
    {
      title: "Prontuários",
      description: "Histórico ocupacional",
      icon: FileText,
      path: "/prontuarios",
    },
  ],
  secondary: [
    { title: "Dashboards Premium", icon: BarChart3, path: "/dashboards" },
    { title: "Agenda", icon: CalendarDays, path: "/agenda" },
    { title: "Configurações", icon: Settings, path: "/configuracoes" },
    { title: "Serviços", icon: LayoutGrid, path: "/servicos" },
  ],
} as const;

const LegacyDashboardNavSidebar: React.FC<{
  onNavigate: (path: string) => void;
}> = ({ onNavigate }) => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [dashboardsExpanded, setDashboardsExpanded] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <motion.aside
      animate={{ width: isSidebarExpanded ? 288 : 84 }}
      aria-label="Menu principal do dashboard"
      className="group fixed left-4 top-24 z-30 hidden h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-brand-line/70 bg-white/95 text-slate-900 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_20px_56px_rgba(15,23,42,0.14)] lg:block"
      initial={false}
      onMouseEnter={() => setIsSidebarExpanded(true)}
      onMouseLeave={() => setIsSidebarExpanded(false)}
    >
      <div className="flex h-full flex-col p-3">
        {/* Logo */}
        <div className="mb-5 flex h-14 items-center gap-3 rounded-xl border border-brand-line/70 bg-brand-mist/70 px-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-brand-line bg-white shadow-sm">
            <Image
              alt="Engemedical Brasil"
              className="h-8 w-8 object-contain"
              height={28}
              src="/images/logo.png"
              width={28}
            />
          </div>
          <motion.div
            animate={{
              opacity: isSidebarExpanded ? 1 : 0,
              x: isSidebarExpanded ? 0 : -8,
            }}
            className="min-w-0"
          >
            <p className="truncate text-sm font-semibold text-brand-midnight">
              Engemedical
            </p>
            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-brand-blue">
              Connect
            </p>
          </motion.div>
        </div>

        {/* Primary Nav */}
        <nav className="space-y-2" role="navigation">
          {dashboardNavItems.primary.map(
            ({ title, description, icon: Icon, path }) => {
              const active = isActive(path);
              return (
                <button
                  key={title}
                  aria-label={`Acessar ${title}`}
                  className={`group/item flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 ${
                    active
                      ? "border-brand-500/30 bg-brand-50"
                      : "border-transparent hover:border-brand-green-300 hover:bg-brand-mist"
                  }`}
                  type="button"
                  onClick={() => onNavigate(path)}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border shadow-sm transition-all duration-200 ${
                      active
                        ? "border-brand-500/30 bg-brand-100 text-brand-600"
                        : "border-brand-line bg-white text-brand-blue group-hover/item:border-brand-green/40 group-hover/item:bg-brand-mist group-hover/item:text-brand-green"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <motion.span
                    animate={{
                      opacity: isSidebarExpanded ? 1 : 0,
                      width: isSidebarExpanded ? "auto" : 0,
                    }}
                    className="min-w-0 overflow-hidden"
                  >
                    <span className="block whitespace-nowrap text-sm font-semibold text-slate-900">
                      {title}
                    </span>
                    <span className="block whitespace-nowrap text-xs text-slate-500">
                      {description}
                    </span>
                  </motion.span>
                </button>
              );
            },
          )}
        </nav>

        {/* Separator */}
        <div className="my-3 mx-2 border-t border-brand-line/50" />

        {/* Secondary Nav */}
        <nav
          aria-label="Navegação secundária"
          className="space-y-1"
          role="navigation"
        >
          {dashboardNavItems.secondary.map(
            ({ title, icon: Icon, path }) => {
              const active = isActive(path);
              const isDashboards = title === "Dashboards Premium";
              return (
                <div key={title}>
                  <button
                    aria-label={`Acessar ${title}`}
                    className={`group/item flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 ${
                      active
                        ? "border-brand-500/30 bg-brand-50"
                        : "border-transparent hover:border-brand-green-300 hover:bg-brand-mist"
                    }`}
                    type="button"
                    onClick={() => {
                      if (isDashboards) {
                        setDashboardsExpanded(!dashboardsExpanded);
                      } else {
                        onNavigate(path);
                      }
                    }}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border shadow-sm transition-all duration-200 ${
                        active
                          ? "border-brand-500/30 bg-brand-100 text-brand-600"
                          : "border-brand-line bg-white text-brand-blue group-hover/item:border-brand-green/40 group-hover/item:bg-brand-mist group-hover/item:text-brand-green"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <motion.span
                      animate={{
                        opacity: isSidebarExpanded ? 1 : 0,
                        width: isSidebarExpanded ? "auto" : 0,
                      }}
                      className="min-w-0 overflow-hidden"
                    >
                      <span className="block whitespace-nowrap text-sm font-medium text-slate-700">
                        {title}
                      </span>
                    </motion.span>
                    {isDashboards && isSidebarExpanded && (
                      <ChevronDown className={`h-3 w-3 shrink-0 ml-auto transition-transform ${dashboardsExpanded ? "rotate-180" : ""}`} />
                    )}
                  </button>

                  {/* Sub-menu dos dashboards premium */}
                  {isDashboards && dashboardsExpanded && isSidebarExpanded && (
                    <div className="ml-11 mt-0.5 space-y-0.5 border-l-2 border-gray-200 pl-2">
                      {DASHBOARDS_PREMIUM.map(({ title: dashTitle, path: dashPath }) => (
                        <button
                          key={dashPath}
                          type="button"
                          onClick={() => onNavigate(dashPath)}
                          className={`flex w-full items-center rounded-lg px-2 py-1 text-left text-[11px] font-medium transition-all ${
                            isActive(dashPath)
                              ? "bg-brand-50 text-brand-700"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                          }`}
                        >
                          <span className="truncate">{dashTitle}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            },
          )}
        </nav>

        {/* Decorative bar */}
        <div className="mt-auto flex justify-center border-t border-brand-line/70 pt-4">
          <span className="h-1.5 w-8 rounded-full bg-gradient-to-r from-brand-blue to-brand-green" />
        </div>
      </div>
    </motion.aside>
  );
};

const DashboardNavSidebar: React.FC = () => (
  <aside
    aria-label="Menu principal do dashboard"
    className="sticky top-16 relative z-[1000] hidden h-[calc(100vh-4rem)] w-64 shrink-0 self-start overflow-y-auto overscroll-contain scrollbar-hidden text-slate-900 lg:block"
  >
    <div className="min-h-full w-64 rounded-r-2xl border-r border-brand-200/80 bg-white p-3 shadow-[8px_0_24px_rgba(0,69,96,0.08)]">
      <SidebarMenu openOnHover />
    </div>
  </aside>
);

const WelcomeSection: React.FC<{ name: string }> = ({ name }) => (
  <motion.section
    animate={{ opacity: 1, y: 0 }}
    aria-labelledby="welcome-title"
    className="mb-6"
    initial={{ opacity: 0, y: 20 }}
    transition={{ duration: 0.5 }}
  >
    <section className="flex justify-between">
      <div>
        <h1
          className="text-3xl font-bold text-gray-900 tracking-tight"
          id="welcome-title"
        >
          Bem-vindo,{" "}
          <span>
            {name.split(" ")[0]} {name.split(" ")[1]}
          </span>
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Acompanhe a operação do dia com indicadores consolidados de
          atendimento e SST.
        </p>
      </div>
    </section>
  </motion.section>
);

// Componente Principal
export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<IUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showPostLoginTransition, setShowPostLoginTransition] = useState(false);

  const {
    pscAuthStatus,
    isLoading: isPscLoading,
    refetch: refetchPscStatus,
  } = usePscAuthStatus();
  const previousPscStatusRef = useRef(pscAuthStatus.status);
  const expiryWarningShownRef = useRef(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [isPscAuthenticating, setIsPscAuthenticating] = useState(false);
  const pscAuthWindowRef = useRef<Window | null>(null);
  const [pscAuthWindowUrl, setPscAuthWindowUrl] = useState<string>("");

  const handlePostLoginComplete = useCallback(() => {
    setShowPostLoginTransition(false);
    router.replace(getHomeRoute(getCurrentUser()), { scroll: false });
  }, [router]);

  // Buscar mensagem atual
  const fetchAndSetMessage = async () => {
    const message = await getCurrentMessage();

    if (message) {
      // Sempre sobrescreve a mensagem anterior na sessão
      setSessionMessage(message);
      setCurrentMessage(message);

      // Verificar se já foi vista
      // if (!hasSeenMessage()) {
      //   setShowModal(true);
      // }

      setHasNewMessage(true);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      const currentUser = getCurrentUser();

      if (!currentUser) {
        setIsLoading(false);
        router.push("/");

        return;
      }

      if (
        new URLSearchParams(window.location.search).get("loginTransition") ===
        "1"
      ) {
        setShowPostLoginTransition(true);
      }

      setUser(currentUser);

      try {
        // Verificar se há mensagem na sessão
        const storedMessage = getSessionMessage();

        if (storedMessage) {
          setCurrentMessage(storedMessage);
          setHasNewMessage(true);

          // Mostrar modal apenas se ainda não foi vista
          // if (!hasSeenMessage()) {
          //   setShowModal(true);
          // }
        } else {
          // Buscar nova mensagem
          await fetchAndSetMessage();
        }
      } catch (err) {
        console.error("Erro ao carregar mensagem do dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initDashboard();
  }, [router]);

  useEffect(() => {
    const prev = previousPscStatusRef.current;
    const curr = pscAuthStatus.status;

    if (prev !== curr) {
      if (curr === "EXPIRED") {
        expiryWarningShownRef.current = false;
        setShowReauthModal(true);
        addToast({
          title: "Sessão PSC expirada",
          description:
            "Sua autenticação de assinatura expirou. Reautentique-se para continuar assinando digitalmente.",
          severity: "warning",
          color: "foreground",
          variant: "flat",
        });
      }
      previousPscStatusRef.current = curr;
    }

    if (
      curr === "ACTIVE" &&
      pscAuthStatus.expiresAt &&
      !expiryWarningShownRef.current
    ) {
      const timeLeft = new Date(pscAuthStatus.expiresAt).getTime() - Date.now();
      if (timeLeft > 0 && timeLeft <= 300000) {
        expiryWarningShownRef.current = true;
        addToast({
          title: "Assinatura Digital",
          description:
            "Sua assinatura digital está próxima ao vencimento. Reautentique-se para evitar interrupções.",
          severity: "warning",
          color: "foreground",
          variant: "flat",
        });
      }
    }
  }, [pscAuthStatus]);

  const attemptPscReauth = useCallback(async () => {
    try {
      const payload = { provider: "" };
      const response = await fetch("/api/psc/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      if (data.url) {
        setPscAuthWindowUrl(data.url);
        setIsPscAuthenticating(true);
        setShowReauthModal(false);

        const width = 800;
        const height = 700;
        const left = window.screen.width
          ? (window.screen.width - width) / 2
          : 0;
        const top = window.screen.height
          ? (window.screen.height - height) / 2
          : 0;
        const newWindow = window.open(
          data.url,
          "psc_auth",
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`,
        );
        if (newWindow) {
          pscAuthWindowRef.current = newWindow;
          newWindow.focus();
        }
      }
    } catch (error: any) {
      addToast({
        title: "Erro de Autenticação",
        description: `Falha ao conectar com provedor: ${error.message || "Erro desconhecido"}`,
        severity: "danger",
        color: "foreground",
        variant: "flat",
      });
    }
  }, []);

  useEffect(() => {
    if (!isPscAuthenticating) return;
    const pollInterval = setInterval(async () => {
      if (pscAuthWindowRef.current && pscAuthWindowRef.current.closed) {
        clearInterval(pollInterval);
        setIsPscAuthenticating(false);
        addToast({
          title: "Autenticação Não Concluída",
          description:
            "A janela de autenticação foi fechada antes de concluir.",
          variant: "flat",
        });
        return;
      }
      await refetchPscStatus();
    }, 2000);
    return () => clearInterval(pollInterval);
  }, [isPscAuthenticating, refetchPscStatus]);

  useEffect(() => {
    if (isPscAuthenticating && pscAuthStatus.isActive) {
      setIsPscAuthenticating(false);
      if (pscAuthWindowRef.current && !pscAuthWindowRef.current.closed) {
        pscAuthWindowRef.current.close();
      }
      addToast({
        title: "Autenticação Realizada",
        description: "Assinatura digital habilitada com sucesso.",
        severity: "success",
        color: "foreground",
        variant: "flat",
      });
    }
  }, [isPscAuthenticating, pscAuthStatus.isActive]);

  useEffect(() => {
    const interval = setInterval(refetchPscStatus, 60000);
    return () => clearInterval(interval);
  }, [refetchPscStatus]);

  if (isLoading || !user) {
    return <EngemedicalLoading />;
  }

  if (showPostLoginTransition) {
    return (
      <PremiumCyberLoading
        duration={2600}
        onComplete={handlePostLoginComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <HeaderApp
        onLogout={() => {
          // Limpar mensagem ao fazer logout
          clearSessionMessage();
          logout();
          router.push("/");
        }}
      >
        <></>
      </HeaderApp>

      <div className="flex min-h-[calc(100vh-4rem)] items-start">
        <DashboardNavSidebar />
        <main
          aria-label="Dashboard principal"
          className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8"
        >
        <WelcomeSection name={user.nome} />

        <section aria-labelledby="stats-title" className="mt-8">
          <div>
            <StatisticsSection />
          </div>
        </section>

        <motion.footer
          animate={{ opacity: 1 }}
          className="mt-12 pt-8 border-t border-gray-200 text-center"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 1.5 }}
        >
          <p className="text-sm text-gray-600">
            Engemedical Brasil • {new Date().getFullYear()} •{" "}
            <a href="/privacidade" className="text-[#0698C2] hover:underline">
              Política de Privacidade
            </a>
          </p>
        </motion.footer>
        </main>
      </div>

      {/* Modal de consentimento LGPD */}
      <ConsentModal />

      {/* Modal de re-autenticação PSC */}
      <Modal
        isOpen={showReauthModal}
        onClose={() => setShowReauthModal(false)}
        placement="center"
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 text-[#005C7A]">
            Sessão de Assinatura Expirada
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600">
              Sua sessão de assinatura digital expirou. Para continuar
              assinando, clique no botão abaixo e realize a autenticação
              novamente.
            </p>
          </ModalBody>
          <ModalFooter className="flex gap-2">
            <Button
              variant="flat"
              color="default"
              onPress={() => setShowReauthModal(false)}
            >
              Agora não
            </Button>
            <Button
              className="bg-[#0698C2] text-white hover:bg-[#047A9E]"
              onPress={attemptPscReauth}
            >
              Autenticar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de Mensagem desabilitado temporariamente */}
      {/* 
      <MessageModal
        isOpen={showModal}
        message={currentMessage}
        onClose={() => {
          markMessageAsSeen();
          setShowModal(false);
        }}
      />
      */}

      {/* Botão flutuante para mensagens desabilitado temporariamente */}
      {/* 
      {currentMessage && (
        <MessageFloatingButton
          hasMessage={hasNewMessage}
          onClick={() => {
            setShowModal(true);
          }}
        />
      )}
      */}
    </div>
  );
}
