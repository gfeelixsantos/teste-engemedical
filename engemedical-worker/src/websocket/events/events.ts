import { SchedulingChange } from 'src/mongo/types/scheduling';

// Enum para padronizar os nomes dos eventos
enum EventType {
  CONNECTION_REQUEST = 'CONNECTION_REQUEST',
  // Schedule
  UPDATE_SCHEDULE = 'UPDATE_SCHEDULE',
  // Scraper
  SCRAPER_STATUS_UPDATE = 'SCRAPER_STATUS_UPDATE',
}

// Mapeamento de eventos para seus payloads
interface EventPayloadMap {
  [EventType.CONNECTION_REQUEST]: string;
  [EventType.UPDATE_SCHEDULE]: SchedulingChange;
}

// Estender os tipos do Socket.IO para eventos personalizados
interface CustomEventMap {
  [EventType.CONNECTION_REQUEST]: (payload: string) => void;
  [EventType.UPDATE_SCHEDULE]: (payload: SchedulingChange) => void;
}

export { EventType };
export type { EventPayloadMap, CustomEventMap };
