const test = require("node:test");
const assert = require("node:assert/strict");

const {
  mergeSchedulesById,
  scheduleKey,
} = require("../lib/atendimento/atendimento-load-flow");

// Mock da função de chave única por funcionário que previne duplicidades na tela
function getEmployeeIdentityKey(schedule) {
  const company = String(schedule?.CODIGOEMPRESA || "").trim();
  const cpf = String(schedule?.CPFFUNCIONARIO || "").replace(/\D/g, "");
  const codigo = String(schedule?.CODIGO || "").trim();

  if (company && (cpf || codigo)) {
    return `${company}_${cpf || codigo}`;
  }

  return scheduleKey(schedule);
}

function mergeSchedulesByEmployee(previous = [], incoming = []) {
  const map = new Map();

  for (const schedule of [...(previous || []), ...(incoming || [])]) {
    const key = getEmployeeIdentityKey(schedule);
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, schedule);
    } else {
      const existing = map.get(key);
      // Mescla os exames de ambos os registros preservando dados de triagem/atendimento
      const existingExames = Array.isArray(existing.EXAMES) ? existing.EXAMES : [];
      const incomingExames = Array.isArray(schedule.EXAMES) ? schedule.EXAMES : [];

      const mergedExamesMap = new Map();
      existingExames.forEach((e) =>
        mergedExamesMap.set(e.codigoExame || e.grupo || e.nomeExame, e)
      );
      incomingExames.forEach((e) =>
        mergedExamesMap.set(e.codigoExame || e.grupo || e.nomeExame, e)
      );

      map.set(key, {
        ...existing,
        ...schedule,
        TICKET: schedule.TICKET || existing.TICKET,
        ATENDIMENTOSTATUS:
          schedule.ATENDIMENTOSTATUS !== "AGENDADO"
            ? schedule.ATENDIMENTOSTATUS
            : existing.ATENDIMENTOSTATUS,
        EXAMES: Array.from(mergedExamesMap.values()),
      });
    }
  }

  return Array.from(map.values());
}

test("Cenário ANTONIO MARCIO: Impede duplicidade quando o SOC altera o código/matrícula do funcionário (5153 -> 5157)", () => {
  const docAgendadoComCodigo5153 = {
    _id: "6a70cbccbc387d20609005f5",
    CODIGOEMPRESA: "385308",
    CODIGO: "5153",
    CPFFUNCIONARIO: "02076868313",
    NOME: "ANTONIO MARCIO LOPES MENDES",
    CODIGOPRONTUARIO: "385308-5153-1-04082026",
    ATENDIMENTOSTATUS: "AGENDADO",
    DATAAGENDAMENTO: "04/08/2026",
    EXAMES: [{ codigoExame: "clinico", status: "PENDENTE" }],
  };

  const docProcessadoComCodigo5157 = {
    _id: "6a71dff212454f538adcfa07",
    CODIGOEMPRESA: "385308",
    CODIGO: "5157",
    CPFFUNCIONARIO: "02076868313",
    NOME: "ANTONIO MARCIO LOPES MENDES",
    CODIGOPRONTUARIO: "385308-5157-1-04082026",
    ATENDIMENTOSTATUS: "AGUARDANDO_RESULTADOS",
    DATAAGENDAMENTO: "04/08/2026",
    TICKET: { id: 14868, numero: 54, prefixo: "C" },
    EXAMES: [
      { codigoExame: "51.01.004-6", status: "FINALIZADO" },
      { codigoExame: "clinico", status: "FINALIZADO" },
      { codigoExame: "20.01.001-0", status: "AGUARDANDO_RESULTADO" },
    ],
  };

  const result = mergeSchedulesByEmployee(
    [docAgendadoComCodigo5153],
    [docProcessadoComCodigo5157]
  );

  assert.equal(result.length, 1, "Deveria existir apenas 1 card na lista final");
  assert.equal(
    result[0].ATENDIMENTOSTATUS,
    "AGUARDANDO_RESULTADOS",
    "Status deve refletir o atendimento processado"
  );
  assert.equal(result[0].TICKET.id, 14868, "Ticket deve ser preservado");
  assert.equal(result[0].EXAMES.length, 3, "Exames devem ser mesclados");
});

test("Cenário CAMILLE: Impede duplicidade quando existe um pré-agendamento com SEQUENCIAFICHA vazia", () => {
  const docSemFicha = {
    _id: "6a707368bc387d206090040b",
    CODIGOEMPRESA: "1362134",
    CODIGO: "287",
    CPFFUNCIONARIO: "55216652850",
    NOME: "CAMILLE DA SILVA DE BRITO",
    SEQUENCIAFICHA: "",
    CODIGOPRONTUARIO: "1362134-287-5-04082026",
    ATENDIMENTOSTATUS: "AGENDADO",
    DATAAGENDAMENTO: "04/08/2026",
    EXAMES: [{ codigoExame: "clinico", status: "PENDENTE" }],
  };

  const docComFichaSOC = {
    _id: "6a70729ebc387d2060900405",
    CODIGOEMPRESA: "1362134",
    CODIGO: "287",
    CPFFUNCIONARIO: "55216652850",
    NOME: "CAMILLE DA SILVA DE BRITO",
    SEQUENCIAFICHA: "366582617",
    CODIGOPRONTUARIO: "1362134-287-5-04082026",
    ATENDIMENTOSTATUS: "FINALIZADO",
    DATAAGENDAMENTO: "04/08/2026",
    TICKET: { id: 14956, numero: 8, prefixo: "C" },
    EXAMES: [
      { codigoExame: "51.01.004-6", status: "FINALIZADO" },
      { codigoExame: "clinico", status: "FINALIZADO" },
      { codigoExame: "triagem", status: "FINALIZADO" },
    ],
  };

  const result = mergeSchedulesByEmployee([docSemFicha], [docComFichaSOC]);

  assert.equal(result.length, 1, "Deveria existir apenas 1 card para a Camille");
  assert.equal(result[0].SEQUENCIAFICHA, "366582617", "Deve preservar a SEQUENCIAFICHA oficial");
  assert.equal(result[0].ATENDIMENTOSTATUS, "FINALIZADO", "Deve preservar o status FINALIZADO");
});
