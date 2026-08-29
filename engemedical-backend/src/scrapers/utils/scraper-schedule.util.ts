import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const SCRAPER_TIME_ZONE = 'America/Sao_Paulo';
export const SCRAPER_SCHEDULE_TIMES = [
  '06:00',
  '09:00',
  '11:30',
  '14:00',
  '18:00',
] as const;
export const SCRAPER_INTERVAL_MINUTES = 120;
export const SCRAPER_ALLOWED_TIMES_LABEL = SCRAPER_SCHEDULE_TIMES.join(', ');
export const SCRAPER_WINDOW_START_MINUTES = 6 * 60;
export const SCRAPER_WINDOW_END_MINUTES = 18 * 60;

function buildScheduledRun(dateAtBusinessTz: string, time: string): Date {
  return fromZonedTime(`${dateAtBusinessTz} ${time}:00`, SCRAPER_TIME_ZONE);
}

export function getNextScraperRunAt(now: Date = new Date()): Date {
  const todayAtBusinessTz = formatInTimeZone(
    now,
    SCRAPER_TIME_ZONE,
    'yyyy-MM-dd',
  );
  const tomorrowAtBusinessTz = formatInTimeZone(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
    SCRAPER_TIME_ZONE,
    'yyyy-MM-dd',
  );

  const candidates = [todayAtBusinessTz, tomorrowAtBusinessTz]
    .flatMap((dateAtBusinessTz) =>
      SCRAPER_SCHEDULE_TIMES.map((time) =>
        buildScheduledRun(dateAtBusinessTz, time),
      ),
    )
    .filter((candidate) => candidate.getTime() > now.getTime())
    .sort((left, right) => left.getTime() - right.getTime());

  return candidates[0];
}
