import { ObjectId } from 'mongodb';
import { CadastroEmpresa } from 'src/soc/types/CadastroEmpresa';

export interface AmbienteEdificacao {
  AMBIENTE: string;
  DESCRICAO: string;
}

export interface ResponsavelTecnico {
  NOME: string;
  DOCUMENTOS: ('PCMSO' | 'PGR' | 'LTCAT')[];
  REGISTRO: string;
  UF: string;
  DATAINICIO?: string;
  DATAFIM?: string;
}

export interface ContratanteEmpresa {
  CNPJ: string;
  RAZAOSOCIAL: string;
  CIDADE: string;
  UF: string;
  LOGRADOURO?: string;
  NUMERO?: string;
  BAIRRO?: string;
  CEP?: string;
  CNAE?: string;
  GRAUDERISCO?: number;
}

export interface ContatoEmpresa {
  NOME: string;
  EMAIL: string;
  TELEFONE: string;
  PERFIL: string;
  CARGO: string;
  PERFILDISC: 'VERMELHO' | 'AZUL' | 'AMARELO' | 'VERDE' | '';
}

export interface EmpresaDocument extends CadastroEmpresa {
  _id?: ObjectId | string;
  CRIADOEM?: Date;
  ATUALIZADOEM?: Date;
  CNAESSECUNDARIOS?: string[];
  REPRESENTANTELEGAL?: string;
  CODIGOIBGEMUNICIPIO?: string;
  SITUACAOCADASTRAL?: string;
  EMAIL?: string;
  TELEFONE?: string;
  AMBIENTESEDIFICACAO?: AmbienteEdificacao[];
  RESPONSAVEISTECNICOS?: ResponsavelTecnico[];
  CONTRATANTES?: ContratanteEmpresa[];
  CONTATOS?: ContatoEmpresa[];
  CONFIGURACOES?: {
    requerPsicologa: boolean;
    credenciadaSoc: boolean;
    somenteComplementares?: boolean;
    faturamento?: 'CMSO' | 'SEGTEC';
    devedor?: boolean;
    asoRapidoAutomatico?: boolean;
    gestaoEpi?: boolean;
    painel?: boolean;
  };
  CODIGOINTERNOCLEINTE?: string;
  AVISOS?: string;
  OBSERVACOES?: string;
}
