"use client";

import { Badge, Button, Link, Tooltip } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCheck,
  CheckCircle,
  Command,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Inbox,
  LogOut,
  Search,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NotificationToggle } from "./NotificationToggle";
import { CommandPalette } from "./CommandPalette";

import { getCurrentUser } from "@/lib/utils";
import { getHomeRoute } from "@/lib/user/home-route.mjs";
import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { SIDEBAR_GROUPS } from "@/components/shared/SidebarMenu";
import {
  type AppNotification,
  addNotification,
  clearAllNotifications,
  clearReadNotifications,
  getNotifications,
  markAllAsRead,
  markAsRead,
  subscribe,
} from "@/lib/notification-store";

type MenuView = "menu" | "notifications";

const getSpecialtyColor = (especialidade: string) => {
  const colorMap: Record<string, string> = {
    MASTER: "bg-brand-100 text-brand-900 border-brand-200",
    MÉDICO: "bg-brand-100 text-brand-700 border-brand-200",
    ENFERMAGEM:
      "bg-brand-green-100 text-brand-green-700 border-brand-green-200",
    FONOAUDIOLOGA: "bg-brand-100 text-brand-800 border-brand-300",
    ADMINISTRATIVO: "bg-brand-50 text-brand-700 border-brand-200",
    COMERCIAL: "bg-brand-green-100 text-brand-green-700 border-brand-green-200",
    ATENDIMENTO: "bg-brand-100 text-brand-700 border-brand-200",
    LABORATORIO:
      "bg-brand-green-100 text-brand-green-700 border-brand-green-200",
    CONVIDADO: "bg-brand-50 text-brand-600 border-brand-200",
    ENGENHARIA: "bg-brand-100 text-brand-800 border-brand-300",
  };

  return (
    colorMap[especialidade] || "bg-brand-50 text-brand-700 border-brand-200"
  );
};

const getAvatarColor = (especialidade: string) => {
  const colorMap: Record<string, string> = {
    MASTER: "bg-brand-800",
    MÉDICO: "bg-brand-700",
    ENFERMAGEM: "bg-brand-green-500",
    FONOAUDIOLOGA: "bg-brand-600",
    ADMINISTRATIVO: "bg-brand-800",
    COMERCIAL: "bg-brand-green-600",
    ATENDIMENTO: "bg-brand-500",
    LABORATORIO: "bg-brand-green-700",
    CONVIDADO: "bg-brand-600",
    ENGENHARIA: "bg-brand-700",
  };

  return colorMap[especialidade] || "bg-brand-700";
};

const getHoverColor = (especialidade: string) => {
  const colorMap: Record<string, string> = {
    MASTER: "hover:bg-brand-50 hover:text-brand-900",
    MÉDICO: "hover:bg-brand-50 hover:text-brand-700",
    ENFERMAGEM: "hover:bg-brand-green-100 hover:text-brand-green-700",
    FONOAUDIOLOGA: "hover:bg-brand-50 hover:text-brand-800",
    ADMINISTRATIVO: "hover:bg-brand-50 hover:text-brand-700",
    COMERCIAL: "hover:bg-brand-green-100 hover:text-brand-green-700",
    ATENDIMENTO: "hover:bg-brand-50 hover:text-brand-700",
    LABORATORIO: "hover:bg-brand-green-100 hover:text-brand-green-700",
    CONVIDADO: "hover:bg-brand-50 hover:text-brand-600",
    ENGENHARIA: "hover:bg-brand-50 hover:text-brand-800",
  };

  return colorMap[especialidade] || "hover:bg-brand-50 hover:text-brand-800";
};

const getInitials = (nome: string): string => {
  if (!nome) return "?";

  const names = nome.trim().split(/\s+/);

  if (names.length === 1) return names[0].substring(0, 2).toUpperCase();

  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

function cleanTitle(title: string): string {
  return title
    .replace(
      /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]\s*/u,
      "",
    )
    .trim();
}

const getNotificationIconBadge = (type: AppNotification["type"]) => {
  switch (type) {
    case "warning":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
          <AlertCircle className="h-4 w-4" />
        </div>
      );
    case "success":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
          <CheckCircle className="h-4 w-4" />
        </div>
      );
    case "error":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs">
          <AlertCircle className="h-4 w-4" />
        </div>
      );
    default:
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 border border-brand-500/20 shadow-2xs">
          <Bell className="h-4 w-4" />
        </div>
      );
  }
};

