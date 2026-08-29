export type ExamFormSnapshotDocument = {
  version: 1;
  route: 'schedulings/exame/update';
  schedulingId: string;
  prontuario?: string | null;
  funcionarioNome?: string | null;
  codigoExame: string[];
  grupos: string[];
  unidadeAtendimento?: string | null;
  empresa?: string | null;
  isEditing: boolean;
  sala?: string | null;
  dataExame?: string | Date | null;
  formulario: any;
  authUser?: {
    codigo?: string;
    nome?: string;
    cpf?: string;
    perfil?: string;
  } | null;
  profissional?: {
    codigo?: string;
    nome?: string;
    cpf?: string;
    perfil?: string;
  } | null;
  createdAt: Date;
};
