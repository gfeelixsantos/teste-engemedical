import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { formatCPF } from '../utils/util';

type FormattedProfessional = {
  cpf: string;
  nome: string;
  conselho: string;
  uf: string;
};

const PRIMARY = '#114E34';
const MUTED = '#5B5B5B';
const LEGAL = '#111111';

const DIGITAL_SIGNATURE_LEGAL_TEXT =
  'Documento assinado eletronicamente com validade jurídica,\n' +
  'garantindo autoria e integridade conforme a Lei nº 14.063/2020,\n' +
  'a MP nº 2.200-2/2001 e a Portaria MTP nº 671/2021.';

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
        stack: signature
          ? [
              {
                image: signature,
                width: 70,
                alignment: 'left',
              },
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: 78,
                    y2: 0,
                    lineColor: PRIMARY,
                    lineWidth: 0.8,
                  },
                ],
                margin: [0, 1, 0, 0],
              },
            ]
          : [],
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

  return {
    columns: [
      {
        width: 104,
        ...buildSignatureStack(professional, signature),
      },
      {
        width: '*',
        text: DIGITAL_SIGNATURE_LEGAL_TEXT,
        fontSize: 5.5,
        color: LEGAL,
        italics: true,
        lineHeight: 1.08,
        alignment: 'left',
        margin: [0, 18, 0, 0],
      },
    ],
    columnGap: 8,
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
