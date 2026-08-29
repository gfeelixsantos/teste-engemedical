import { NEST_URL } from "@/config/constants";

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
  id: string;
  participants: string[];
  title: string;
  type: string;
  description?: string;
  start_time: string;
  end_time: string;
  company?: string;
  company_contact?: string;
  emails_comunicado?: string[];
  vehicle?: VehicleType;
  created_at?: string;
  updated_at?: string;
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

export async function getCommitments(participant?: string, vehicle?: VehicleType): Promise<IEmployeeCommitment[]> {
  const query = new URLSearchParams();
  if (participant) query.append("participant", participant);
  if (vehicle) query.append("vehicle", vehicle);
  
  const response = await fetch(`${NEST_URL}commitments?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Erro ao buscar compromissos');
  }
  return response.json();
}

export async function createCommitment(data: ICreateCommitmentDto): Promise<IEmployeeCommitment> {
  const response = await fetch(`${NEST_URL}commitments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erro ao criar compromisso');
  }
  
  return response.json();
}

export async function getAvailableVehicles(startTime: string, endTime: string, excludeId?: string): Promise<VehicleType[]> {
  const query = new URLSearchParams();
  query.append("start_time", startTime);
  query.append("end_time", endTime);
  if (excludeId) query.append("excludeId", excludeId);

  const response = await fetch(`${NEST_URL}commitments/available-vehicles?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Erro ao buscar veículos disponíveis');
  }
  return response.json();
}

export async function getCommitmentsWithFilters(startDate?: string, endDate?: string): Promise<IEmployeeCommitment[]> {
  const query = new URLSearchParams();
  if (startDate) query.append("start_date", startDate);
  if (endDate) query.append("end_date", endDate);
  
  const response = await fetch(`${NEST_URL}commitments?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Erro ao buscar compromissos com filtros');
  }
  return response.json();
}

export async function updateCommitment(id: string, data: Partial<ICreateCommitmentDto>): Promise<IEmployeeCommitment> {
  const response = await fetch(`${NEST_URL}commitments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erro ao atualizar compromisso');
  }
  
  return response.json();
}

export async function deleteCommitment(id: string): Promise<void> {
  const response = await fetch(`${NEST_URL}commitments/${id}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error('Erro ao excluir compromisso');
  }
}
