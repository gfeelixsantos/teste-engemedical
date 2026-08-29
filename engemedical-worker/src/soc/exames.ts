import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ExamStatus } from 'src/mongo/enum/scheduling.enum';
import { gerarDocAcuidadeVisual } from 'src/pdfmake/templates/acuidade';
import { gerarDocAudiometria } from 'src/pdfmake/templates/audiometria';
import { gerarDocDinamometria } from 'src/pdfmake/templates/dinamometria';
import { gerarDocEspirometria } from 'src/pdfmake/templates/espirometria';
import { gerarDocExameClinico } from 'src/pdfmake/templates/exameClinico';
import { gerarDocPsicossocial } from 'src/pdfmake/templates/psicossocial';
import { gerarDocRestricaoTemporaria } from 'src/pdfmake/templates/restricao';
import { gerarDocTriagem } from 'src/pdfmake/templates/triagem';
import { gerarDocUltrassom } from 'src/pdfmake/templates/ultrassom';

export type ExamToogle = {
  codigos: string[];
  nome: string;
  statusFinalizacao: ExamStatus.FINALIZADO | ExamStatus.AGUARDANDO_RESULTADO;
  enviarParaAzure?: boolean; // opcional, pois nem todos precisam
  requerAssinaturaDigital: boolean; // indica se o documento requer assinatura PSC
  template?: (
    ...args: any[]
  ) => TDocumentDefinitions | Promise<TDocumentDefinitions>;
};

