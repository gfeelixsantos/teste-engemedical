import { AsoMetadata } from './aso-metadata.types';

function pickFirstFilled(...values: any[]) {
  for (const value of values) {
    if (typeof value === 'string') {
      if (value.trim() !== '') return value;
      continue;
    }
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return '';
}

export function resolveAsoMetadata(input: {
  payloadProfessional?: any;
  asoProfessional?: any;
  clinicalProfessionalData?: any;
  exameClinico?: any;
  scheduling?: any;
  dbUser?: any;
  trimmedId?: string;
}): AsoMetadata {
  const payloadProfessional = input.payloadProfessional || null;
  const asoProfessional = input.asoProfessional || null;
  const clinicalProfessionalData = input.clinicalProfessionalData || null;
  const exameClinico = input.exameClinico || {};
  const scheduling = input.scheduling || {};
  const dbUser = input.dbUser || null;

  const resolvedProfessionalName =
    pickFirstFilled(
      payloadProfessional?.nome,
      payloadProfessional?.name,
      asoProfessional?.nome,
      asoProfessional?.name,
      clinicalProfessionalData?.nome,
      clinicalProfessionalData?.profissional,
      dbUser?.nome,
      dbUser?.name,
    ) ||
    exameClinico?.profissional ||
    scheduling?.MEDICO ||
    'N/D';

  const resolvedCpf =
    pickFirstFilled(
      payloadProfessional?.cpf,
      payloadProfessional?.documento,
      asoProfessional?.cpf,
      asoProfessional?.documento,
      clinicalProfessionalData?.cpf,
      clinicalProfessionalData?.documento,
      dbUser?.cpf,
      dbUser?.documento,
      scheduling?.MEDICOCPF,
      scheduling?.MEDICOEXAMINADORCPF,
      scheduling?.CPF,
    ) || '';

  const resolvedCrm =
    pickFirstFilled(
      payloadProfessional?.conselho,
      payloadProfessional?.crm,
      payloadProfessional?.registro,
      asoProfessional?.conselho,
      asoProfessional?.crm,
      asoProfessional?.registro,
      clinicalProfessionalData?.conselho,
      clinicalProfessionalData?.crm,
      clinicalProfessionalData?.registro,
      dbUser?.conselho,
      dbUser?.crm,
      dbUser?.registro,
      scheduling?.MEDICOCRM,
      scheduling?.MEDICOEXAMINADORCRM,
      scheduling?.CRM,
    ) || '';

  const resolvedUf =
    pickFirstFilled(
      payloadProfessional?.ufconselho,
      payloadProfessional?.crm_uf,
      payloadProfessional?.uf,
      asoProfessional?.ufconselho,
      asoProfessional?.crm_uf,
      asoProfessional?.uf,
      clinicalProfessionalData?.ufconselho,
      clinicalProfessionalData?.crm_uf,
      clinicalProfessionalData?.uf,
      dbUser?.ufconselho,
      dbUser?.crm_uf,
      dbUser?.uf,
      scheduling?.MEDICOUF,
      scheduling?.MEDICOEXAMINADORUF,
      scheduling?.UF,
    ) || '';

  return {
    professionalName: resolvedProfessionalName,
    crm: resolvedCrm,
    uf: resolvedUf,
    cpf: resolvedCpf,
    prontuario: scheduling?.CODIGOPRONTUARIO || input.trimmedId || 'N/D',
  };
}
