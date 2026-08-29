import {
  MedicalOpinionData,
  SchedulingDocument,
} from '../../mongo/types/scheduling';
import { IUserInfo } from '../../user/interfaces/user.interface';

export enum TemplateNames {
  PARECER_MEDICO = 'PARECER_MEDICO',
  ASO_RELEASE = 'ASO_RELEASE',
  ASO_NO_CONTACTS = 'ASO_NO_CONTACTS',
  COMMITMENT_NOTIFICATION = 'COMMITMENT_NOTIFICATION',
  EXAMES_NAO_REALIZADOS = 'EXAMES_NAO_REALIZADOS',
}

export type Attachment = {
  filename: string;
  content: any;
  contentType: string;
  encoding: 'base64';
};

export type EmailType = {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  attachment: Attachment[];
  template?: string;
  templatename: string;
  data?: {
    funcionario?: SchedulingDocument;
    medicalOpinion?: MedicalOpinionData;
    issuedBy?: IUserInfo;
    asoInfo?: {
      nomeFuncionario: string;
      nomeEmpresa: string;
      tipoExame: string;
      data: string;
      chegada?: Date | string;
      cpf?: string;
      parecer?: string;
      asoFileName?: string;
      asoFileUrl?: string;
      anotacoes?: string;
      observacoesParecer?: string[];
      /** Indica que este e-mail é uma atualização com ASO assinado digitalmente */
      isAssinadoDigitalmente?: boolean;
      examesRealizados?: {
        nomeExame?: string;
        status?: string;
        dataExame?: Date | string;
        sala?: string;
        profissional?: string;
        duracao?: string;
        url?: string;
      }[];
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
  };
};
