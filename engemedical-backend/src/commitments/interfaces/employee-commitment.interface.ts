export enum VehicleType {
  UNIDADE_MOVEL = 'UNIDADE_MOVEL',
  UNIDADE_RAIO_X = 'UNIDADE_RAIO_X',
  DOBLO_I = 'DOBLO_I',
  DOBLO_II = 'DOBLO_II',
  UP = 'UP',
  PICKUP = 'PICKUP',
  MOBI = 'MOBI',
  MOBI_COMERCIAL = 'MOBI_COMERCIAL'
}

export interface IEmployeeCommitment {
  id?: string;
  participants: string[];
  title: string;
  type: string;
  description?: string | null;
  start_time: string | Date;
  end_time: string | Date;
  company?: string | null;
  company_contact?: string | null;
  emails_comunicado: string[];
  vehicle?: VehicleType | null;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ICreateCommitmentDto {
  participants: string[];
  title: string;
  type: string;
  description?: string;
  start_time: string;
  end_time: string;
  company?: string;
  company_contact?: string;
  emails_comunicado?: string[];
  vehicle?: VehicleType | null;
}

export interface IUpdateCommitmentDto {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  company?: string;
  company_contact?: string;
  emails_comunicado?: string[];
  vehicle?: VehicleType | null;
}
