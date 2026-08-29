import 'dotenv/config';
import { MedicalScraper } from '../src/scrapers/providers/medical.scraper';
import { ExamMatcherService } from '../src/scrapers/exam-matcher.service';
import { SchedulingDocument } from '../src/mongo/types/scheduling';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const scraper = new MedicalScraper();
  const matcher = new ExamMatcherService();

  console.log('Efetuando login no Medical...');
  await scraper.login();

  // Dados do prontuário obtidos
  const elvisDoc: any = {
    _id: '698b2b4896190abd2a422814',
    NOME: 'ELVIS ERICK DOS SANTOS',
    CPFFUNCIONARIO: '',
    DATANASCIMENTO: '01/01/1990',
    DATAAGENDAMENTO: '10/02/2026',
    EXAMES: [
      {
        codigoExame: '20.01.001-0',
        nomeExame: 'ECG convencional de até 12 derivações (Cód. eSocial - 0530)',
        status: 'AGUARDANDO_RESULTADO',
        grupo: 'ECG'
      }
    ]
  };

  const patientName = elvisDoc.NOME;

  console.log('\n=== Buscando laudo do Elvis no portal ===');
  const results = await scraper.searchPatient(patientName, {
    appointmentDate: elvisDoc.DATAAGENDAMENTO,
    schedulingId: elvisDoc._id,
    pendingGroups: ['ECG']
  });

  console.log('Candidatos de ECG retornados pela busca:', JSON.stringify(results, null, 2));

  if (results && results.length > 0) {
    const ecgCandidate = results[0];
    console.log(`\nBaixando PDF para o candidato ID: ${ecgCandidate.id}`);
    const pdfBuffer = await scraper.downloadReport(ecgCandidate);

    if (pdfBuffer) {
      console.log(`Laudo baixado com sucesso! Tamanho: ${pdfBuffer.length} bytes`);
      
      const extractedText = await matcher.extractText(pdfBuffer);
      console.log('\n=== Texto extraído do laudo ===');
      console.log(extractedText);

      console.log('\n=== Rodando matchExams ===');
      const matchedCodes = await matcher.matchExams(
        extractedText,
        elvisDoc.EXAMES,
        {
          nome: elvisDoc.NOME,
          cpf: elvisDoc.CPFFUNCIONARIO,
          dataAgendamento: elvisDoc.DATAAGENDAMENTO,
          dataNascimento: elvisDoc.DATANASCIMENTO
        },
        'Medical'
      );

      console.log('Códigos que deram Match Aceito:', matchedCodes);
    } else {
      console.log('Falha ao baixar o PDF.');
    }
  } else {
    console.log('Nenhum candidato encontrado.');
  }
}

main().catch(err => {
  console.error(err);
});
