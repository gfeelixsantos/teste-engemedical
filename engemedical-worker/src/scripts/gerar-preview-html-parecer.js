/**
 * gerar-preview-html-parecer.js
 *
 * Gera um arquivo HTML local (preview-parecer.html) com o novo modelo proposto
 * para validação e visualização no seu navegador ANTES de enviar qualquer commit ou deploy.
 */

const path = require('path');
const fs = require('fs');
const { parecerMedicoHtml } = require('./dist/nodemailer/templates/html/parecerMedico');

const mockEmployee = {
  NOME: 'FLAVIO LUIZ HENRIQUE GRAMASCO FOSALUZA',
  CPFFUNCIONARIO: '31173793801',
  NOMEEMPRESA: 'RH BRASIL SERVICOS TEMPORARIOS LTDA',
  CNPJEMPRESA: '01395176000403',
  NOMEUNIDADE: 'UNIDADE RIO CLARO',
  NOMESETOR: 'M014718',
  NOMECARGO: 'OPERADOR DE PRODUÇÃO I',
  TIPOEXAMENOME: 'ADMISSIONAL',
  DATAAGENDAMENTO: '23/07/2026',
  UNIDADEATENDIMENTO: 'RIO CLARO',
  HORARIO: '08:43:07',
  MEDICO: 'MARIA JULIA TONELOTTO - CMSO',
  RISCOSASO: [
    { risco: 'Ruído Contínuo ou intermitente', codigo: '332' }
  ],
  EXAMES: [
    { nomeExame: 'Audiometria tonal ocupacional (Cód. eSocial - 0281)', profissional: 'MAYRA KLEINER', horario: '09:24:19', sala: 'SALA 8', status: 'FINALIZADO' },
    { nomeExame: 'Avaliação Clínica Ocupacional (Anamnese e Exame físico) (Cód. eSocial - 0295)', profissional: 'MARIA JULIA TONELOTTO - CMSO', horario: '09:14:53', sala: 'SALA 2', status: 'FINALIZADO' },
    { nomeExame: 'Avaliação da acuidade visual (Cód. eSocial - 0296)', profissional: 'Julia Antunes', horario: '08:54:13', sala: 'SALA 5-B', status: 'FINALIZADO' }
  ]
};

const mockOpinion = {
  opinionType: 'APTO_COM_ORIENTACAO',
  details: 'Orientar acompanhamento com cardiologista e manutenção de exames periódicos.'
};

const mockIssuer = {
  nome: 'MARIA JULIA TONELOTTO - CMSO'
};

const mockAsoUrl = 'https://cmsodocs.blob.core.windows.net/documents/exames/2026/07/230890/ASO_EXEMPLO.pdf';

const html = parecerMedicoHtml(
  mockEmployee,
  mockOpinion,
  mockIssuer,
  mockAsoUrl
);

const outputPath = path.join(__dirname, '..', '..', 'preview-parecer.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log(`✅ Arquivo de preview gerado com sucesso em:\n   ${outputPath}\n`);
