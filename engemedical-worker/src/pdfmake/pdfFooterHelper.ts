import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { formatCPF } from '../utils/util';

type FormattedProfessional = {
  cpf: string;
  nome: string;
  conselho: string;
  uf: string;
};

const PRIMARY = '#0D47A1';
const MUTED = '#757575';
const LEGAL = '#212121';
const SIGNATURE_MAX_WIDTH = 108;
const SIGNATURE_MAX_HEIGHT = 36;

const DIGITAL_SIGNATURE_LEGAL_TEXT =
  'Documento assinado eletronicamente,\n' +
  'garantindo autoria e integridade integral do documento\n' +
  'conforme a MP nº 2.200-2/2001 e a Lei nº 14.063/2020.';

const formatProfessional = (
  professional: any,
): FormattedProfessional | null => {
  if (!professional) return null;

  if (typeof professional === 'string') {
    return {
      cpf: 'N/D',
      nome: professional,
      conselho: '',
      uf: '',
    };
  }

  return {
    cpf: professional.cpf ? formatCPF(professional.cpf) : 'N/D',
    nome: professional.profissional || professional.nome || 'N/D',
    conselho: professional.conselho || '',
    uf: professional.ufconselho || '',
  };
};

const buildSignatureStack = (
  professional: FormattedProfessional | null,
  signature: string | null,
) => {
  if (!professional) return { text: '' };

  const hasRegistro = !!(professional.conselho && professional.uf);

  return {
    stack: [
      {
        table: {
          widths: [SIGNATURE_MAX_WIDTH],
          body: [
            [
              signature
                ? {
                    image: signature,
                    fit: [SIGNATURE_MAX_WIDTH, SIGNATURE_MAX_HEIGHT],
                    alignment: 'center',
                  }
                : { text: '', margin: [0, SIGNATURE_MAX_HEIGHT, 0, 0] },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i === 1 ? 0.8 : 0),
          vLineWidth: () => 0,
          hLineColor: () => PRIMARY,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 2,
        },
        margin: [0, 0, 0, 3],
      },
      {
        text: professional.nome.toUpperCase(),
        fontSize: 6.5,
        color: PRIMARY,
        bold: true,
        margin: [0, 3, 0, 0],
      },
      ...(hasRegistro
        ? [
            {
              text: `Registro: ${professional.conselho} / ${professional.uf}`,
              fontSize: 6.5,
              color: MUTED,
              margin: [0, 1, 0, 0],
            },
          ]
        : []),
      {
        text: `CPF: ${professional.cpf}`,
        fontSize: 6.5,
        color: MUTED,
        margin: [0, 1, 0, 0],
      },
    ],
  };
};

const buildDigitalSignatureModel = (
  professional: FormattedProfessional | null,
  signature: string | null,
) => {
  if (!professional) return { text: '' };

  const signatureBlock = buildSignatureStack(professional, signature);

  return {
    stack: [
      {
        ...signatureBlock,
      },
      {
        text: DIGITAL_SIGNATURE_LEGAL_TEXT,
        fontSize: 4.6,
        color: LEGAL,
        italics: true,
        lineHeight: 1.02,
        alignment: 'left',
        margin: [0, 8, 0, 0],
      },
    ],
  };
};

export function buildPdfFooter(
  profissional: any,
  funcionarioNome: string,
  funcionarioCpf: string,
  codigoProntuario: string = '',
  unidadeAtendimento: string = '',
  assinaturaProfissional: string | null = null,
  incluirAssinaturaDigital: boolean = false,
  medico: any = null,
  assinaturaMedico: string | null = null,
  _qrCodeUrl: string = 'https://validar.iti.gov.br/',
): TDocumentDefinitions['footer'] {
  void codigoProntuario;

  const prof = formatProfessional(profissional);
  const med = formatProfessional(medico);

  const professionalCode =
    typeof profissional === 'object' ? profissional?.codigo : profissional;
  const professionalName =
    typeof profissional === 'object'
      ? profissional?.nome || profissional?.profissional
      : profissional;

  const showMedico = Boolean(
    medico &&
      medico.codigo !== professionalCode &&
      medico.nome !== professionalName,
  );

  const textoFuncionario =
    'O(A) funcionario(a) atesta a realizacao da consulta/exame e esta ciente da finalidade ocupacional e legal deste documento. Confirma o aceite dos termos por autenticacao biometrica registrada no sistema SOC, conforme o Termo de Ciencia e Registro de Aceite para Uso de Biometria.';

  const leftBlock = incluirAssinaturaDigital
    ? showMedico
      ? {
          columns: [
            {
              width: 118,
              ...buildSignatureStack(prof, assinaturaProfissional),
            },
            {
              width: '*',
              ...buildDigitalSignatureModel(med, assinaturaMedico),
            },
          ],
          columnGap: 8,
        }
      : buildDigitalSignatureModel(prof, assinaturaProfissional)
    : {
        columns: [
          {
            width: 132,
            ...buildSignatureStack(prof, assinaturaProfissional),
          },
          showMedico
            ? {
                width: 160,
                ...buildSignatureStack(med, assinaturaMedico),
              }
            : { width: 160, text: '' },
        ],
        columnGap: 6,
      };

  return (): any => ({
    margin: [34, 8, 34, 14],
    columns: [
      {
        width: '*',
        ...leftBlock,
      },
      {
        width: 140,
        stack: [
          {
            text: textoFuncionario,
            fontSize: 5.4,
            italics: true,
            color: MUTED,
            alignment: 'justify',
            margin: [0, 0, 0, 4],
          },
          {
            text: funcionarioNome || 'N/D',
            fontSize: 7,
            alignment: 'right',
            color: PRIMARY,
            bold: true,
          },
          {
            text: `CPF: ${formatCPF(funcionarioCpf)}`,
            fontSize: 7,
            alignment: 'right',
            color: MUTED,
          },
          unidadeAtendimento
            ? {
                text: `${unidadeAtendimento}, ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
                fontSize: 6,
                alignment: 'right',
                color: MUTED,
                margin: [0, 2, 0, 0],
              }
            : { text: '' },
        ],
      },
    ],
    columnGap: 10,
  });
}
