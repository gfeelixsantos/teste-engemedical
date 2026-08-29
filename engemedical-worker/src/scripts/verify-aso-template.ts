import { gerarTemplateAsoWorker } from '../pdfmake/templates/asoWorker';
import { WorkerAsoInput } from '../pdfmake/aso-worker.types';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as fs from 'fs';
import * as path from 'path';

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
  // Dados extraídos do registro MongoDB fornecido
  const mongoDoc = {
    "_id": "6a34861e20cf8f1d0dc2eb79",
    "CODIGOEMPRESA": "950646",
    "NOMEEMPRESA": "SEGTEC TESTE - ENTERPRISE COMPANY LTDA",
    "CNPJEMPRESA": "09.348.221/0001-20",
    "SEQUENCIAFICHA": "359518005",
    "CPFFUNCIONARIO": "42889178838",
    "CODIGOUNIDADE": "1",
    "NOMEUNIDADE": "MATRIZ",
    "CODIGOSETOR": "33",
    "NOMESETOR": "TECNOLOGIA INFORMAÇÃO",
    "CODIGOCARGO": "83",
    "NOMECARGO": "ASSISTENTE DE INFORMÁTICA IC",
    "DATANASCIMENTO": "08/09/1994",
    "ASOINFO": {
      "status": "DIGITALIZADA",
      "observacoesParecer": [],
      "professional": {
        "codigo": "450",
        "nome": "Gabriel Felix"
      },
      "url": "..."
    },
    "CODIGO": "6",
    "UNIDADEATENDIMENTO": "CORDEIRÓPOLIS",
    "TIPOEXAMENOME": "PERIODICO",
    "EXAMES": [
      {
        "codigoExame": "clinico",
        "nomeExame": "Avaliação Clínica Ocupacional (Anamnese e Exame físico) (Cód. eSocial - 0295)",
        "dataExame": "2026-06-19T01:50:49.089Z"
      }
    ],
    "AUTENTICACAOATENDIMENTO": {
      "metodo": "BIOMETRIA",
      "status": "VALIDADO",
      "biometria": {
        "dedo": "INDICADOR_DIREITO"
      }
    },
    "NOME": "GABRIEL TESTE",
    "DATAAGENDAMENTO": "18/06/2026",
    "ANOTACOES": "\nFuncionário PCD: Tipo B - Auditiva - Perda acima de 91 dB - surdez profunda desde 30/01/2026",
    "PARECERMEDICO": "APTO"
  };

  const mockData: WorkerAsoInput = {
    origem: 'BIOMETRIA',
    requestId: mongoDoc._id,
    funcionario: {
      nome: mongoDoc.NOME,
      codigo: mongoDoc.CODIGO,
      cpfMascarado: mongoDoc.CPFFUNCIONARIO,
      dataNascimento: mongoDoc.DATANASCIMENTO,
      cargo: mongoDoc.NOMECARGO,
      setor: mongoDoc.NOMESETOR,
    },
    empresa: {
      codigo: mongoDoc.CODIGOEMPRESA,
      nome: mongoDoc.NOMEEMPRESA,
      cnpj: mongoDoc.CNPJEMPRESA,
    },
    unidade: {
      codigo: mongoDoc.CODIGOUNIDADE,
      nome: mongoDoc.NOMEUNIDADE,
      cidade: mongoDoc.UNIDADEATENDIMENTO,
      endereco: 'Rua de Teste da Unidade',
      numero: '123',
      bairro: 'Centro',
      cep: '12345-678',
      uf: 'SP',
    },
    atendimento: {
      schedulingId: mongoDoc._id,
      dataAgendamento: mongoDoc.DATAAGENDAMENTO,
      tipoExameNome: mongoDoc.TIPOEXAMENOME,
    },
    medicoCoordenador: {
      nome: 'Dr. Coordenador PCMSO',
      crm: extractCrm('CRM 99999') || '99999',
      uf: 'SP',
      endereco: 'Rua do PCMSO, 10',
      numero: '10',
      bairro: 'Centro',
      cidade: 'Cidade PCMSO',
    },
    medicoExaminador: {
      nome: mongoDoc.ASOINFO.professional.nome,
      codigo: mongoDoc.ASOINFO.professional.codigo,
      conselho: '85318',
      ufconselho: 'SP',
      cpf: '38958323833',
      signatureStatus: 'DIGITALIZADA',
    },
    parecer: {
      opinionType: mongoDoc.PARECERMEDICO,
      details: mongoDoc.ANOTACOES,
    },
    riscos: [],
    exames: mongoDoc.EXAMES.map(e => ({
      codigoExame: e.codigoExame,
      nomeExame: e.nomeExame,
      dataExame: e.dataExame
    })),
    autenticacaoAtendimento: {
      metodo: 'BIOMETRIA',
      status: 'VALIDADO',
      biometria: {
        dedo: mongoDoc.AUTENTICACAOATENDIMENTO.biometria.dedo
      }
    },
  };

  console.log('Gerando template ASO com dados do MongoDB...');
  const docDefinition = await gerarTemplateAsoWorker(mockData);
  
  const pdfDoc = pdfMake.createPdf(docDefinition);
  const filepath = path.join(OUTPUT_DIR, 'test-aso-mongodb-record.pdf');

  return new Promise<void>((resolve, reject) => {
    pdfDoc.getBuffer((buffer) => {
      fs.writeFileSync(filepath, buffer);
      console.log(`PDF gerado em: ${filepath}`);
      resolve();
    });
  });
}

runTest().catch(console.error);
