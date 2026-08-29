import { test } from 'node:test';
import * as assert from 'node:assert';

function buildSameDayEmployeeQuery(ficha: {
  CODIGOEMPRESA: string;
  DATAFICHA: string;
  CPFFUNCIONARIO?: string;
  CODIGOFUNCIONARIO?: string;
  codigoProntuario: string;
}) {
  const cpfCond = ficha.CPFFUNCIONARIO ? [{ CPFFUNCIONARIO: ficha.CPFFUNCIONARIO }] : [];
  const codigoCond = ficha.CODIGOFUNCIONARIO ? [{ CODIGO: ficha.CODIGOFUNCIONARIO }] : [];

  return {
    $or: [
      { CODIGOPRONTUARIO: ficha.codigoProntuario },
      {
        CODIGOEMPRESA: ficha.CODIGOEMPRESA,
        DATAAGENDAMENTO: ficha.DATAFICHA,
        $or: [...cpfCond, ...codigoCond],
      },
    ],
  };
}

function simulateDatabaseSearch(database: any[], query: any) {
  return database.find((doc) => {
    return query.$or.some((orClause: any) => {
      if (orClause.CODIGOPRONTUARIO) {
        return doc.CODIGOPRONTUARIO === orClause.CODIGOPRONTUARIO;
      }
      if (orClause.CODIGOEMPRESA) {
        const matchCompany = doc.CODIGOEMPRESA === orClause.CODIGOEMPRESA;
        const matchDate = doc.DATAAGENDAMENTO === orClause.DATAAGENDAMENTO;
        const matchEmployee = orClause.$or.some((empClause: any) => {
          if (empClause.CPFFUNCIONARIO) {
            return doc.CPFFUNCIONARIO === empClause.CPFFUNCIONARIO;
          }
          if (empClause.CODIGO) {
            return doc.CODIGO === empClause.CODIGO;
          }
          return false;
        });
        return matchCompany && matchDate && matchEmployee;
      }
      return false;
    });
  });
}

test('Cenário Claudemir: Ficha 38 assinada recebendo query da 41', () => {
  const database = [
    {
      "_id": "6a7226f4a507a031a1bb6149",
      "CODIGOEMPRESA": "1409893",
      "SEQUENCIAFICHA": "366655030",
      "CPFFUNCIONARIO": "17216175824",
      "CODIGO": "38",
      "DATAAGENDAMENTO": "04/08/2026"
    }
  ];

  // A ficha requisitada agora com código 41, que era um agendamento antigo
  const fichaNovaDoSOC = {
    CODIGOEMPRESA: "1409893",
    CODIGOFUNCIONARIO: "41", // CODIGO
    CPFFUNCIONARIO: "17216175824",
    DATAFICHA: "04/08/2026",
    codigoProntuario: "1409893-41-5-04082026"
  };

  const query = buildSameDayEmployeeQuery(fichaNovaDoSOC);
  const found = simulateDatabaseSearch(database, query);

  assert.ok(found, 'Deveria ter encontrado o documento existente do Claudemir pelo CPF!');
  assert.equal(found._id, "6a7226f4a507a031a1bb6149");
});
