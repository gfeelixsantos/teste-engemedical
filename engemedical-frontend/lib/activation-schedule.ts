const weekdayWindows: Record<number, readonly [number, number][]> = {
  1: [[9, 12], [13, 18]],
  2: [[9, 12], [13, 18]],
  3: [[9, 12], [13, 18]],
  4: [[9, 12], [13, 18]],
  5: [[9, 12], [13, 17]],
};

export function activationScheduleForDate(date: string): string[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return [];
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return [];
  const windows = weekdayWindows[parsed.getUTCDay()] ?? [];
  return windows.flatMap(([start, end]) => Array.from({ length: end - start }, (_, index) => `${String(start + index).padStart(2, '0')}:00`));
}

export function nextActivationDates(from = new Date(), days = 30): string[] {
  const dates: string[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = new Date(from);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (activationScheduleForDate(dateString).length > 0) dates.push(dateString);
  }
  return dates;
}
