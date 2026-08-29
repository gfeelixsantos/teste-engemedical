import * as fs from 'fs';
import * as path from 'path';
import { examesNaoRealizadosHtml } from '../nodemailer/templates/html/examesNaoRealizados';

// Dados de exemplo para preview
const mockData = {
  reportDate: '23/08/2026',
  totalAttendances: 3,
  attendances: [
    {
      nomeFuncionario: 'JOÃO SILVA',
      nomeEmpresa: 'EMPRESA TESTE LTDA',
      tipoExame: 'PERIODICO',
      dataAgendamento: '22/08/2026',
      unfinishedExams: [
        { nomeExame: 'Audiometria', status: 'NAO_REALIZADO' },
        { nomeExame: 'Espirometria', status: 'NAO_REALIZADO' },
      ],
    },
    {
      nomeFuncionario: 'MARIA SOUZA',
      nomeEmpresa: 'TRANSPORTADORA LOGISTICA',
      tipoExame: 'ADMISSIONAL',
      dataAgendamento: '22/08/2026',
      unfinishedExams: [
        { nomeExame: 'Exame Clínico', status: 'NAO_REALIZADO' },
      ],
    },
    {
      nomeFuncionario: 'PEDRO SANTOS',
      nomeEmpresa: 'INDUSTRIA QUIMICA BRASIL',
      tipoExame: 'RETORNO TRABALHO',
      dataAgendamento: '22/08/2026',
      unfinishedExams: [
        { nomeExame: 'Hemograma', status: 'NAO_REALIZADO' },
        { nomeExame: 'Glicemia', status: 'NAO_REALIZADO' },
        { nomeExame: 'Colesterol Total', status: 'NAO_REALIZADO' },
      ],
    },
  ],
};

const html = examesNaoRealizadosHtml(mockData);

const outputPath = path.join(__dirname, 'test-unfinished-exams-email.html');
fs.writeFileSync(outputPath, html);
console.log('Template de e-mail de exames não realizados gerado em:', outputPath);
