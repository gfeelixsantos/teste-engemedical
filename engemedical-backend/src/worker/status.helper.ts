import { SignatureStatus } from 'src/mongo/types/scheduling';

export function mapStatusToPtBr(status: string): SignatureStatus {
  const validStatuses: SignatureStatus[] = [
    'DIGITALIZADA',
    'PENDENTE',
    'PROCESSANDO',
    'ASSINADO',
    'LIBERADO',
    'ERRO_IDENTIDADE_PROFISSIONAL',
    'FALHA',
  ];

  if (validStatuses.includes(status as SignatureStatus)) {
    return status as SignatureStatus;
  }

  // Fallback seguro para valores inesperados.
  return 'DIGITALIZADA';
}
