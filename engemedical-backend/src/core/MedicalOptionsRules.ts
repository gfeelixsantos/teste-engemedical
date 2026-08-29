import {
  ParecerEspaçoConfinado,
  ParecerMedico,
  ParecerTrabalhoAltura,
  TipoExame,
} from '../mongo/enum/scheduling.enum';
import {
  LaudoRestricaoData,
  MedicalOpinionData,
  SchedulingDocument,
} from '../mongo/types/scheduling';
import { isSocOrigin } from './atendimento-auth-rules';

export class MedicalOpinionRules {
  static hasOpinionDetails(options: MedicalOpinionData | null | undefined) {
    return Boolean(options?.details && options.details.trim() !== '');
  }

  static getInvalidOpinionReason(
    options: MedicalOpinionData | null | undefined,
  ): string | null {
    if (
      options?.opinionType === ParecerMedico.APTO &&
      this.hasOpinionDetails(options) &&
      options.isProgrammed !== true
    ) {
      return 'APTO_COM_ORIENTACAO';
    }

    // APTO_COM_RESTRICAO requer laudoRestricao preenchido
    if (options?.opinionType === ParecerMedico.APTO_COM_RESTRICAO) {
      if (!options.laudoRestricao) {
        return 'Parecer APTO_COM_RESTRICAO requer o preenchimento do laudo de restricao temporaria.';
      }
    }

    return null;
  }

  static shouldCreateAso(
    options: MedicalOpinionData,
    scheduled: SchedulingDocument,
  ) {
    return this.getAsoEligibilityReason(options, scheduled) === null;
  }

  static getAsoEligibilityReason(
    options: MedicalOpinionData | null | undefined,
    scheduled: SchedulingDocument | null | undefined,
  ): string | null {
    if (!options) return 'parecer medico ausente';
    if (!scheduled) return 'agendamento ausente';

    const isInapto = options.opinionType === ParecerMedico.INAPTO;
    const isInaptoTemporariamente =
      options.opinionType === ParecerMedico.INAPTO_TEMPORARIAMENTE;

    const cargoOk = !String(scheduled.NOMECARGO || '').includes(
      'KIT CREDENCIADA',
    );
    const exams = Array.isArray(scheduled.EXAMES) ? scheduled.EXAMES : [];
    const hasClinico = exams.some((e) => e.grupo === 'Exame Clínico');
    const isNotMonitoracao =
      (scheduled.TIPOEXAME as TipoExame) !== TipoExame.MONITORACAO_PONTUAL;

    if (isInapto) return 'parecer INAPTO nao gera ASO';
    if (isInaptoTemporariamente)
      return 'parecer INAPTO_TEMPORARIAMENTE nao gera ASO';
    if (!cargoOk) return 'cargo marcado como KIT CREDENCIADA';
    if (!hasClinico) return 'atendimento sem Exame Clinico';
    if (!isNotMonitoracao) return 'tipo de exame MONITORACAO PONTUAL';

    return null;
  }

  static buildAsoObservacoesParecer(options: MedicalOpinionData): string[] {
    const observacoesParecer: string[] = [];

    if (options.altura === ParecerTrabalhoAltura.APTO_ALTURA_CINTO_100KG) {
      observacoesParecer.push(ParecerTrabalhoAltura.APTO_ALTURA_CINTO_100KG);
    }

    return observacoesParecer;
  }

  static shouldSendEmail(options: MedicalOpinionData) {
    // Não envia PARECER_MEDICO se justificativa é programada (vai no ASO_Liberado)
    if (this.hasOpinionDetails(options) && options.isProgrammed) {
      return false;
    }

    // Envia email para APTO_COM_ORIENTACAO (não programada), APTO_COM_RESTRICAO e INAPTO_ALTURA/CONFINADO
    return (
      this.hasOpinionDetails(options) ||
      options.opinionType === ParecerMedico.APTO_COM_RESTRICAO ||
      options.altura === ParecerTrabalhoAltura.INAPTO_ALTURA ||
      options.confinado === ParecerEspaçoConfinado.INAPTO_CONFINADO
    );
  }

  static shouldSendAsoLiberado(options: MedicalOpinionData): boolean {
    if (options.opinionType === ParecerMedico.APTO) {
      return !this.hasOpinionDetails(options) && !options.laudoRestricao;
    }
    if (options.opinionType === ParecerMedico.APTO_COM_ORIENTACAO) {
      return options.isProgrammed === true;
    }
    return false;
  }

  static validateLaudoRestricao(laudoRestricao: LaudoRestricaoData): string | null {
    if (
      typeof laudoRestricao.periodoDias !== 'number' ||
      !Number.isInteger(laudoRestricao.periodoDias) ||
      laudoRestricao.periodoDias <= 0
    ) {
      return 'laudoRestricao.periodoDias deve ser um número inteiro positivo.';
    }

    if (
      !laudoRestricao.dataInicio ||
      !/^\d{4}-\d{2}-\d{2}$/.test(laudoRestricao.dataInicio)
    ) {
      return 'laudoRestricao.dataInicio deve estar no formato ISO 8601 (YYYY-MM-DD).';
    }

    return null;
  }
}
