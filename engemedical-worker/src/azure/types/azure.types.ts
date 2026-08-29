import { SchedulingDocument } from 'src/mongo/types/scheduling';
import { IUserInfo } from 'src/mongo/types/user';

export type resultadosExamesQueue = {
  grupo: string;
  funcionario: SchedulingDocument;
  profissional: IUserInfo;
  updateAt: Date;
  credentials?: {
    pin?: string;
  };
};

export enum CODIGOS_TIPO_SOCGED {
  PRONTUARIO_MEDICO = '3',
}

export type UploadSocged = {
  arquivo: null | Buffer;
  codEmpresa: string;
  codFuncionario: string;
  sequencialFicha: string;
  nomeArquivo: string;
  nomeGed: string;
  codigoGed: string;

  // opcional, usado internamente para rastrear o documento Mongo
  schedulingId?: string;
};
