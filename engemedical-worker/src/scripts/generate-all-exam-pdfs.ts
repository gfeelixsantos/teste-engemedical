import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as fs from 'fs';
import * as path from 'path';

(pdfMake as any).vfs = pdfFonts.vfs;

import { gerarDocExameClinico } from '../pdfmake/templates/exameClinico';
import { gerarDocAudiometria } from '../pdfmake/templates/audiometria';
import { gerarDocAcuidadeVisual } from '../pdfmake/templates/acuidade';
import { gerarDocPsicossocial } from '../pdfmake/templates/psicossocial';
import { gerarDocEspirometria } from '../pdfmake/templates/espirometria';

const asoData = {
  NOMEEMPRESA: 'TRANENGE CONSTRUÇÕES LTDA',
  CNPJEMPRESA: '00.437.082/0001-36',
  CODIGO: '5153',
  NOME: 'ALDO ANDRADE GOMES DE ARAUJO',
  CPFFUNCIONARIO: '02466339480',
  DATANASCIMENTO: '14/02/1977',
  NOMESETOR: 'FÁBRICA PRODUÇÃO',
  NOMECARGO: 'ARMADOR',
  UNIDADEATENDIMENTO: 'RIO CLARO',
  CODIGOPRONTUARIO: '385308-5153-1-04082026',
  TIPOEXAME: '1',
  TIPOEXAMENOME: 'ADMISSIONAL',
  EXAMES: [
    {
      codigoExame: 'clinico',
      nomeExame: 'Avaliação Clínica Ocupacional',
      grupo: 'Exame Clínico',
      profissional: 'AMANDA DE SOUZA ZANETTI',
      codigoProfissional: '1006',
      status: 'FINALIZADO',
      dataExame: '2026-08-04T13:12:54.666Z',
      formulario: {
        doencasFamiliares: ['Nenhuma'],
        doencasPessoais: [],
        afastamento: 'Não',
        observacaoAfastamento: '',
        tabagismo: 'Não',
        etilismo: 'Não',
        atividadeFisica: 'Não',
        acimaPeso: 'Não',
        ultimaMenstruacao: '',
        trabalhoAltura: 'Apto',
        trabalhoEspacoConfinado: 'Apto',
        capacidadeCarregarPeso: 'Apto',
        aptoOperarVeiculos: 'Apto',
        cabecaPescoco: 'Normal',
        torax: 'Normal',
        abdome: 'Normal',
        coluna: 'Normal',
        membrosSuperiores: 'Normal',
        membrosInferiores: 'Normal',
        pressaoArterial: [
          { valor: '130/80', horario: '10:13', profissional: 'AMANDA DE SOUZA ZANETTI' }
        ],
        peso: '82',
        altura: '1,70',
        imc: '28.37',
        resultadoImc: 'Sobrepeso',
        conclusao: 'Apto',
        observacoesMedicas: 'NEGA QUEIXAS E COMORBIDADES.',
        codigoMedico: '1006',
        medico: 'AMANDA DE SOUZA ZANETTI',
        observacoesDoencasPessoais: '',
        restricoes: {
          evitarCarregarPeso: false,
          pesoMaximoKg: '',
          evitarElevacaoBracos: false,
          evitarCurvarTronco: false,
          evitarEscadas: false,
          evitarLongasCaminhadas: false,
          evitarAlterarPostura: false,
          outros: false,
          descricaoOutros: ''
        }
      }
    },
    {
      codigoExame: '51.01.004-6',
      nomeExame: 'Audiometria tonal ocupacional',
      grupo: 'Audiometria',
      profissional: 'MAYRA KLEINER',
      codigoProfissional: '1301',
      status: 'FINALIZADO',
      dataExame: '2026-08-04T12:53:31.255Z',
      formulario: {
        tipoAudiometro: 'AVS 500',
        dataCalibracao: '06/11/2025',
        repousoAuditivo: 'Sim',
        horasRepouso: '14',
        queixaAuditiva: 'Não',
        audiometriaAnterior: 'Não',
        infeccaoCirurgiaOuvido: 'Não',
        tratamentoOtotoxicos: 'Não',
        surdezFamilia: 'Não',
        trabalhoAnteriorRuido: 'Sim',
        trabalhoAtualRuido: 'Não',
        usoProtetorAuricular: 'Sim',
        contatoQuimicos: 'Não',
        habitoSomAlto: 'Não',
        exposicaoExplosoes: 'Não',
        traumaCabecaOuvido: 'Não',
        labirintiteTontura: 'Não',
        usoMedicamentos: 'Não',
        meatoscopiaOD: 'SEM_OBSTRUCAO',
        meatoscopiaOE: 'SEM_OBSTRUCAO',
        viaAereaOD250: '10',
        viaAereaOD500: '15',
        viaAereaOD1000: '15',
        viaAereaOD2000: '10',
        viaAereaOD3000: '15',
        viaAereaOD4000: '15',
        viaAereaOD6000: '35',
        viaAereaOD8000: '45',
        viaAereaOE250: '15',
        viaAereaOE500: '25',
        viaAereaOE1000: '15',
        viaAereaOE2000: '25',
        viaAereaOE3000: '25',
        viaAereaOE4000: '25',
        viaAereaOE6000: '40',
        viaAereaOE8000: '45',
        mascaramentoVAOD250: false,
        mascaramentoVAOD500: false,
        mascaramentoVAOD1000: false,
        mascaramentoVAOD2000: false,
        mascaramentoVAOD3000: false,
        mascaramentoVAOD4000: false,
        mascaramentoVAOD6000: false,
        mascaramentoVAOD8000: false,
        mascaramentoVAOE250: false,
        mascaramentoVAOE500: false,
        mascaramentoVAOE1000: false,
        mascaramentoVAOE2000: false,
        mascaramentoVAOE3000: false,
        mascaramentoVAOE4000: false,
        mascaramentoVAOE6000: false,
        mascaramentoVAOE8000: false,
        tipoPerdaOD: 'Neurossensorial',
        tipoPerdaOE: 'Neurossensorial',
        classificacaoNR7OD: 'RA - Alterada',
        classificacaoNR7OE: 'RA - Alterada',
        classificacaoOD: 'Perda em Altas Frequências',
        classificacaoOE: 'Perda em Altas Frequências',
        configuracaoOD: 'Descendente',
        configuracaoOE: 'Descendente',
        perdaAuditivaOD: '14 dB',
        perdaAuditivaOE: '23 dB',
        frequenciasAlteradasOD: '6000 Hz, 8000 Hz',
        frequenciasAlteradasOE: '6000 Hz, 8000 Hz',
        mediaTonalOD: '14',
        mediaTonalOE: '23',
        classificacaoGeral: 'Audiometria com alterações nos limiares auditivos.',
        conclusao: 'Audiometria com alterações nos limiares auditivos.',
        resultadoOD: 'Perda em Altas Frequências Neurossensorial Descendente nas frequências 6000 Hz, 8000 Hz.',
        resultadoOE: 'Perda em Altas Frequências Neurossensorial Descendente nas frequências 6000 Hz, 8000 Hz.'
      }
    },
    {
      codigoExame: '50.01.001-8',
      nomeExame: 'Avaliação da acuidade visual',
      grupo: 'Acuidade Visual',
      profissional: 'Ilara Fernanda - CMSO',
      codigoProfissional: '1755',
      status: 'FINALIZADO',
      dataExame: '2026-08-04T13:17:33.730Z',
      formulario: {
        exameComLenteCorretiva: 'Não',
        longeOD: '20/20',
        longeOE: '20/20',
        longeBinocular: '',
        pertoBinocular: 'J2',
        ishiharaRealizado: false,
        ishiharaResultado1: 'Normal',
        ishiharaResultado2: 'Normal',
        ishiharaResultado3: 'Normal',
        ishiharaResultado4: 'Normal',
        ishiharaResultado5: 'Normal',
        ishiharaResultado6: 'Normal',
        ishiharaResultado7: 'Normal',
        ishiharaResultado8: 'Normal',
        ishiharaResultado9: 'Normal',
        ishiharaResultado10: 'Normal',
        conclusaoIshihara: 'Visão normal para cores',
        estereopsiaRealizado: false,
        estereopsiaResultado: 'Fora dos padrões da normalidade',
        estereopsiaAcertos: '0',
        estereopsiaTotal: '9',
        observacoesFinais: '',
        laudoOftalmologistaRecomendado: false
      }
    },
    {
      codigoExame: '225588',
      nomeExame: 'Avaliação Psicossocial',
      grupo: 'Psicossocial',
      profissional: 'NICOLLY SCAGLIUSI - CMSO',
      codigoProfissional: '1786',
      status: 'FINALIZADO',
      dataExame: '2026-08-04T12:46:54.760Z',
      formulario: {
        transtornoEmocional: 'Não',
        medicamentosControlados: 'Não',
        usoAlcoolDrogas: 'Não',
        tonturaDesmaios: 'Não',
        problemasSensoriais: 'Não',
        hipertensaoDiabetes: 'Não',
        relacionamentoFamiliar: 'Sim',
        medoAlturaEspacos: 'Não',
        experienciaAlturaConfinado: 'Sim',
        autoAvaliacaoAltura: 'Sim',
        autoAvaliacaoConfinado: 'Sim',
        observacoes: '',
        conclusao: 'Apto'
      }
    },
    {
      codigoExame: '19.01.029-0',
      nomeExame: 'Prova de função pulmonar completa',
      grupo: 'Espirometria',
      profissional: 'Camila Pamela Marcelino',
      codigoProfissional: '1627',
      status: 'FINALIZADO',
      dataExame: '2026-08-04T12:50:26.546Z',
      formulario: {
        tabagismo: false,
        tempoParouFumar: '',
        quantidadeCigarrosDia: 'Não se aplica',
        fumouHoje: '',
        tossePigarroManha: 'Não',
        catarroHabitual: 'Não',
        sibilancia: 'Não',
        faltaArEsforco: 'Não',
        doencaPulmonar: 'Não',
        asma: 'Não',
        medicacaoAsma: 'Não',
        cirurgiaToraxPulmao: 'Não',
        doencaCardiacaHipertensao: 'Não',
        proteseDentaria: 'Não',
        exposicaoPoeiraFumaca: 'Não',
        descricaoExposicao: '',
        exposicaoAtual: 'Não',
        observacoes: ''
      }
    }
  ]
};

