import { ObjectId } from 'mongodb';

export interface EmpresaDocumento {
  _id?: string | ObjectId;
  EMPRESAID: string;
  CNPJ?: string;
  CATEGORIA: 'FATURAMENTO' | 'LOGO';
  TIPODOCUMENTO: string;
  NOMEARQUIVOORIGINAL: string;
  BLOBURL: string;
  DATAREFERENCIA: string;
  OBSERVACOES?: string;
  COMUNICAREMAIL: boolean;
  CONTATOSNOTIFICADOS?: string[];
  CRIADOPOR: string;
  CRIADOEM: Date;
}
