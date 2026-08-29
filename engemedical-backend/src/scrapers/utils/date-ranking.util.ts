export function parseDateParts(
  value?: string,
): { day: number; month: number; year: number } | null {
  if (!value) return null;
  // Match DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD
  let match = value.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (match) {
    return {
      day: Number(match[1]),
      month: Number(match[2]),
      year: Number(match[3]),
    };
  }
  match = value.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }
  return null;
}

export function rankCandidatesByClosestDate<T>(
  candidates: T[],
  appointmentDateStr: string,
  getDateString: (item: T) => string | undefined,
): T[] {
  if (!appointmentDateStr || candidates.length <= 1) {
    return candidates;
  }

  const apptParts = parseDateParts(appointmentDateStr);
  if (!apptParts) return candidates;

  const apptTime = Date.UTC(apptParts.year, apptParts.month - 1, apptParts.day);

  return [...candidates].sort((a, b) => {
    const dateA = parseDateParts(getDateString(a));
    const dateB = parseDateParts(getDateString(b));

    const distA = dateA
      ? Math.abs(apptTime - Date.UTC(dateA.year, dateA.month - 1, dateA.day))
      : Infinity;
    const distB = dateB
      ? Math.abs(apptTime - Date.UTC(dateB.year, dateB.month - 1, dateB.day))
      : Infinity;

    return distA - distB;
  });
}