const profissional = {
  codigo: '1006',
  nome: 'AMANDA DE SOUZA ZANETTI',
};

async function generatePdf(
  name: string,
  templateFn: Function,
  data: any,
  prof: any,
): Promise<void> {
  const dir = path.resolve(process.cwd(), 'temp_pdfs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  try {
    const docDefinition = await templateFn(data, prof, false);
    const pdfDoc = (pdfMake as any).createPdf(docDefinition);
    const filePath = path.join(dir, `${name}.pdf`);

    await new Promise<void>((resolve, reject) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        if (buffer) {
          fs.writeFileSync(filePath, buffer);
          console.log(`✅ ${name}.pdf`);
          resolve();
        } else {
          reject(new Error(`Erro ao gerar ${name}`));
        }
      });
    });
  } catch (error) {
    console.error(`❌ Erro ao gerar ${name}:`, error);
  }
}

async function generateAll() {
  console.log('🚀 Gerando todas as fichas de exames...\n');

  await generatePdf('01-ficha-clinica', gerarDocExameClinico, asoData, profissional);
  await generatePdf('02-audiometria', gerarDocAudiometria, asoData, profissional);
  await generatePdf('03-acuidade-visual', gerarDocAcuidadeVisual, asoData, profissional);
  await generatePdf('04-psicossocial', gerarDocPsicossocial, asoData, profissional);
  await generatePdf('05-espirometria', gerarDocEspirometria, asoData, profissional);

  console.log('\n🎉 Todas as fichas geradas em temp_pdfs/');
}

generateAll().catch(console.error);