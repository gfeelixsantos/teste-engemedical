export interface IBusinessRuleDocument {
  _id?: string;
  chave: string;
  descricao: string;
  valor: string[];
  tipo: 'set' | 'list';
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBusinessRuleResponse {
  id: string;
  chave: string;
  descricao: string;
  valor: string[];
  tipo: string;
  ativo: boolean;
}

export interface IBusinessRuleUpdate {
  descricao?: string;
  valor?: string[];
  tipo?: 'set' | 'list';
  ativo?: boolean;
}
