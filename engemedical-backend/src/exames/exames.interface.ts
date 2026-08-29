export interface IExameResponse {
  id: string;
  grupo: string;
  nome: string;
  codigos: string[];
  status_finalizacao: 'FINALIZADO' | 'AGUARDANDO_RESULTADO';
  enviar_para_azure: boolean;
  requer_assinatura: boolean;
  template_key: string | null;
  estimativa_minutos: number | null;
  preparacao: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IExameCreate {
  grupo: string;
  nome: string;
  codigos?: string[];
  status_finalizacao: 'FINALIZADO' | 'AGUARDANDO_RESULTADO';
  enviar_para_azure?: boolean;
  requer_assinatura?: boolean;
  template_key?: string | null;
  estimativa_minutos?: number | null;
  preparacao?: string | null;
}

export interface IExameUpdate {
  grupo?: string;
  nome?: string;
  codigos?: string[];
  status_finalizacao?: 'FINALIZADO' | 'AGUARDANDO_RESULTADO';
  enviar_para_azure?: boolean;
  requer_assinatura?: boolean;
  template_key?: string | null;
  estimativa_minutos?: number | null;
  preparacao?: string | null;
  ativo?: boolean;
}
