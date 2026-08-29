import { ObjectId } from 'mongodb';
import { AtendimentoStatus, ExamStatus } from '../enum/scheduling.enum';
import {
  AsoInfo,
  ExamsScheduled,
  LaudoRestricaoData,
  SchedulingDocument,
} from '../types/scheduling';
import { getExamesList } from '../../exames/exames.provider';
import { isExamReadyForDownstream } from '../utils/exam-downstream-readiness.contract';

/* Entidade que encapsula comportamento sobre um funcionário */
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

  findExame(codigo: string) {
    return this.doc.EXAMES.find((e) => e.codigoExame === codigo);
  }

  updateExameAtIndex(index: number, patch: Partial<ExamsScheduled>) {
    if (index < 0) return;
    this.doc.EXAMES[index] = { ...this.doc.EXAMES[index], ...patch };
  }

  addExameIfMissing(codigo: string, exame: Partial<ExamsScheduled>) {
    const idx = this.findExameIndex(codigo);
    if (idx === -1)
      this.doc.EXAMES.push({
        codigoExame: codigo,
        status: ExamStatus.PENDENTE,
        ...exame,
      } as ExamsScheduled);
  }

  addTriagemSeNecessario() {
    const configList54 = getExamesList()['Exame Clínico'] || [];
    const codigosClinico = new Set(configList54.flatMap((item) => item.codigos || []));

    const hasClinico = this.doc.EXAMES.some((e) =>
      codigosClinico.has(e.codigoExame),
    );

    const jaTemTriagem = this.doc.EXAMES.some(
      (e) => e.codigoExame === 'triagem',
    );

    if (!jaTemTriagem && hasClinico) {
      this.doc.EXAMES.push({
        codigoExame: 'triagem',
        nomeExame: 'Triagem',
        status: ExamStatus.PENDENTE,
        dataExame: null,
        preparacao: '',
        profissional: '',
        sala: '',
        sequencialResultadoExame: undefined,
        url: '',
        formulario: '',
        grupo: 'Triagem',
      });
    }
  }

  allExamesFinalizados() {
    return this.doc.EXAMES.every(
      (e) =>
        e.status === ExamStatus.FINALIZADO ||
        e.status === ExamStatus.NAO_REALIZADO,
    );
  }

  anyAguardandoResultado() {
    return this.doc.EXAMES.some(
      (e) => e.status === ExamStatus.AGUARDANDO_RESULTADO,
    );
  }

  anyAguardandoResultadoProcessamento() {
    return this.doc.EXAMES.some(
      (e) =>
        e.status === ExamStatus.AGUARDANDO_RESULTADO &&
        e.grupo !== 'Exame Clínico' &&
        e.grupo !== 'Triagem',
    );
  }

  aplicarSomentePa(somentePa: boolean) {
    if (somentePa) {
      // 1. Remove o Exame Clínico
      this.getRaw().EXAMES = this.getRaw().EXAMES.filter(
        (ex) =>
          ex.grupo !== 'Exame Clínico' &&
          ex.grupo !== 'Exame Clinico' &&
          ex.nomeExame?.toLowerCase() !== 'exame clínico' &&
          ex.nomeExame?.toLowerCase() !== 'exame clinico',
      );

      // 2. Garante que a Triagem exista e permaneça
      const jaTemTriagem = this.getRaw().EXAMES.some(
        (e) => e.codigoExame === 'triagem' || e.grupo === 'Triagem',
      );
      if (!jaTemTriagem) {
        this.getRaw().EXAMES.push({
          codigoExame: 'triagem',
          nomeExame: 'Triagem',
          status: ExamStatus.PENDENTE,
          dataExame: null,
          preparacao: '',
          profissional: '',
          sala: '',
          sequencialResultadoExame: undefined,
          url: '',
          formulario: '',
          grupo: 'Triagem',
        });
      }

      if (!this.getRaw().ANOTACOES?.includes('Realização somente de PA')) {
        this.getRaw().ANOTACOES = (this.getRaw().ANOTACOES || '') + '\n [Sistema] Realização somente de PA';
      }
    }
  }

  getIndicesByGrupo = (grupo: string) =>
    this.getRaw().EXAMES.reduce((acc: number[], exame, index) => {
      if (exame.grupo === grupo) acc.push(index);
      return acc;
    }, []);

  // Dentro da classe FuncionarioEntity

  getStatusAfterRemovingResult(exame: ExamsScheduled): ExamStatus {
    const grupo = exame.grupo;
    const codigo = exame.codigoExame;

    // Percorre lista global dos exames
    for (const [grupoNome, lista] of Object.entries(getExamesList())) {
      for (const item of lista) {
        if (item.codigos.includes(codigo)) {
          // Se o padrão de finalização era FINALIZADO → volta para PENDENTE
          if (item.statusFinalizacao === ExamStatus.FINALIZADO) {
            return ExamStatus.PENDENTE;
          }

          // Se o padrão do exame é AGUARDANDO_RESULTADO → volta para AGUARDANDO_RESULTADO
          if (item.statusFinalizacao === ExamStatus.AGUARDANDO_RESULTADO) {
            return ExamStatus.AGUARDANDO_RESULTADO;
          }
        }
      }
    }

    // fallback seguro
    return ExamStatus.PENDENTE;
  }

  /** Verifica se o exame clínico está finalizado e apto */
  private isClinicoValido(): boolean {
    const exameClinico = this.getRaw().EXAMES.find(
      (e) => e.grupo === 'Exame Clínico',
    );

    if (!exameClinico) return false;

    return (
      exameClinico.status === 'FINALIZADO' &&
      isExamReadyForDownstream(exameClinico) &&
      exameClinico.formulario?.conclusao?.toUpperCase() === 'APTO'
    );
  }

  /** Verifica se a acuidade visual está finalizada e com resultados normais */
  private isAcuidadeVisualValida(): boolean {
    const exameAcuidade = this.getRaw().EXAMES.find(
      (e) => e.grupo === 'Acuidade Visual',
    );

    if (!exameAcuidade) return false;

    const formulario = exameAcuidade.formulario;

    // Verifica se está finalizado
    if (exameAcuidade.status !== 'FINALIZADO') return false;
    if (!isExamReadyForDownstream(exameAcuidade)) return false;

    // Verifica se o formulário existe
    if (!formulario) return false;

    // Valida acuidade visual de longe
    const valoresValidos = ['20/20', '20\\20', '20-20'];

    const longeODValido = valoresValidos.includes(formulario.longeOD);
    const longeOEValido = valoresValidos.includes(formulario.longeOE);

    // Valida acuidade visual de perto (case insensitive para J1/j1)
    const pertoBinocularValido =
      formulario.pertoBinocular?.toUpperCase() === 'J1';

    // Valida que testes complementares NÃO foram realizados
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

  /** Verifica se a audiometria está finalizada e com classificações normais */
  private isAudiometriaValida(): boolean {
    const exameAudiometria = this.getRaw().EXAMES.find(
      (e) => e.grupo === 'Audiometria',
    );

    if (!exameAudiometria) return false;

    return (
      exameAudiometria.status === 'FINALIZADO' &&
      isExamReadyForDownstream(exameAudiometria) &&
      exameAudiometria.formulario?.classificacaoOD === 'Normal' &&
      exameAudiometria.formulario?.classificacaoOE === 'Normal'
    );
  }

  /** Verifica se possui apenas os grupos de exames permitidos */
  private possuiApenasExamesPermitidos(gruposPermitidos: string[]): boolean {
    const exames = this.getRaw().EXAMES;

    // Grupos que são considerados válidos/simples
    const gruposValidos = [
      'Exame Clínico',
      'Audiometria',
      'Acuidade Visual',
      'Triagem',
    ];

    return !exames.some((e) => {
      // Permite triagem sempre (pelo código também)
      if (e.codigoExame === 'triagem') return false;

      // Bloqueia qualquer exame que NÃO seja um dos grupos válidos
      if (!gruposValidos.includes(e.grupo ?? '')) return true;

      // Bloqueia se não estiver nos grupos permitidos para este método específico
      if (!gruposPermitidos.includes(e.grupo ?? '')) return true;

      return false;
    });
  }

  isAptoSomenteClinico(): boolean {
    const gruposPermitidos = ['Exame Clínico', 'Triagem'];

    return (
      this.isClinicoValido() &&
      this.possuiApenasExamesPermitidos(gruposPermitidos)
    );
  }

  isAptoClinicoAudiometria(): boolean {
    const gruposPermitidos = ['Exame Clínico', 'Audiometria', 'Triagem'];

    return (
      this.isClinicoValido() &&
      this.isAudiometriaValida() &&
      this.possuiApenasExamesPermitidos(gruposPermitidos)
    );
  }

  isAptoClinicoAcuidade(): boolean {
    const gruposPermitidos = ['Exame Clínico', 'Acuidade Visual', 'Triagem'];

    return (
      this.isClinicoValido() &&
      this.isAcuidadeVisualValida() &&
      this.possuiApenasExamesPermitidos(gruposPermitidos)
    );
  }

  isAptoClinicoAudiometriaAcuidade(): boolean {
    const gruposPermitidos = [
      'Exame Clínico',
      'Audiometria',
      'Acuidade Visual',
      'Triagem',
    ];

    return (
      this.isClinicoValido() &&
      this.isAudiometriaValida() &&
      this.isAcuidadeVisualValida() &&
      this.possuiApenasExamesPermitidos(gruposPermitidos)
    );
  }

  anyPendentes() {
    return this.doc.EXAMES.some((e) => e.status === ExamStatus.PENDENTE);
  }

  isComplementar() {
    const configList290 = getExamesList()['Exame Clínico'] || [];
    const codigosClinico = new Set(configList290.flatMap((item) => item.codigos || []));
    return this.doc.EXAMES.every((e) => !codigosClinico.has(e.codigoExame));
  }

  isComplementarManual() {
    const EMPRESAS_COMPLEMENTAR_MANUAL = new Set([
      '263126', // Riclan
    ]);

    const codigo = (this.doc.CODIGOEMPRESA || '').trim();

    return EMPRESAS_COMPLEMENTAR_MANUAL.has(codigo);
  }

  isCredenciada() {
    return (
      (this.doc.NOMECARGO || '').includes('KIT CREDENCIADA') ||
      (this.doc.NOMESETOR || '').includes('KIT CREDENCIADA') ||
      (this.doc.CODIGOINTERNOEMPRESA || '').toUpperCase() === 'KIT'
    );
  }

  injetarRestricaoNoExameClinico(laudoRestricao: LaudoRestricaoData): void {
    const idx = this.doc.EXAMES.findIndex(e => e.grupo === 'Exame Clínico');
    if (idx === -1) return;
    this.doc.EXAMES[idx] = {
      ...this.doc.EXAMES[idx],
      formulario: {
        ...(this.doc.EXAMES[idx].formulario ?? {}),
        conclusao: 'Apto com restrições',
        duracaoRestricaoDias: String(laudoRestricao.periodoDias),
        dataInicioRestricao: laudoRestricao.dataInicio,
        restricoes: laudoRestricao.restricoes,
        recomendacoesRestricao: laudoRestricao.recomendacoes,
      },
    };
  }

  setAtendimentoStatus(status: AtendimentoStatus) {
    this.doc.ATENDIMENTOSTATUS = status;
  }

  setHorarioAtual() {
    this.doc.HORARIO = new Date().toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
  }

  setParecer(parecer: string) {
    this.doc.PARECERMEDICO = parecer;
  }

  setMedico(user: { nome: string; codigo: string }) {
    this.doc.MEDICO = user.nome;
  }

  /**
   * Retorna o código do médico (codigoMedico) do exame clínico.
   * O valor é obtido do formulário do exame clínico quando disponível.
   */
  getCodigoMedicoClinico(): string | null {
    const configList349 = getExamesList()['Exame Clínico'] || [];
    const codigosClinico = new Set(configList349.flatMap((item) => item.codigos || []));

    const exameClinico = this.doc.EXAMES.find((e) =>
      codigosClinico.has(e.codigoExame),
    );

    if (!exameClinico || !exameClinico.formulario) return null;

    const formulario = exameClinico.formulario as {
      codigoMedico?: string;
      codigoProfissional?: string;
    };

    return (
      formulario.codigoMedico ||
      formulario.codigoProfissional ||
      exameClinico.codigoProfissional ||
      null
    );
  }

  /**
   * Retorna os dados do médico (nome e código) do exame clínico.
   */
  getMedicoClinico(): {
    nome: string;
    codigo: string;
    cpf: string;
    perfil: string;
    conselho: string;
    ufconselho: string;
  } | null {
    const configList381 = getExamesList()['Exame Clínico'] || [];
    const codigosClinico = new Set(configList381.flatMap((item) => item.codigos || []));

    const exameClinico = this.doc.EXAMES.find((e) =>
      codigosClinico.has(e.codigoExame),
    );

    if (!exameClinico) return null;

    const formulario = (exameClinico.formulario || {}) as {
      profissional?: string;
      codigoProfissional?: string;
      medico?: string;
      codigoMedico?: string;
    };

    const clinicalData =
      (exameClinico as any).professional ||
      (exameClinico as any).profissionalData ||
      null;

    // No Prontuário, o nome do médico que realizou o clínico
    // costuma estar em profissional/codigoProfissional do exame ou dentro do formulario
    return {
      nome:
        formulario.medico ||
        formulario.profissional ||
        exameClinico.profissional ||
        clinicalData?.nome ||
        '',
      codigo:
        formulario.codigoMedico ||
        formulario.codigoProfissional ||
        exameClinico.codigoProfissional ||
        clinicalData?.codigo ||
        '',
      cpf: clinicalData?.cpf || clinicalData?.documento || '',
      perfil: clinicalData?.perfil || '',
      conselho:
        clinicalData?.conselho ||
        clinicalData?.crm ||
        clinicalData?.registro ||
        '',
      ufconselho:
        clinicalData?.ufconselho ||
        clinicalData?.crm_uf ||
        clinicalData?.uf ||
        '',
    };
  }

  setRecomendacao(text?: string | null) {
    this.doc.RECOMENDACAOMEDICA = text ?? null;
  }

  setAsoInfo(info: AsoInfo) {
    this.doc.ASOINFO = info;
  }

  updateAtendimentoStatus(previousStatus?: AtendimentoStatus) {
    const todosFinalizados = this.allExamesFinalizados();
    const temPendentes = this.anyPendentes();
    const aguardandoResultadoProcessamento =
      this.anyAguardandoResultadoProcessamento();

    if (previousStatus === AtendimentoStatus.EM_ATENDIMENTO) {
      if (temPendentes) {
        this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.EM_ATENDIMENTO;
        return;
      }
      if (aguardandoResultadoProcessamento) {
        this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.AGUARDANDO_RESULTADOS;
        return;
      }
    }

    if (temPendentes) {
      this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.EM_ATENDIMENTO;
      return;
    }

    const temNaoRealizado = this.doc.EXAMES.some(
      (e) => e.status === ExamStatus.NAO_REALIZADO,
    );

    if (temNaoRealizado) {
      this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.PENDENTE;
      return;
    }

    if (aguardandoResultadoProcessamento && !temPendentes) {
      this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.AGUARDANDO_RESULTADOS;

      if (this.isCredenciada()) {
        this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.FINALIZADO;
      }
      return;
    }

    if (todosFinalizados) {
      if (this.isComplementar() || this.isComplementarManual()) {
        this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.FINALIZADO;
        return;
      }

      this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.AVALIACAO_MEDICA;

      if (this.isCredenciada()) {
        this.doc.ATENDIMENTOSTATUS = AtendimentoStatus.FINALIZADO;
      }
    }
  }
}
