export type TeleatendimentoSessionStatus =
  | 'WAITING_EMPLOYEE'
  | 'IN_CALL'
  | 'ENDED'
  | 'EXPIRED';

export type TeleatendimentoParticipantRole = 'PROFESSIONAL' | 'EMPLOYEE';

export interface TeleatendimentoParticipant {
  id?: string;
  name: string;
  socketId?: string | null;
}

export interface TeleatendimentoSessionEmployee {
  id?: string;
  name: string;
  companyCode?: string;
  prontuarioCode?: string;
  examType?: string;
  inviteToken: string;
  socketId?: string | null;
}

export interface TeleatendimentoSession {
  id: string;
  roomId: string;
  appOrigin: string;
  schedulingId: string;
  unidade?: string;
  sala?: string;
  exame?: string;
  status: TeleatendimentoSessionStatus;
  professional: TeleatendimentoParticipant;
  employee: TeleatendimentoSessionEmployee;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  endedAt?: string | null;
}

export interface CreateTeleatendimentoSessionInput {
  schedulingId: string;
  professionalId?: string;
  professionalName: string;
  unidade?: string;
  sala?: string;
  exame?: string;
  employeeId?: string;
  employeeName: string;
  companyCode?: string;
  prontuarioCode?: string;
  examType?: string;
  appOrigin?: string;
}

export interface CreateTeleatendimentoSessionResult {
  sessionId: string;
  roomId: string;
  inviteToken: string;
  inviteUrl: string;
  professionalUrl: string;
  expiresAt: string;
}

export interface TeleatendimentoSessionView {
  sessionId: string;
  roomId: string;
  schedulingId: string;
  unidade?: string;
  sala?: string;
  exame?: string;
  status: TeleatendimentoSessionStatus;
  inviteUrl?: string;
  professionalUrl?: string;
  professional: {
    id?: string;
    name: string;
    connected: boolean;
  };
  employee: {
    id?: string;
    name: string;
    companyCode?: string;
    prontuarioCode?: string;
    examType?: string;
    connected: boolean;
  };
  expiresAt: string;
  endedAt?: string | null;
}

export interface TeleatendimentoSocketJoinResult {
  session: TeleatendimentoSession;
  role: TeleatendimentoParticipantRole;
}

export interface TeleatendimentoSocketDetachResult {
  session: TeleatendimentoSession;
  role: TeleatendimentoParticipantRole;
}
