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

test('Backend Query: Deve encontrar agendamento existente no mesmo dia mesmo se o SOC alterar o código de 5153 para 5157', () => {
  const database = [
    {
      _id: '6a70cbccbc387d20609005f5',
      CODIGOEMPRESA: '385308',
      CODIGO: '5153',
      CPFFUNCIONARIO: '02076868313',
      NOME: 'ANTONIO MARCIO LOPES MENDES',
      CODIGOPRONTUARIO: '385308-5153-1-04082026',
      DATAAGENDAMENTO: '04/08/2026',
    },
  ];

  const fichaNovaDoSOC = {
    CODIGOEMPRESA: '385308',
    CODIGOFUNCIONARIO: '5157',
    CPFFUNCIONARIO: '02076868313',
    DATAFICHA: '04/08/2026',
    codigoProntuario: '385308-5157-1-04082026',
  };

  const query = buildSameDayEmployeeQuery(fichaNovaDoSOC);
  const found = simulateDatabaseSearch(database, query);

  assert.ok(found, 'Deveria ter encontrado o documento existente de ANTONIO MARCIO');
  assert.equal(found._id, '6a70cbccbc387d20609005f5');
});

test('Backend Query: Deve encontrar pré-agendamento da CAMILLE no mesmo dia para fazer MERGE em vez de insertOne', () => {
  const database = [
    {
      _id: '6a707368bc387d206090040b',
      CODIGOEMPRESA: '1362134',
      CODIGO: '287',
      CPFFUNCIONARIO: '55216652850',
      NOME: 'CAMILLE DA SILVA DE BRITO',
      SEQUENCIAFICHA: '',
      CODIGOPRONTUARIO: '1362134-287-5-04082026',
      DATAAGENDAMENTO: '04/08/2026',
    },
  ];

  const fichaComSequenciaSOC = {
    CODIGOEMPRESA: '1362134',
    CODIGOFUNCIONARIO: '287',
    CPFFUNCIONARIO: '55216652850',
    DATAFICHA: '04/08/2026',
    codigoProntuario: '1362134-287-5-04082026',
  };

  const query = buildSameDayEmployeeQuery(fichaComSequenciaSOC);
  const found = simulateDatabaseSearch(database, query);

  assert.ok(found, 'Deveria ter encontrado o documento prévio de CAMILLE');
  assert.equal(found._id, '6a707368bc387d206090040b');
});

test('Backend Query: NÃO deve mesclar agendamentos do mesmo funcionário em DATAS DIFERENTES (Retorno)', () => {
  const database = [
    {
      _id: 'doc-mes-anterior',
      CODIGOEMPRESA: '1362134',
      CODIGO: '287',
      CPFFUNCIONARIO: '55216652850',
      NOME: 'CAMILLE DA SILVA DE BRITO',
      CODIGOPRONTUARIO: '1362134-287-5-04072026',
      DATAAGENDAMENTO: '04/07/2026', // Mês anterior
    },
  ];

  const fichaNovoMes = {
    CODIGOEMPRESA: '1362134',
    CODIGOFUNCIONARIO: '287',
    CPFFUNCIONARIO: '55216652850',
    DATAFICHA: '04/08/2026', // Hoje
    codigoProntuario: '1362134-287-5-04082026',
  };

  const query = buildSameDayEmployeeQuery(fichaNovoMes);
  const found = simulateDatabaseSearch(database, query);

  assert.equal(found, undefined, 'Não deve mesclar com a ficha de um mês atrás');
});
