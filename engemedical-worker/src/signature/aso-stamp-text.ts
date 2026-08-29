import { AsoMetadata } from './aso-metadata.types';

function formatCpf(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11) return value;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function buildOfficialAsoStampText(
  metadata: AsoMetadata,
  schedulingId: string,
) {
  const cleanCpf = metadata.cpf ? metadata.cpf.replace(/\D/g, '') : '';
  const formattedCpf = cleanCpf ? formatCpf(cleanCpf) : 'N/D';
  const crmInfo = metadata.crm
    ? `${metadata.crm}${metadata.uf ? `-${metadata.uf}` : ''}`
    : 'N/D';

  return {
    title: 'ASSINADO DIGITALMENTE',
    disclaimer:
      'Assinatura eletr\u00f4nica com validade jur\u00eddica, nos termos da\nLei n\u00ba 14.063/2020 e da Portaria MTP n\u00ba 671/2021.',
    professionalInfo: `M\u00e9dico Examinador: ${metadata.professionalName || 'N/D'}`,
    credentialsInfo: `CRM: ${crmInfo} | CPF: ${formattedCpf}`,
    referenceInfo: `ID: ${schedulingId} | Prontu\u00e1rio: ${metadata.prontuario || 'N/D'}`,
  };
}
