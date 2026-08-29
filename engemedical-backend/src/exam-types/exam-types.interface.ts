export interface IExamTypeDocument {
  _id?: string;
  chave: string;
  valor: string;
  ordem: number;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IExamTypeResponse {
  id: string;
  chave: string;
  valor: string;
  ordem: number;
  ativo: boolean;
}

export interface IExamTypeCreate {
  chave: string;
  valor: string;
  ordem?: number;
}

export interface IExamTypeUpdate {
  valor?: string;
  ordem?: number;
  ativo?: boolean;
}
