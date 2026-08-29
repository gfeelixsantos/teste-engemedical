const assert = require("node:assert/strict");
const { scoreAsoPrintCandidate } = require("./savePdf");
export {};

const item = {
  nomeFuncionario: "ISRAEL DO NASCIMENTO DE OLIVEIRA",
  nomeEmpresa: "DELTA INDUSTRIA CERAMICA LTDA",
  tipoExameNome: "RETORNO AO TRABALHO",
  sequencial: "352979732",
  codFuncionario: "5085",
};

function testScoresCorrectAsoPrintPage() {
  const result = scoreAsoPrintCandidate(
    {
      url: "https://sistema.soc.com.br/WebSoc/frame/print",
      title: "ASO 737045",
      html: `
        <input id="codigoSequencialFichaBiometria" value="352979732" />
        <input id="codigoFuncionarioBiometria" value="5085" />
        <div id="botaoGerarPdf"></div>
        <span>ASO - ATESTADO DE SAUDE OCUPACIONAL</span>
        <span>Avaliacao Clinica Ocupacional (Anamnese e Exame fisico)</span>
      `,
      text: `
        Ficha Clinica
        DELTA INDUSTRIA CERAMICA LTDA
        ISRAEL DO NASCIMENTO DE OLIVEIRA
        Retorno ao Trabalho
        352979732
        5085
      `,
    },
    item,
  );

  assert.equal(result.score >= 10, true);
  assert.equal(result.matchedMarkers.includes("text:funcionario"), true);
  assert.equal(result.matchedMarkers.includes("text:empresa"), true);
  assert.equal(result.matchedMarkers.includes("text:titulo-aso"), true);
}

function testPenalizesWrongSocShellPage() {
  const result = scoreAsoPrintCandidate(
    {
      url: "https://sistema.soc.com.br/WebSoc/frame/view",
      title: "SOCGED611",
      html: `
        <div>Testar versao Beta</div>
        <div>Incluido por Ana Clara - Engemedical</div>
        <div>Data Criacao 06/04/2026</div>
        <div>Alterado por Ana Clara - Engemedical</div>
      `,
      text: `
        Ficha Clinica
        Testar versao Beta
        Incluido por Ana Clara - Engemedical
        Data Criacao
      `,
    },
    item,
  );

  assert.equal(result.score < 10, true);
  assert.equal(result.rejectedMarkers.includes("text:beta-banner"), true);
  assert.equal(result.rejectedMarkers.includes("text:incluido-por"), true);
}

function testRejectsFichaClinicaEvenWhenEmployeeDataMatches() {
  const result = scoreAsoPrintCandidate(
    {
      url: "https://sistema.soc.com.br/WebSoc/relatorio/rel009br.jsp",
      title: "SOC - [rel009br.jsp] - [Ficha Clinica]",
      html: `
        <table>
          <tr><td>Ficha Clinica</td></tr>
          <tr><td>CERAMICA CARMELO FIOR LTDA - FILIAL</td></tr>
          <tr><td>LEANDRO MOREIRA DE OLIVEIRA</td></tr>
          <tr><td>Periodico</td></tr>
          <tr><td>343</td></tr>
          <tr><td>355487479</td></tr>
          <tr><td>ANAMNESE GERAL E EXAME CLINICO</td></tr>
        </table>
      `,
      text: `
        Ficha Clinica
        CERAMICA CARMELO FIOR LTDA - FILIAL
        LEANDRO MOREIRA DE OLIVEIRA
        Periodico
        343
        355487479
        ANAMNESE GERAL E EXAME CLINICO
      `,
    },
    {
      nomeFuncionario: "LEANDRO MOREIRA DE OLIVEIRA",
      nomeEmpresa: "CERAMICA CARMELO FIOR LTDA - FILIAL",
      tipoExameNome: "PERIODICO",
      sequencial: "355487479",
      codFuncionario: "343",
    },
  );

  assert.equal(
    result.score < 10,
    true,
    `Ficha Clinica nao deveria atingir score de aprovacao. Score atual: ${result.score}`,
  );
}

function main() {
  testScoresCorrectAsoPrintPage();
  testPenalizesWrongSocShellPage();
  testRejectsFichaClinicaEvenWhenEmployeeDataMatches();
  console.log("savePdf.spec.ts: ok");
}

main();
