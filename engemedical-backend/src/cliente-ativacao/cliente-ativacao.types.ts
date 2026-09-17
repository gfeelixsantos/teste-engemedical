export type ClientActivationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'COMPLETED'
  | 'BLOCKED';

export type ClientActivationStep =
  | 'COMPANY'
  | 'CONTACT'
  | 'EMPLOYEES'
  | 'APPOINTMENT'
  | 'DOCUMENTS'
  | 'REVIEW';

export interface ClientActivationDocument {
  _id?: unknown;
  id?: string;
  userId: string;
  companyCode: string;
  cnpj?: string;
  companyName?: string;
  filialId?: string;
  status: Exclude<ClientActivationStatus, 'NOT_STARTED'>;
  currentStep: ClientActivationStep;
  completedSteps: ClientActivationStep[];
  pendingItems: string[];
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  completedAt?: Date;
  contact?: { name: string; email: string; phone?: string };
  unitId?: string;
  appointmentId?: string;
  employeeSheet?: { key: string; filename: string; size: number; rowCount: number; uploadedAt: Date };
}

export interface ClientActivationRepositoryPort {
  findByUserAndCompany(userId: string, companyCode: string): Promise<ClientActivationDocument | null>;
  start?(document: ClientActivationDocument): Promise<ClientActivationDocument>;
  update?(documentId: string, userId: string, companyCode: string, changes: Partial<ClientActivationDocument>): Promise<ClientActivationDocument>;
}

export interface ClientActivationResponse {
  company: {
    companyCode: string;
    companyName: string;
    cnpj: string;
    filialId: string;
  };
  activation: {
    id?: string;
    status: ClientActivationStatus;
    currentStep: ClientActivationStep;
    completedSteps: ClientActivationStep[];
    pendingItems: string[];
    progress: number;
    contact?: { name: string; email: string; phone?: string };
    appointmentId?: string;
    employeeSheet?: { filename: string; size: number; rowCount: number; uploadedAt: Date };
  };
}
