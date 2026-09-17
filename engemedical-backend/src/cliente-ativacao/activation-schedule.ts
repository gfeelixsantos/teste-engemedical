const ACTIVATION_TIME_ZONE = 'America/Sao_Paulo';

const weekdayWindows: Record<number, readonly [number, number][]> = {
  1: [[9, 12], [13, 18]],
  2: [[9, 12], [13, 18]],
  3: [[9, 12], [13, 18]],
  4: [[9, 12], [13, 18]],
  5: [[9, 12], [13, 17]],
};

const localDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ACTIVATION_TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
});

const localTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ACTIVATION_TIME_ZONE,
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function parseDateParts(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day, 12));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function activationScheduleForDate(date: string): string[] {
  const parts = parseDateParts(date);
  if (!parts) return [];
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12)).getUTCDay();
  const windows = weekdayWindows[weekday] ?? [];
  return windows.flatMap(([start, end]) => Array.from({ length: end - start }, (_, index) => `${String(start + index).padStart(2, '0')}:00`));
}

export function isActivationMeetingSlot(startTime: string, endTime: string): boolean {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  if (end.getTime() - start.getTime() !== 60 * 60 * 1000) return false;
  if (localDateFormatter.format(start) !== localDateFormatter.format(end)) return false;
  return activationScheduleForDate(localDateFormatter.format(start)).includes(localTimeFormatter.format(start));
}

export const ACTIVATION_TIME_ZONE_NAME = ACTIVATION_TIME_ZONE;