export const EXAMES_LIST: Record<string, ExamToogle[]> = {
  'Exame Clínico': [
    {
      codigos: ['clinico', '11'],
      nome: 'Exame Clínico',
      statusFinalizacao: ExamStatus.FINALIZADO,
      enviarParaAzure: true,
      requerAssinaturaDigital: true,
      template: gerarDocExameClinico,
    },
  ],
  restricao: [
    {
      codigos: ['restricao'],
      nome: 'Restrição Temporária',
      statusFinalizacao: ExamStatus.FINALIZADO,
      enviarParaAzure: true,
      requerAssinaturaDigital: false,
      template: gerarDocRestricaoTemporaria,
    },
  ],
  Audiometria: [
    {
      codigos: ['51.01.004-6', '50c', '10014'],
      nome: 'Audiometria',
      statusFinalizacao: ExamStatus.FINALIZADO,
      enviarParaAzure: true,
      requerAssinaturaDigital: true,
      template: gerarDocAudiometria,
    },
  ],
  'Acuidade Visual': [
    {
      codigos: ['50.01.001-8', '20221407', '4447', '02002', '4445'],
      nome: 'Acuidade Visual',
      statusFinalizacao: ExamStatus.FINALIZADO,
      enviarParaAzure: true,
      requerAssinaturaDigital: false,
      template: gerarDocAcuidadeVisual,
    },
  ],
  Laboratório: [
    {
      codigos: ['2'],
      nome: '2,5-hexanodiona urinária',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['XX'],
      nome: 'Acetona urinária',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.15.001-5'],
      nome: 'Ácido delta aminolevulínico - ALA-U',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.15.003-1'],
      nome: 'Ácido fenilglioxílico',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.15.004-0'],
      nome: 'Ácido hipúrico',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.15.005-8'],
      nome: 'Ácido mandélico',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.15.006-6'],
      nome: 'Ácido metilhipúrico',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['5555'],
      nome: 'Ácido trans, trans-mucônico',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28010175'],
      nome: 'Ácido úrico',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['1180'],
      nome: 'Antígeno específico prostático total (PSA)',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['CÁDMIO'],
      nome: 'Cádmio Sanguíneo',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['001234'],
      nome: 'Cádmio urinários',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.15.009-0'],
      nome: 'Carboxihemoglobina',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.15.012-0'],
      nome: 'Chumbo sanguíneo',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['0012345'],
      nome: 'Chumbo urinário',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['1332'],
      nome: 'Colesterol (HDL)',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['1222'],
      nome: 'Colesterol (LDL)',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['00000'],
      nome: 'Colesterol (VLDL)',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28010507'],
      nome: 'Colesterol total',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.01.054-0'],
      nome: 'Creatinina',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['02'],
      nome: 'Cromo sanguíneo',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28100239'],
      nome: 'Cultura nas fezes',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.15.030-9'],
      nome: 'Etanol',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.15.014-7'],
      nome: 'Fenol',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.15.015-5'],
      nome: 'Fluoreto urinário',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['002000'],
      nome: 'Fungos, pesquisa a fresco',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.01.095-7'],
      nome: 'Gama-glutamil transferase (Gama-GT)',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.01.097-3'],
      nome: 'Glicemia',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['2336', '28040350'],
      nome: 'Grupo sanguíneo ABO, e fator Rho (inclui Du)',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28011023'],
      nome: 'Hemoglobina glicada (A1 total)',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.04.048-1'],
      nome: 'Hemograma com contagem de plaquetas ou frações',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.04.048-1', '28040562'],
      nome: 'Hemograma com contagem de plaquetas ou frações',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28060105'],
      nome: 'Hepatite A - HAV - IgG',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28060113'],
      nome: 'Hepatite A - HAV - IgM',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28060067'],
      nome: 'Hepatite B - HBCAC - IgG',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['-'],
      nome: 'Hepatite B - HBeAC (anti HBE)',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['144'],
      nome: 'Hepatite B - HBsAG',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['1123'],
      nome: 'Hepatite B - HBsAC (anti-HBs)',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['00022'],
      nome: 'Hepatite C - anti-HCV - IgG',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['1125'],
      nome: 'Hepatite C - anti-HCV - IgM',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['200'],
      nome: 'Hormônio gonodotrofico corionico',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.15.018-0'],
      nome: 'Metanol',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['1', '54778844'],
      nome: 'Metil Etil Cetona',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28030141'],
      nome: 'Parasitológico de fezes',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['0101'],
      nome: 'Reticulócitos',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.13.036-7', '47788855'],
      nome: 'Rotina de urina',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28061004'],
      nome: 'Sífilis - VDRL',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['09022023'],
      nome: 'Tolueno urinário',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['02020'],
      nome: 'Exame Toxicológico',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.01.136-8'],
      nome: 'TGO',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.01.137-6'],
      nome: 'TGP',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['13012023'],
      nome: 'Tolueno sanguíneo',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['09022023'],
      nome: 'Tolueno urinário',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28011392'],
      nome: 'Triglicerídeos',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['28.01.141-4'],
      nome: 'Uréia',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
  ],
  ECG: [
    {
      codigos: ['20.01.001-0'],
      nome: 'ECG',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
  ],
  EEG: [
    {
      codigos: ['22010017'],
      nome: 'EEG',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
  ],
  Psicossocial: [
    {
      codigos: ['225588', '00123', '111114'],
      nome: 'Psicossocial',
      statusFinalizacao: ExamStatus.FINALIZADO,
      enviarParaAzure: true,
      requerAssinaturaDigital: false,
      template: gerarDocPsicossocial,
    },
  ],
  Espirometria: [
    {
      codigos: ['19.01.029-0'],
      nome: 'Espirometria',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: true,
      requerAssinaturaDigital: false,
      template: gerarDocEspirometria,
    },
  ],
  'Raio-X': [
    {
      codigos: ['32050070', '14111'],
      nome: 'Radiografia de tórax (PA) Padrão OIT',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['12200', '8998'],
      nome: 'Tomografia de tórax',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['ex imagem'],
      nome: 'Radiografia de coluna total',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['111', '1v1v', '254477'],
      nome: 'Radiografia de coluna lombo-sacra',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['-0-'],
      nome: 'Radiografia de coluna dorsal',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['0..'],
      nome: 'Radiografia de coluna cervical',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
    {
      codigos: ['2221111'],
      nome: 'Métodos Diagnósticos por Imagem Coluna',
      statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
      enviarParaAzure: false,
      requerAssinaturaDigital: false,
    },
  ],
  Dinamometria: [
    {
      codigos: ['20', '58877'],
      nome: 'Dinamometria',
      statusFinalizacao: ExamStatus.FINALIZADO,
      enviarParaAzure: true,
      requerAssinaturaDigital: false,
      template: gerarDocDinamometria,
    },
  ],
  Ultrassom: [
    {
      codigos: ['1444', '587744'],
      nome: 'Ultrassom',
      statusFinalizacao: ExamStatus.FINALIZADO,
      enviarParaAzure: true,
      requerAssinaturaDigital: false,
      template: gerarDocUltrassom,
    },
  ],
  Triagem: [
    {
      codigos: ['triagem'],
      nome: 'Triagem',
      statusFinalizacao: ExamStatus.FINALIZADO,
      enviarParaAzure: true,
      requerAssinaturaDigital: false,
      template: gerarDocTriagem,
    },
  ],
};

export const empresasComPsicologa = new Set([
  '263126', // RICLAN
  '690978', // AUTOPORT
  '310540', // OWENS 45
  '310539', // OWENS 83
  '310538', // OWENS 92
  '270281', // ALISUL
  '176792', // SEW
  '122878', // 3 FAZENDAS
  '821445', // EXPERT
  '950646', // SEGTEC TESTE
]);