const NotificationsList: React.FC<{
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onOpenAction: (notification: AppNotification) => void;
}> = ({ notifications, onMarkAsRead, onOpenAction }) => {
  const recentNotifications = notifications.slice(0, 8);

  return (
    <div className="flex flex-col w-full overflow-x-hidden">
      {/* Notifications List */}
      <div className="max-h-[26rem] overflow-y-auto divide-y divide-gray-100 overflow-x-hidden">
        {recentNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-gray-500">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Bell className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-gray-700">
              Nenhuma notificação
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              Seus avisos aparecerão aqui.
            </p>
          </div>
        ) : (
          recentNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50/80 ${
                notification.read ? "bg-white" : "bg-brand-100/30"
              }`}
            >
              {getNotificationIconBadge(notification.type)}

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-semibold text-gray-900 leading-tight truncate">
                    {cleanTitle(notification.title)}
                  </h4>
                  <span className="shrink-0 text-[11px] font-normal text-gray-400">
                    {notification.date.includes(",")
                      ? notification.date.split(",")[1]?.trim() ||
                        notification.date
                      : notification.date}
                  </span>
                </div>

                <p className="mt-1 text-xs leading-relaxed text-gray-600 break-words">
                  {notification.message}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  {notification.actionUrl ? (
                    <Button
                      color="primary"
                      size="sm"
                      variant="flat"
                      className="h-6 rounded-md px-2.5 text-[11px] font-medium"
                      startContent={<ExternalLink className="h-3 w-3" />}
                      onPress={() => onOpenAction(notification)}
                    >
                      {notification.actionLabel || "Abrir"}
                    </Button>
                  ) : (
                    <div />
                  )}

                  {!notification.read ? (
                    <button
                      className="text-[11px] font-medium text-brand-700 hover:text-brand-800 transition-colors"
                      onClick={() => onMarkAsRead(notification.id)}
                    >
                      Marcar como lida
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400">Lida</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

interface HeaderProps {
  onLogout: () => void;
  children?: React.ReactNode;
  showSearch?: boolean;
}

export const HeaderApp: React.FC<HeaderProps> = ({
  onLogout,
  children,
  showSearch = true,
}) => {
  const router = useRouter();
  const [user, setUser] = useState<IUserInfo | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState<MenuView>("menu");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [quickGroupIndex, setQuickGroupIndex] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getNotifications(),
  );

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.push("/");
    } else {
      setUser(currentUser);
    }
  }, [router]);

  useEffect(() => {
    const handleCommandShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleCommandShortcut);
    return () => window.removeEventListener("keydown", handleCommandShortcut);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe(setNotifications);

    return unsubscribe;
  }, []);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const closeMenu = () => {
    setIsMenuOpen(false);
    setView("menu");
    setQuickGroupIndex(0);
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const handleOpenAction = (notification: AppNotification) => {
    if (!notification.actionUrl) return;

    markAsRead(notification.id);
    closeMenu();

    if (/^https?:\/\//i.test(notification.actionUrl)) {
      window.open(notification.actionUrl, "_blank", "noopener,noreferrer");

      return;
    }

    router.push(notification.actionUrl);
  };

  const handleNavigate = (path: string) => {
    closeMenu();
    router.push(path);
  };

  const handleLogout = () => {
    closeMenu();
    onLogout();
  };

  const closeCommandPalette = () => setIsCommandPaletteOpen(false);

  return (
    <>
    <header
      className={`header-brand-shine z-40 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-md ${
        "sticky top-0"
      }`}
      role="banner"
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={{ y: 0, opacity: 1 }}
          className="flex h-16 items-center justify-between"
          initial={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Link
            aria-label="Ir para o dashboard"
            className="flex items-center gap-2 rounded-lg p-1 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-500"
            href={getHomeRoute(user)}
          >
            <Image
              priority
              alt="Engemedical Connect"
              className="h-12 w-auto"
              height={54}
              src="/images/logo.png"
              width={180}
            />
          </Link>

          {children}

          {showSearch && (
            <button
              aria-label="Buscar páginas e ações"
              aria-keyshortcuts="Control+K"
              className="group mx-4 hidden min-w-0 flex-1 max-w-md cursor-pointer items-center gap-3 rounded-xl border border-brand-line bg-brand-surface px-3 py-2 text-left transition-colors hover:border-brand-500/50 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 lg:flex"
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
            >
              <Search className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="min-w-0 flex-1 truncate text-sm text-gray-500">
                Buscar páginas e ações...
              </span>
              <kbd className="flex shrink-0 items-center gap-1 rounded-md border border-brand-line bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 shadow-sm">
                <Command className="h-3 w-3" /> K
              </kbd>
            </button>
          )}

          <div className="flex items-center gap-3">
            {showSearch && (
              <button
                aria-label="Buscar páginas e ações"
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-brand-line bg-brand-surface text-brand-700 transition-colors hover:border-brand-500/50 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 lg:hidden"
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
              >
                <Search className="h-4 w-4" />
              </button>
            )}
            <div ref={menuRef} className="relative">
              <button
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                aria-label="Abrir menu do usuário"
                className="flex cursor-pointer items-center gap-2 rounded-xl p-2 transition-colors hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                <Badge
                  color="danger"
                  content={unreadNotificationsCount}
                  isInvisible={unreadNotificationsCount === 0}
                  placement="bottom-left"
                  shape="circle"
                  size="sm"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${getAvatarColor(user?.perfil ?? "")} ring-2 ring-white shadow-md`}
                    title={user?.nome}
                  >
                    <span className="text-sm font-semibold text-white">
                      {getInitials(user?.nome ?? "")}
                    </span>
                  </div>
                </Badge>

                <div className="hidden text-left md:block">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.nome}
                  </p>
                  <p
                    className={`rounded-full border px-2 py-0.5 text-center text-xs font-medium shadow-sm ${getSpecialtyColor(
                      user?.perfil ?? "",
                    )}`}
                  >
                    {user?.perfil}
                  </p>
                </div>

                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 text-gray-500 transition-transform ${
                    isMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
                    exit={{ opacity: 0, y: -10 }}
                    initial={{ opacity: 0, y: -10 }}
                    role="menu"
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className={`px-4 py-3 ${getAvatarColor(user?.perfil ?? "")} rounded-t-xl`}
                    >
                      <p className="text-sm font-semibold text-white">
                        {user?.nome}
                      </p>
                      <p className="text-xs text-white/80">{user?.perfil}</p>
                    </div>

                    <div className="border-b border-gray-100 px-4 py-3">
                      {(() => {
                        const group = SIDEBAR_GROUPS[quickGroupIndex];
                        const GroupIcon = group.icon;

                        return (
                          <>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <button
                                aria-label="Grupo anterior"
                                className={`cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 ${quickGroupIndex === 0 ? "invisible" : ""}`}
                                disabled={quickGroupIndex === 0}
                                onClick={() =>
                                  setQuickGroupIndex((current) =>
                                    Math.max(0, current - 1),
                                  )
                                }
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <div className="flex min-w-0 items-center gap-2 text-center">
                                <GroupIcon className="h-4 w-4 shrink-0 text-brand-blue" />
                                <span className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
                                  {group.title}
                                </span>
                              </div>
                              <button
                                aria-label="Próximo grupo"
                                className={`cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 ${quickGroupIndex === SIDEBAR_GROUPS.length - 1 ? "invisible" : ""}`}
                                disabled={
                                  quickGroupIndex === SIDEBAR_GROUPS.length - 1
                                }
                                onClick={() =>
                                  setQuickGroupIndex((current) =>
                                    Math.min(
                                      SIDEBAR_GROUPS.length - 1,
                                      current + 1,
                                    ),
                                  )
                                }
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="space-y-0.5">
                              {group.items.map(
                                ({ title, icon: ItemIcon, path, color }) => (
                                  <button
                                    key={path}
                                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-gray-600 transition-colors ${getHoverColor(user?.perfil ?? "")}`}
                                    onClick={() => handleNavigate(path)}
                                  >
                                    <ItemIcon
                                      className={`h-4 w-4 shrink-0 ${color ?? "text-brand-blue"}`}
                                    />
                                    <span className="truncate">{title}</span>
                                  </button>
                                ),
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div
                      className={`flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 transition-colors ${getHoverColor(user?.perfil ?? "")}`}
                    >
                      <button
                        aria-expanded={view === "notifications"}
                        className="flex flex-1 items-center cursor-pointer py-0.5"
                        onClick={() =>
                          setView((current) =>
                            current === "notifications"
                              ? "menu"
                              : "notifications",
                          )
                        }
                      >
                        <Bell className="mr-3 h-4 w-4 text-gray-600" />
                        <span className="font-medium">Notificações</span>
                      </button>

                      <div className="flex items-center gap-0.5">
                        <NotificationToggle isIconOnly />

                        <Tooltip
                          content="Marcar todas como lidas"
                          placement="bottom"
                        >
                          <Button
                            isIconOnly
                            isDisabled={unreadNotificationsCount === 0}
                            size="sm"
                            variant="light"
                            className="h-7 w-7 min-w-7 text-gray-500 hover:text-gray-900"
                            onPress={markAllAsRead}
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        </Tooltip>

                        <Tooltip content="Limpar histórico" placement="bottom">
                          <Button
                            isIconOnly
                            isDisabled={notifications.length === 0}
                            size="sm"
                            variant="light"
                            className="h-7 w-7 min-w-7 text-gray-500 hover:text-rose-600"
                            onPress={clearAllNotifications}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Tooltip>

                        {unreadNotificationsCount > 0 && (
                          <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-2xs">
                            {unreadNotificationsCount}
                          </span>
                        )}

                        <button
                          className="ml-1 p-1 cursor-pointer"
                          onClick={() =>
                            setView((current) =>
                              current === "notifications"
                                ? "menu"
                                : "notifications",
                            )
                          }
                        >
                          <ChevronDown
                            aria-hidden="true"
                            className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                              view === "notifications" ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {view === "notifications" && (
                        <motion.div
                          animate={{ height: "auto", opacity: 1 }}
                          className="overflow-hidden border-t border-gray-100"
                          exit={{ height: 0, opacity: 0 }}
                          initial={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          <div className="max-h-[28rem] overflow-y-auto">
                            <NotificationsList
                              notifications={notifications}
                              onMarkAsRead={handleMarkAsRead}
                              onOpenAction={handleOpenAction}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="border-t border-gray-100" />

                    <button
                      className="flex w-full items-center px-4 py-2 text-sm text-red-600 cursor-pointer transition-colors hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sair
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
      <CommandPalette
        open={isCommandPaletteOpen}
        onClose={closeCommandPalette}
      />
    </header>
    </>
  );
};
