function normalizeUnit(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function normalizeDate(value) {
  return String(value || "").trim();
}

function scheduleKey(schedule) {
  return String(schedule?._id || schedule?.CODIGOPRONTUARIO || "").trim();
}

function mergeSchedulesById(previous = [], incoming = []) {
  const map = new Map();

  for (const schedule of Array.isArray(previous) ? previous : []) {
    const key = scheduleKey(schedule);
    if (!key) continue;
    map.set(key, schedule);
  }

  for (const schedule of Array.isArray(incoming) ? incoming : []) {
    const key = scheduleKey(schedule);
    if (!key) continue;
    map.set(key, schedule);
  }

  return Array.from(map.values());
}

function filterSchedulesByUnit(schedules = [], unit) {
  const normalizedUnit = normalizeUnit(unit);

  if (!normalizedUnit) {
    return Array.isArray(schedules) ? schedules.slice() : [];
  }

  return (Array.isArray(schedules) ? schedules : []).filter((schedule) => {
    const scheduleUnit = normalizeUnit(schedule?.UNIDADEATENDIMENTO);
    return (
      scheduleUnit === normalizedUnit ||
      scheduleUnit === "" ||
      schedule?.UNIDADEATENDIMENTO == null
    );
  });
}

function filterSchedulesByLoadWindow(schedules = [], unit, dataAgendamento) {
  const normalizedDate = normalizeDate(dataAgendamento);

  return filterSchedulesByUnit(schedules, unit).filter((schedule) => {
    if (!normalizedDate) {
      return true;
    }

    return normalizeDate(schedule?.DATAAGENDAMENTO) === normalizedDate;
  });
}

function createAtendimentoLoadFlow() {
  const state = {
    connected: false,
    initialTicketsLoaded: false,
    connectionRequestReceived: false,
    isLoading: false,
    aguardandoPrimeirosAtendimentos: false,
  };

  const sync = () => {
    const shouldKeepLoading =
      state.connected &&
      (!state.initialTicketsLoaded || !state.connectionRequestReceived);

    state.isLoading = shouldKeepLoading;
    state.aguardandoPrimeirosAtendimentos = shouldKeepLoading;

    return { ...state };
  };

  return {
    startConnection() {
      state.connected = true;
      state.initialTicketsLoaded = false;
      state.connectionRequestReceived = false;
      state.isLoading = true;
      state.aguardandoPrimeirosAtendimentos = true;
      return { ...state };
    },

    markInitialTicketsLoaded() {
      state.initialTicketsLoaded = true;
      return sync();
    },

    markConnectionRequestReceived() {
      state.connectionRequestReceived = true;
      return sync();
    },

    reset() {
      state.connected = false;
      state.initialTicketsLoaded = false;
      state.connectionRequestReceived = false;
      state.isLoading = false;
      state.aguardandoPrimeirosAtendimentos = false;
      return { ...state };
    },

    snapshot() {
      return { ...state };
    },
  };
}

function runAtendimentoLoadScenario({
  unit,
  dataAgendamento,
  initialSchedules = [],
  connectionRequestSchedules = [],
}) {
  const flow = createAtendimentoLoadFlow();
  const initialFiltered = filterSchedulesByLoadWindow(
    initialSchedules,
    unit,
    dataAgendamento,
  );
  const connectionFiltered = filterSchedulesByLoadWindow(
    connectionRequestSchedules,
    unit,
    dataAgendamento,
  );

  flow.startConnection();
  const afterSocket = flow.markConnectionRequestReceived();
  const afterInitial = flow.markInitialTicketsLoaded();

  return {
    loadingAfterSocket: afterSocket.isLoading,
    loadingAfterInitial: afterInitial.isLoading,
    schedules: mergeSchedulesById(initialFiltered, connectionFiltered),
    initialFiltered,
    connectionFiltered,
    state: flow.snapshot(),
  };
}

module.exports = {
  createAtendimentoLoadFlow,
  filterSchedulesByUnit,
  filterSchedulesByLoadWindow,
  mergeSchedulesById,
  runAtendimentoLoadScenario,
  normalizeUnit,
  normalizeDate,
};
