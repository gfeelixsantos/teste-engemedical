const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createAtendimentoLoadFlow,
  mergeSchedulesById,
  filterSchedulesByLoadWindow,
  normalizeDate,
} = require("../lib/atendimento/atendimento-load-flow");

const loadFixture = require("./fixtures/atendimento-load-2026-06-08.json");

const { dataAgendamento: loadDate, initialSchedules, connectionRequestSchedules } =
  loadFixture;

test("mantem o loading ativo ate receber CONNECTION_REQUEST e tickets iniciais", () => {
  const flow = createAtendimentoLoadFlow();

  flow.startConnection();
  assert.equal(flow.snapshot().isLoading, true);

  let snapshot = flow.markConnectionRequestReceived();
  assert.equal(snapshot.isLoading, true);
  assert.equal(snapshot.aguardandoPrimeirosAtendimentos, true);

  snapshot = flow.markInitialTicketsLoaded();
  assert.equal(snapshot.isLoading, false);
  assert.equal(snapshot.aguardandoPrimeirosAtendimentos, false);
});

test("tambem mantem o loading ativo quando os tickets iniciais chegam antes do socket", () => {
  const flow = createAtendimentoLoadFlow();

  flow.startConnection();
  let snapshot = flow.markInitialTicketsLoaded();
  assert.equal(snapshot.isLoading, true);

  snapshot = flow.markConnectionRequestReceived();
  assert.equal(snapshot.isLoading, false);
  assert.equal(snapshot.aguardandoPrimeirosAtendimentos, false);
});

test("mescla schedules sem duplicar quando o CONNECTION_REQUEST traz registros ja vistos", () => {
  const existing = [
    initialSchedules[0],
    {
      ...initialSchedules[0],
      _id: "dup-1",
      CODIGOPRONTUARIO: "duplicado",
      TICKET: { ...initialSchedules[0].TICKET, id: 9001 },
    },
  ];

  const incoming = [
    {
      ...initialSchedules[0],
      _id: "dup-1",
      CODIGOPRONTUARIO: "duplicado",
      NOME: "MARCELO FREITAS RODRIGUES ATUALIZADO",
      TICKET: { ...initialSchedules[0].TICKET, id: 9001, sala: "SALA 2" },
    },
    {
      ...initialSchedules[0],
      _id: "novo-2",
      CODIGOPRONTUARIO: "novo-2",
      NOME: "NOVO ATENDIMENTO",
      TICKET: { ...initialSchedules[0].TICKET, id: 9002 },
    },
  ];

  const merged = mergeSchedulesById(existing, incoming);

  assert.equal(merged.length, 3);
  assert.equal(
    merged.find((item) => item._id === "dup-1").NOME,
    "MARCELO FREITAS RODRIGUES ATUALIZADO",
  );
  assert.equal(
    merged.find((item) => item._id === "dup-1").TICKET.sala,
    "SALA 2",
  );
});

test("filtra os atendimentos da unidade e preserva registros sem unidade definida", () => {
  const schedules = connectionRequestSchedules.concat([
    {
      ...connectionRequestSchedules[0],
      _id: "null-unidade",
      UNIDADEATENDIMENTO: null,
      TICKET: { ...connectionRequestSchedules[0].TICKET, id: 5523, unidade: null },
    },
    {
      ...connectionRequestSchedules[0],
      _id: "outra-data",
      DATAAGENDAMENTO: "09/06/2026",
      TICKET: { ...connectionRequestSchedules[0].TICKET, id: 5524 },
    },
  ]);

  const filtered = filterSchedulesByLoadWindow(schedules, "rio claro", loadDate);

  assert.equal(filtered.length, 3);
  assert.deepEqual(
    filtered.map((item) => item._id),
    ["6a208219a83c33409dac8892", "sem-unidade", "null-unidade"],
  );
});

test("usa o fixture realista de 08/06/2026 como cenário funcional da aplicação", () => {
  const scenario = require("./fixtures/atendimento-load-2026-06-08.json");

  const result = require("../lib/atendimento/atendimento-load-flow").runAtendimentoLoadScenario(
    {
      unit: scenario.unit,
      dataAgendamento: scenario.dataAgendamento,
      initialSchedules: scenario.initialSchedules,
      connectionRequestSchedules: scenario.connectionRequestSchedules,
    },
  );

  assert.equal(normalizeDate(result.schedules[0].DATAAGENDAMENTO), "08/06/2026");
  assert.equal(result.loadingAfterSocket, true);
  assert.equal(result.loadingAfterInitial, false);
  assert.equal(result.schedules.length, 2);
  assert.deepEqual(
    result.schedules.map((item) => item._id).sort(),
    ["6a208219a83c33409dac8892", "sem-unidade"],
  );
  assert.equal(
    result.schedules.find((item) => item._id === "6a208219a83c33409dac8892").TICKET.sala,
    "SALA 1",
  );
});
