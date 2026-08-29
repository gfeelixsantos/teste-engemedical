import {
  MedicalOpinionData,
  SchedulingDocument,
} from 'src/mongo/types/scheduling';
import { IUserInfo } from 'src/mongo/types/user';

export enum TemplateNames {
  PARECER_MEDICO = 'PARECER_MEDICO',
  ASO_RELEASE = 'ASO_RELEASE',
  ASO_NO_CONTACTS = 'ASO_NO_CONTACTS',
  COMPLEMENTAR_RELEASE = 'COMPLEMENTAR_RELEASE',
  POSITION_CREATION_NOTIFICATION = 'POSITION_CREATION_NOTIFICATION',
  SCHEDULING_CLIENT = 'SCHEDULING_CLIENT',
  SCHEDULING_INTERNAL = 'SCHEDULING_INTERNAL',
  CUSTOMER_NO_EMAIL = 'CUSTOMER_NO_EMAIL',
  RELATORIO_FATURAMENTO = 'RELATORIO_FATURAMENTO',
  COMMITMENT_NOTIFICATION = 'COMMITMENT_NOTIFICATION',
  EXAMES_NAO_REALIZADOS = 'EXAMES_NAO_REALIZADOS',
  CUSTOM_HTML = 'CUSTOM_HTML',
}

export type Attachment = {
  filename: string;
  content?: any;
  contentType: string;
  encoding?: 'base64';
  container?: string;
  blobName?: string;
  path?: string;
  cid?: string;
};

export type EmailType = {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  attachment: Attachment[];
  template?: string;
  templatename: string;
  headers?: any;
  data?: {
    faturamentoInfo?: {
      nomeEmpresa: string;
      cnpj?: string;
      empresaId: string;
      dataReferencia: string;
      tipoDocumento: string;
      arquivoUrl: string;
      nomeArquivo: string;
      observacoes?: string;
    };
    funcionario?: SchedulingDocument;
    medicalOpinion?: MedicalOpinionData;
    issuedBy?: IUserInfo;
    asoInfo?: {
      nomeFuncionario: string;
      nomeEmpresa: string;
      tipoExame: string;
      data: string;
      chegada?: string;
      cpf?: string;
      parecer?: string;
      asoFileName?: string;
      asoFileUrl?: string;
      anotacoes?: string;
      observacoesParecer?: string[];
      examesRealizados?: Array<{
        nomeExame?: string;
        status?: string;
        dataExame?: string | Date;
        sala?: string;
        profissional?: string;
        duracao?: string;
        url?: string;
      }>;
    };
    complementarInfo?: {
      nomeFuncionario: string;
      nomeEmpresa: string;
      tipoExame: string;
      data: string;
      chegada?: string;
      cpf?: string;
      unidade?: string;
      examesRealizados?: Array<{
        nomeExame?: string;
        status?: string;
        dataExame?: string | Date;
        sala?: string;
        profissional?: string;
        duracao?: string;
        url?: string;
      }>;
    };
    positionInfo?: {
      nomeEmpresa: string;
      cnpjEmpresa: string;
      nomeUnidade: string;
      nomeSetor: string;
      codigoCargo: string;
      nomeCargo: string;
      descricaoAtividades: string;
      trabalhoAltura: boolean;
      espacoConfinado: boolean;
      operaEmpilhadeira: boolean;
      manipulacaoAlimentos: boolean;
      ponteRolante: boolean;
      conducaoVeiculos: boolean;
      atividadesComplementares: string;
      informacoesAdicionais: string;
      autorizacaoLabel: string;
      solicitanteNome: string;
      solicitanteEmail: string;
      solicitanteCpf: string;
      solicitanteTelefone: string;
      dataSolicitacao: string;
      adendoFileName: string;
      nomeUnidadeSimilar?: string;
      nomeSetorSimilar?: string;
      nomeCargoSimilar?: string;
    };
    customerNoEmailInfo?: {
      nomeCliente: string;
      nomeEmpresa: string;
      linkAtualizacao: string;
    };
    commitmentInfo?: {
      title: string;
      type: string;
      company?: string | null;
      company_contact?: string | null;
      participants: string[];
      vehicle?: string | null;
      start_time: string;
      end_time: string;
      isToday?: boolean;
      isTomorrow?: boolean;
    };
    unfinishedExamsInfo?: {
      reportDate: string;
      totalAttendances: number;
      attendances: Array<{
        nomeFuncionario: string;
        nomeEmpresa: string;
        tipoExame: string;
        dataAgendamento: string;
        unfinishedExams: Array<{
          nomeExame: string;
          status: string;
        }>;
      }>;
    };
  };
};
