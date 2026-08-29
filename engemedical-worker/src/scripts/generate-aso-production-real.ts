import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega as variáveis do .env manualmente para o script
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

import { gerarTemplateAsoWorker } from '../pdfmake/templates/asoWorker';
import { WorkerAsoInput } from '../pdfmake/aso-worker.types';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as fs from 'fs';

(pdfMake as any).vfs = pdfFonts.vfs;

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'temp_pdfs');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function extractCrm(registro?: string): string {
  return String(registro || '')
    .replace(/\bCRM\b/gi, '')
    .replace(/[^\d]/g, '')
    .trim();
}

async function runTest() {
  // Dados do agendamento (SchedulingDocument)
  const schedulingDoc = {
    "CODIGOEMPRESA": "950646",
    "NOMEEMPRESA": "SEGTEC SAUDE OCUPACIONAL LTDA.",
    "NOME": "GABRIEL TESTE",
    "CODIGO": "6",
    "CPFFUNCIONARIO": "42889178838",
    "NOMECARGO": "ASSISTENTE DE INFORMÁTICA IC",
    "NOMESETOR": "TECNOLOGIA INFORMAÇÃO",
    "DATANASCIMENTO": "08/09/1994",
    "UNIDADEATENDIMENTO": "CORDEIRÓPOLIS",
    "TIPOEXAMENOME": "PERIODICO",
    "PARECERMEDICO": "APTO",
    "DATAAGENDAMENTO": "18/06/2026",
    "EXAMES": [
        { "codigoExame": "clinico", "nomeExame": "Avaliação Clínica Ocupacional", "dataExame": "2026-06-19T01:50:49.089Z" }
    ],
    "ASOINFO": {
        "status": "DIGITALIZADA",
        "professional": { "codigo": "450", "nome": "Gabriel Felix" },
        "signature": { "status": "PENDENTE" }
    },
    "AUTENTICACAOATENDIMENTO": {
        "metodo": "BIOMETRIA",
        "status": "VALIDADO",
        "biometria": { "dedo": "INDICADOR_DIREITO" }
    }
  };

  // Dados da Empresa (Cadastrados no Mongo)
  const companyDoc = {
    "RAZAOSOCIAL": "SEGTEC SAUDE OCUPACIONAL LTDA.",
    "CNPJ": "09348221000120",
    "endereco": {
        "logradouro": "2",
        "numero": "635",
        "bairro": "SAUDE",
        "cidade": "RIO CLARO",
        "uf": "SP",
        "cep": "13500312"
    },
    "RESPONSAVEISTECNICOS": [
        {
            "nome": "DRA ANDREA CRISTINA",
            "registro": "CRM 85318",
            "uf": "SP",
            "cpf": "38958323833",
            "dataInicio": "2026-03-01",
            "dataFim": "2027-03-01"
        }
    ]
  };

  // 1. Identifica o responsável técnico vigente (lógica real do backend)
  const pcmso = companyDoc.RESPONSAVEISTECNICOS.find(r => {
      const start = new Date(r.dataInicio);
      const end = new Date(r.dataFim);
      const now = new Date();
      return start <= now && end >= now;
  });

  // 2. Constrói o payload enriquecido (como o worker recebe do backend)
  const workerInput: WorkerAsoInput = {
    origem: schedulingDoc.AUTENTICACAOATENDIMENTO.metodo as any,
    requestId: 'mock-request-id',
    funcionario: {
      nome: schedulingDoc.NOME,
      codigo: schedulingDoc.CODIGO,
      cpfMascarado: schedulingDoc.CPFFUNCIONARIO,
      dataNascimento: schedulingDoc.DATANASCIMENTO,
      cargo: schedulingDoc.NOMECARGO,
      setor: schedulingDoc.NOMESETOR,
    },
    empresa: {
      codigo: schedulingDoc.CODIGOEMPRESA,
      nome: companyDoc.RAZAOSOCIAL,
      cnpj: companyDoc.CNPJ,
      endereco: `${companyDoc.endereco.logradouro}, ${companyDoc.endereco.numero} - ${companyDoc.endereco.bairro}, ${companyDoc.endereco.cidade}/${companyDoc.endereco.uf} - CEP: ${companyDoc.endereco.cep}`
    },
    unidade: {
      nome: schedulingDoc.UNIDADEATENDIMENTO,
      cidade: schedulingDoc.UNIDADEATENDIMENTO,
      // Em produção, isso vem do Supabase (unidade)
      endereco: 'Endereço da Unidade Mockado',
      uf: 'SP'
    },
    atendimento: {
      schedulingId: 'mock-scheduling-id',
      dataAgendamento: schedulingDoc.DATAAGENDAMENTO,
      tipoExameNome: schedulingDoc.TIPOEXAMENOME,
    },
    medicoCoordenador: {
      nome: pcmso?.nome || 'Não informado',
      crm: extractCrm(pcmso?.registro) || 'N/D',
      uf: pcmso?.uf || 'N/D',
    },
    // Simula o profissional que efetivamente libera o ASO no fluxo real.
    // No worker real, estes campos vêm do issuer/enrichment e precisam estar completos.
    medicoExaminador: {
      nome: schedulingDoc.ASOINFO.professional.nome,
      codigo: schedulingDoc.ASOINFO.professional.codigo,
      conselho: extractCrm(pcmso?.registro) || 'N/D',
      ufconselho: pcmso?.uf || 'N/D',
      cpf: pcmso?.cpf || 'N/D',
      signatureStatus: schedulingDoc.ASOINFO.signature?.status,
    },
    parecer: {
      opinionType: schedulingDoc.PARECERMEDICO,
      details: ' ', // Limpo conforme solicitado
    },
    riscos: [],
    exames: schedulingDoc.EXAMES.map((e: any) => ({
      codigoExame: e.codigoExame,
      nomeExame: e.nomeExame,
      dataExame: e.dataExame
    })),
    autenticacaoAtendimento: {
      metodo: schedulingDoc.AUTENTICACAOATENDIMENTO.metodo as any,
      status: schedulingDoc.AUTENTICACAOATENDIMENTO.status as any,
      biometria: schedulingDoc.AUTENTICACAOATENDIMENTO.biometria
    },
  };

  console.log('Gerando PDF com mock de payload enriquecido (produção)...');
  const docDefinition = await gerarTemplateAsoWorker(workerInput);
  
  const pdfDoc = pdfMake.createPdf(docDefinition);
  const filepath = path.join(OUTPUT_DIR, 'aso-final-production-like.pdf');

  return new Promise<void>((resolve, reject) => {
    pdfDoc.getBuffer((buffer) => {
      fs.writeFileSync(filepath, buffer);
      console.log(`PDF gerado em: ${filepath}`);
      resolve();
    });
  });
}

runTest().catch(console.error);
