export const GED_START_DATE = "2025-06-01";

function toUtcDate(dateLike) {
  const value = typeof dateLike === "string" ? `${dateLike}T00:00:00.000Z` : dateLike;

  return new Date(value);
}

export function buildAvailableYears({
  startDate = GED_START_DATE,
  endDate = new Date().toISOString().slice(0, 10),
} = {}) {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  const years = [];

  for (let year = end.getUTCFullYear(); year >= start.getUTCFullYear(); year -= 1) {
    years.push(String(year));
  }

  return years;
}

export function buildAvailableMonths(
  year,
  {
    startDate = GED_START_DATE,
    endDate = new Date().toISOString().slice(0, 10),
  } = {},
) {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  const numericYear = Number(year);

  if (Number.isNaN(numericYear)) {
    return [];
  }

  let startMonth = 1;
  let endMonth = 12;

  if (numericYear === start.getUTCFullYear()) {
    startMonth = start.getUTCMonth() + 1;
  }

  if (numericYear === end.getUTCFullYear()) {
    endMonth = end.getUTCMonth() + 1;
  }

  if (numericYear < start.getUTCFullYear() || numericYear > end.getUTCFullYear()) {
    return [];
  }

  const months = [];

  for (let month = endMonth; month >= startMonth; month -= 1) {
    months.push(String(month).padStart(2, "0"));
  }

  return months;
}

export function buildBlobPeriodPrefix({ ano, mes, tipo = "aso" }) {
  return `${tipo}/${ano}/${mes}/`;
}
