import 'dotenv/config';
import { ExamMatcherService } from '../src/scrapers/exam-matcher.service';

async function main() {
  console.log('Iniciando simulação de Assertividade (Confidence) da IA...');
  const matcher = new ExamMatcherService();

  const patientInfo = {
    nome: 'VITOR EDUARDO GOMES MIRANDA',
    cpf: '12345678900',
    dataAgendamento: '15/05/2026',
    dataNascimento: '01/01/1990',
  };

  const pendingExams = [
    {
      codigoExame: 'EX01',
      nomeExame: 'Eletrocardiograma Repouso',
      grupo: 'ECG',
      status: 'AGUARDANDO_RESULTADO',
    },
    {
      codigoExame: 'EX02',
      nomeExame: 'Hemograma Completo',
      grupo: 'LABORATORIO',
      status: 'AGUARDANDO_RESULTADO',
    },
  ];

  const testCases = [
    {
      name: 'Match Perfeito (ECG Exato, Sem Ruído)',
      text: `CLINICA CMSO 360 - LAUDO MEDICO
Paciente: VITOR EDUARDO GOMES MIRANDA
Data do Exame: 15/05/2026
CPF: 123.456.789-00

Exame Realizado: Eletrocardiograma de Repouso (ECG)
Resultado: Ritmo sinusal normal. Sem anormalidades.
Conclusão: Normal.
`,
    },
    {
      name: 'Match Aceitável com Ruído (Hemograma com Nome Parcial)',
      text: `LABORATÓRIO WORKLAB
Paciente: VITOR EDUARDO GOMES MIRANDA
Data: 15/05/2026

Exames: Hemograma
Eritrocitos: 4.5
Leucocitos: 6000
Plaquetas: 250000
Assinatura: Dr. Teste
`,
    },
  ];

  for (const tc of testCases) {
    console.log(`\n-----------------------------------------`);
    console.log(`Testando Cenário: ${tc.name}`);
    
    // Hack: vamos mockar o logger para não poluir
    const origLog = console.log;
    
    // Capturar a resposta exata de confidence do Groq/OpenAI no log de debug
    const confidenceRegex = /confidence=([0-9.]+)/;
    let maxConfidence = 0;

    // Sobrescrever logger temporariamente para capturar
    (matcher as any).logger = {
      debug: (msg: string) => {
        const match = msg.match(confidenceRegex);
        if (match) {
           const conf = parseFloat(match[1]);
           if (conf > maxConfidence) maxConfidence = conf;
        }
      },
      warn: () => {},
      error: () => {},
      log: () => {},
    };

    const results = await matcher.matchExams(tc.text, pendingExams as any, patientInfo, 'Test');
    
    // Restaurar console
    console.log = origLog;

    console.log(`Resultado do Match: Encontrou ${results.length} exame(s)`);
    console.log(`Taxa de Assertividade devolvida pela IA (Confidence): ${(maxConfidence * 100).toFixed(1)}%`);
  }
}

main().catch(console.error);
