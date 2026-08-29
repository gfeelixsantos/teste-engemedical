import { ObjectId } from 'mongodb';
import { AtendimentoStatus, ExamStatus } from '../enum/scheduling.enum';
import { ExamsScheduled, SchedulingDocument } from '../types/scheduling';
import { getExamesList } from 'src/exames/exames.provider';

export class FuncionarioEntity {
  constructor(private readonly doc: SchedulingDocument) {}

  get id() {
    return typeof this.doc._id === 'string'
      ? new ObjectId(this.doc._id)
      : this.doc._id;
  }

  getRaw() {
    return this.doc;
  }

  findExameIndex(codigo: string) {
    return this.doc.EXAMES.findIndex((e) => e.codigoExame === codigo);
  }

  updateExameAtIndex(index: number, patch: Partial<ExamsScheduled>) {
    if (index < 0) return;
    this.doc.EXAMES[index] = { ...this.doc.EXAMES[index], ...patch };
  }

  allExamesFinalizados() {
    return this.doc.EXAMES.every((e) => e.status === ExamStatus.FINALIZADO);
  }

  anyAguardandoResultado() {
    return this.doc.EXAMES.some(
      (e) => e.status === ExamStatus.AGUARDANDO_RESULTADO,
    );
  }

  anyPendentes() {
    return this.doc.EXAMES.some((e) => e.status === ExamStatus.PENDENTE);
  }

  private isClinicoValido(): boolean {
    const exameClinico = this.getRaw().EXAMES.find(
      (e) => e.grupo === 'Exame Clínico',
    );

    if (!exameClinico) return false;

    return (
      exameClinico.status === ExamStatus.FINALIZADO &&
      exameClinico.formulario?.conclusao === 'Apto'
    );
  }

  private isAcuidadeVisualValida(): boolean {
    const exameAcuidade = this.getRaw().EXAMES.find(
      (e) => e.grupo === 'Acuidade Visual',
    );

    if (!exameAcuidade || exameAcuidade.status !== ExamStatus.FINALIZADO) {
      return false;
    }

    const formulario = exameAcuidade.formulario;
    if (!formulario) return false;

    const valoresValidos = ['20/20', '20\\20', '20-20'];
    const longeODValido = valoresValidos.includes(formulario.longeOD);
    const longeOEValido = valoresValidos.includes(formulario.longeOE);
    const pertoBinocularValido =
      formulario.pertoBinocular?.toUpperCase() === 'J1';
    const ishiharaNaoRealizado = formulario.ishiharaRealizado === false;
    const estereopsiaNaoRealizado = formulario.estereopsiaRealizado === false;

    return (
      longeODValido &&
      longeOEValido &&
      pertoBinocularValido &&
      ishiharaNaoRealizado &&
      estereopsiaNaoRealizado
    );
  }

  private isAudiometriaValida(): boolean {
    const exameAudiometria = this.getRaw().EXAMES.find(
      (e) => e.grupo === 'Audiometria',
    );

    if (!exameAudiometria) return false;

    return (
      exameAudiometria.status === ExamStatus.FINALIZADO &&
      exameAudiometria.formulario?.classificacaoOD === 'Normal' &&
      exameAudiometria.formulario?.classificacaoOE === 'Normal'
    );
  }

  private possuiApenasExamesPermitidos(gruposPermitidos: string[]): boolean {
    const gruposValidos = [
      'Exame Clínico',
      'Audiometria',
      'Acuidade Visual',
      'Triagem',
    ];

    return !this.getRaw().EXAMES.some((e) => {
      if (e.codigoExame === 'triagem') return false;
      if (!gruposValidos.includes(e.grupo ?? '')) return true;
      if (!gruposPermitidos.includes(e.grupo ?? '')) return true;
      return false;
    });
  }

  isAptoSomenteClinico(): boolean {
    return (
      this.isClinicoValido() &&
      this.possuiApenasExamesPermitidos(['Exame Clínico', 'Triagem'])
    );
  }

  isAptoClinicoAudiometria(): boolean {
    return (
      this.isClinicoValido() &&
      this.isAudiometriaValida() &&
      this.possuiApenasExamesPermitidos([
        'Exame Clínico',
        'Audiometria',
        'Triagem',
      ])
    );
  }

  isAptoClinicoAcuidade(): boolean {
    return (
      this.isClinicoValido() &&
      this.isAcuidadeVisualValida() &&
      this.possuiApenasExamesPermitidos([
        'Exame Clínico',
        'Acuidade Visual',
        'Triagem',
      ])
    );
  }

  isAptoClinicoAudiometriaAcuidade(): boolean {
    return (
      this.isClinicoValido() &&
      this.isAudiometriaValida() &&
      this.isAcuidadeVisualValida() &&
      this.possuiApenasExamesPermitidos([
        'Exame Clínico',
        'Audiometria',
        'Acuidade Visual',
        'Triagem',
      ])
    );
  }

  isComplementar() {
    const codigosClinico = new Set(getExamesList()['Exame Clínico'][0].codigos);
    return this.doc.EXAMES.every((e) => !codigosClinico.has(e.codigoExame));
  }

  isComplementarManual() {
    const empresasComplementarManual = new Set(['263126']);
    const codigoEmpresa = String(this.doc.CODIGOEMPRESA || '').trim();
    return empresasComplementarManual.has(codigoEmpresa);
  }

  isCredenciada() {
    const nomeCargo = String(this.doc.NOMECARGO || '');
    const nomeSetor = String(this.doc.NOMESETOR || '');

    return (
      nomeCargo.includes('KIT CREDENCIADA') ||
      nomeSetor.includes('KIT CREDENCIADA')
    );
  }

  updateAtendimentoStatus() {
    const todosFinalizados = this.allExamesFinalizados();
    const temPendentes = this.anyPendentes();
    const aguardandoResultado = this.anyAguardandoResultado();

    if (temPendentes) {
      this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.EM_ATENDIMENTO;
      return;
    }

    if (aguardandoResultado && !temPendentes) {
      this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.AGUARDANDO_RESULTADOS;

      if (this.isCredenciada()) {
        this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.FINALIZADO;
      }
      return;
    }

    if (todosFinalizados) {
      if (this.isComplementar() && !this.isComplementarManual()) {
        this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.FINALIZADO;
        return;
      }

      this.doc.ATENDIMENTOSTATUS =
        AtendimentoStatus.AGUARDANDO_AVALIACAO_MEDICA;

      if (this.isCredenciada()) {
        this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.FINALIZADO;
      }

      if (this.isComplementarManual()) {
        this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.AGUARDANDO_RESULTADOS;
      }
    }
  }
}
