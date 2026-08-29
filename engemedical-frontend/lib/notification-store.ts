export type AppNotificationType =
  | "info"
  | "warning"
  | "success"
  | "error";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: AppNotificationType;
  dedupeKey?: string;
  source?: string;
  category?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  date: string;
  read: boolean;
  readAt?: string;
}

export type AppNotificationInput = Omit<
  AppNotification,
  "id" | "createdAt" | "date" | "read" | "readAt"
> & {
  createdAt?: string | Date;
  read?: boolean;
  dedupeKey?: string;
};

type Listener = (notifications: AppNotification[]) => void;

const STORAGE_KEY = "cmso360.notifications.v1";
const MAX_NOTIFICATIONS = 100;

let notifications: AppNotification[] = [];
const listeners = new Set<Listener>();
let hydrated = false;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("pt-BR");
}

function normalizeNotification(item: AppNotification): AppNotification {
  return {
    ...item,
    metadata:
      item.metadata && typeof item.metadata === "object"
        ? { ...item.metadata }
        : undefined,
  };
}

function loadNotifications(): AppNotification[] {
  if (!canUseStorage()) {
    return notifications;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return notifications;
    }

    const parsed = JSON.parse(raw) as AppNotification[];
    if (!Array.isArray(parsed)) {
      return notifications;
    }

    return parsed
      .filter(Boolean)
      .map((item) => normalizeNotification(item))
      .slice(0, MAX_NOTIFICATIONS);
  } catch {
    return notifications;
  }
}

function persistNotifications() {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)),
    );
  } catch {
    // Persistência é um extra; não bloqueia a experiência.
  }
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  notifications = loadNotifications();
}

function notify() {
  persistNotifications();
  listeners.forEach((fn) => fn([...notifications]));
}

export function addNotification(n: AppNotificationInput) {
  hydrate();

  if (n.dedupeKey) {
    const existing = notifications.find((item) => item.dedupeKey === n.dedupeKey);
    if (existing) {
      return existing.id;
    }
  }

  const createdAt =
    n.createdAt instanceof Date
      ? n.createdAt.toISOString()
      : n.createdAt || new Date().toISOString();

  const item: AppNotification = {
    ...n,
    id: crypto.randomUUID(),
    createdAt,
    date: formatDate(createdAt),
    read: n.read ?? false,
  };

  notifications = [item, ...notifications]
    .filter((notification, index, array) => {
      const firstIndex = array.findIndex((item) => item.id === notification.id);
      return firstIndex === index;
    })
    .slice(0, MAX_NOTIFICATIONS);

  notify();
  return item.id;
}

export function markAsRead(id: string) {
  hydrate();

  notifications = notifications.map((n) =>
    n.id === id
      ? {
          ...n,
          read: true,
          readAt: new Date().toISOString(),
        }
      : n,
  );
  notify();
}

export function markAllAsRead() {
  hydrate();

  notifications = notifications.map((n) =>
    n.read
      ? n
      : {
          ...n,
          read: true,
          readAt: new Date().toISOString(),
        },
  );
  notify();
}

export function clearReadNotifications() {
  hydrate();

  notifications = notifications.filter((n) => !n.read);
  notify();
}

export function clearAllNotifications() {
  hydrate();

  notifications = [];
  notify();
}

export function getUnreadCount(): number {
  hydrate();
  return notifications.filter((n) => !n.read).length;
}

export function getNotifications(): AppNotification[] {
  hydrate();
  return [...notifications];
}

export function subscribe(fn: Listener): () => void {
  hydrate();
  listeners.add(fn);
  fn([...notifications]);
  return () => listeners.delete(fn);
}

export function hydrateNotifications(): AppNotification[] {
  hydrate();
  return [...notifications];
}
