export function isTabHidden(): boolean {
  if (typeof document === "undefined") return false;
  return document.visibilityState === "hidden";
}

export function hasNotificationPermission(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return Notification.permission === "granted";
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return Promise.resolve("denied" as NotificationPermission);
  }
  return Notification.requestPermission();
}

interface LocalNotificationOptions extends NotificationOptions {
  onClickUrl?: string;
}

export function sendLocalNotification(
  title: string,
  options?: LocalNotificationOptions
) {
  if (!hasNotificationPermission() || !isTabHidden()) {
    return;
  }

  try {
    const notification = new Notification(title, {
      icon: "/images/android-chrome-192x192.png",
      badge: "/images/android-chrome-192x192.png",
      ...options,
    });

    if (options?.onClickUrl) {
      notification.onclick = function () {
        window.focus();
        window.location.href = options.onClickUrl as string;
        notification.close();
      };
    } else {
      notification.onclick = function () {
        window.focus();
        notification.close();
      };
    }
  } catch (error) {
    console.error("Falha ao disparar notificação local:", error);
  }
}
