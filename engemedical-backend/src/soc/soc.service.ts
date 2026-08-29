import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EmailService } from '../nodemailer/nodemailer.service';
import { StructuredLogger } from 'src/utils/logger';
import type { MongoService } from 'src/mongo/mongo.service';
import { ResultadoDataFichaExameRequest } from './types/ResultadoExameDataFicha';
import { PedidoExame, PedidoExameRequest } from './types/PedidoExame';
import { SchedulingDocument } from 'src/mongo/types/scheduling';
import { EmpresaDocument } from 'src/mongo/types/empresa';
import {
  calcularRangePipeline,
  collectExamBuffers,
  getTipoExameNome,
  mapUpdateSchedulingWithPedidoExame,
  mergePdfs,
  standardizeFileName,
  formatDocumentFileName,
} from 'src/utils/util';
import { AtendimentoStatus, ExamStatus } from 'src/mongo/enum/scheduling.enum';
import { ObjectId } from 'mongodb';
import { executeMergeInteligente } from 'src/utils/merge-engine';
import { SocCompanyService } from './services/soc-company.service';
import { SocExportService } from './services/soc-export.service';
import { SocExamService } from './services/soc-exam.service';
import { SocRiskService } from './services/soc-risk.service';
import { SocEmployeeRiskService } from './services/soc-employee-risk.service';
import { SocAudiometryService } from './services/soc-audiometry.service';
import { SocPcdService } from './services/soc-pcd.service';
import { SocCredentialedService } from './services/soc-credentialed.service';
import { SocUploadService } from './services/soc-upload.service';
import { AsoWorkerOrchestratorService } from './services/aso-worker-orchestrator.service';
import {
  UploadSocged,
  TemplateNames,
  EmailType,
  ResultadoExameSocMessage,
} from 'src/azure/types/azure.types';
import { AzureService } from 'src/azure/azure.service';
import { GoogleDriveService } from 'src/google/drive/google-drive.service';
import { FuncionarioEntity } from '../mongo/model/FuncionarioEntity';
import { WsResultadoExame } from './webservice/resultadoExame/WsResultadoExame';
import { WsFuncionarioModelo2 } from './webservice/funcionario/WsFuncionarioModelo2';

const getMongoService = () =>
  require('../mongo/mongo.service').MongoService;

export interface HandleUpdateResult {
  success: boolean;
  message: string;
}

@Injectable()
export class SocService {
  constructor(
    @Inject(forwardRef(getMongoService))
    private readonly mongoService: MongoService,
    @Inject(forwardRef(() => AzureService))
    private readonly azureService: AzureService,
    private readonly socCompanyService: SocCompanyService,
    private readonly socExportService: SocExportService,
    private readonly socExamService: SocExamService,
    private readonly socRiskService: SocRiskService,
    private readonly socEmployeeRiskService: SocEmployeeRiskService,
    private readonly socAudiometryService: SocAudiometryService,
    private readonly socPcdService: SocPcdService,
    private readonly socCredentialedService: SocCredentialedService,
    private readonly socUploadService: SocUploadService,
    private readonly asoWorkerOrchestratorService: AsoWorkerOrchestratorService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly emailService: EmailService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(SocService.name);
  }

  async onModuleInit() {
    // Cache é gerenciado pelo SocCompanyService (OnModuleInit + refresh a cada 5 min)

    // setTimeout(() => {

    //  this.handleUpdateSocToMongo() // Função para atualizar agendamentos rodar todo inicio do dia...
    //   .catch(err => Logger.fatal("Erro ao atualizar SOC para MongoDB", err))
    //   .finally(() => Logger.log("✅ Finalizado processo de atualização SOC para MongoDB") );
    // }, 5000); // Aguarda 5 segundos após a inicialização do módulo
  }

  //  ---------------------------------------------------------
  //  Faz o carregamento das empresas
  // ---------------------------------------------------------
  async getCompaniesRegister() {
    return await this.socCompanyService.getCompaniesRegister();
  }

  async getLocalCompanies() {
    const localCompanies = await this.mongoService.findAllEmpresas();
    return localCompanies.sort((a, b) =>
      (a.RAZAOSOCIAL || '').localeCompare(b.RAZAOSOCIAL || '', 'pt-BR', {
        sensitivity: 'base',
      }),
    );
  }

  async fetchRawSocCompanies() {
    return await this.socCompanyService.fetchRawSocCompanies();
  }

  async getCompanyByCode(codigo: string): Promise<any | undefined> {
    return this.socCompanyService.getCompanyByCode(codigo);
  }

  private sanitizeStrings(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      const trimmed = obj.trim();
      if (trimmed.includes('@')) {
        return trimmed.toLowerCase();
      }
      return trimmed.toUpperCase();
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeStrings(item));
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key of Object.keys(obj)) {
        cleaned[key] = this.sanitizeStrings(obj[key]);
      }
      return cleaned;
    }
    return obj;
  }

  async updateCompany(codigo: string, updateData: Partial<EmpresaDocument>): Promise<any | undefined> {
    let existing = await this.mongoService.findEmpresaByCode(codigo);
    if (!existing) {
      const rawSoc = this.socCompanyService.getCompanyByCode(codigo);
      if (rawSoc) {
        existing = {
          CODIGO: rawSoc.CODIGO,
          codigo: rawSoc.CODIGO,
          CNPJ: rawSoc.CNPJ || '',
          RAZAOSOCIAL: rawSoc.RAZAOSOCIAL || '',
          NOMEABREVIADO: rawSoc.NOMEABREVIADO || '',
          ATIVO: rawSoc.ATIVO || '1',
          CNAE: rawSoc.CNAE || '',
          RAMO_ATIVIDADE: rawSoc.RAMO_ATIVIDADE || '',
          GRAU_RISCO: rawSoc.GRAU_RISCO || 1,
          NUMERO_FUNCIONARIOS: rawSoc.NUMERO_FUNCIONARIOS || 0,
          FONE_FAX: rawSoc.FONE_FAX || '',
        } as any;
      } else {
        throw new Error(`Empresa com código ${codigo} não encontrada no banco local ou no SOC.`);
      }
    }

    const sanitizedData = this.sanitizeStrings(updateData);

    const dataToSave: EmpresaDocument = {
      ...existing,
      ...sanitizedData,
      CODIGO: codigo,
      codigo: codigo,
    };

    await this.mongoService.upsertEmpresa(dataToSave);
    return await this.mongoService.findEmpresaByCode(codigo);
  }

  async createCompany(data: Partial<EmpresaDocument>): Promise<any | undefined> {
    const cod = data.CODIGO || data.codigo;
    if (!cod) {
      throw new Error('Código da empresa é obrigatório.');
    }
    const existing = await this.mongoService.findEmpresaByCode(cod);
    if (existing) {
      throw new Error(`Empresa com código ${cod} já existe no banco local.`);
    }

    const sanitizedData = this.sanitizeStrings(data);

    let finalContatos = sanitizedData.CONTATOS || [];
    if (finalContatos.length === 0) {
      try {
        const socContacts = await this.getCompanyContactsDetailed(cod);
        if (Array.isArray(socContacts) && socContacts.length > 0) {
          finalContatos = socContacts.map((c: any) => ({
            NOME: c.nome || c.nomeContato || c.contato || "Contato SOC",
            EMAIL: c.primeiroEmail || c.email || "",
            TELEFONE: c.telefone || (c.dddTelefone && c.telefone ? `(${c.dddTelefone}) ${c.telefone}` : "") || "",
            PERFIL: c.nomePerfil || c.codigoPerfil || "",
            CARGO: "",
            PERFILDISC: "",
          })).filter(c => c.EMAIL);
        }
      } catch (err) {
        this.logger.error(`Erro ao sincronizar contatos automaticamente para nova empresa ${cod}:`, err);
      }
    }

    const dataToSave: Partial<EmpresaDocument> = {
      ...sanitizedData,
      CONTATOS: finalContatos,
      ATIVO: '1',
    };

    await this.mongoService.upsertEmpresa(dataToSave);
    return await this.mongoService.findEmpresaByCode(cod);
  }

  async deleteCompany(codigo: string): Promise<void> {
    if (!this.mongoService.empresasCollection) {
      throw new Error('Coleção de empresas não inicializada no MongoDB.');
    }
    await this.mongoService.empresasCollection.deleteOne({ CODIGO: codigo });
    await this.socCompanyService.loadCompaniesFromDb();
  }

  //  ---------------------------------------------------------
  //  Exporta dados cadastro de pessoas (login)
  // ---------------------------------------------------------
  async EdCadastroPessoas() {
    return await this.socExportService.EdCadastroPessoas();
  }

  /**
   * Exporta dados responsável por levantar todas as fichas
   * de todas as empresas.
   * @param dataInicio formato: (dd/MM/yyyy) - configurado para dia 01 do mês corrente
   * @param dataFim formato: (dd/MM/yyyy)
   * @default dataAtual
   * @returns
   */
  public async EdResultadoExamesTodasEmpresas(
    request: ResultadoDataFichaExameRequest,
  ): Promise<void> {
    return await this.socExportService.EdResultadoExamesTodasEmpresas(request);
  }

  /**
   * Orquestra a geração do ASO digital via Worker.
   */
  public async generateDigitalAso(doc: SchedulingDocument, options: any, issuer: any) {
    const payload = await this.asoWorkerOrchestratorService.buildWorkerPayload(doc, options, issuer);
    if (!payload) return null;
    return await this.asoWorkerOrchestratorService.callWorker(payload);
  }

  /**
   * Expõe o buildWorkerPayload para uso externo (ex: retry cron).
   */
  public async buildWorkerPayload(doc: SchedulingDocument, options: any, issuer: any) {
    return await this.asoWorkerOrchestratorService.buildWorkerPayload(doc, options, issuer);
  }

  /**
   * Exporta os pedidos de exames de uma empresa e executa o processamento de atualização
   * no modelo {@link SchedulingDocument}.
   *
   * @param request Objeto {@link PedidoExameRequest} contendo os parâmetros da busca.
   * @returns Documento de agendamento atualizado/inserido ou um objeto de erro.
   */
  public async EdPedidoExame(
    request: PedidoExameRequest,
    manterExames: boolean = true,
    ficha?: string,
  ): Promise<
    SchedulingDocument | { success: boolean; message: string } | void
  > {
    const { diaBrStr } = calcularRangePipeline();

    const {
      empresa,
      funcionario = '',
      dataInicio = request.dataInicio ?? diaBrStr,
      dataFim = diaBrStr,
    } = request;

    // Busca os pedidos de exame
    const responseJson = await this.socExportService.EdPedidoExame(request);

    if (!responseJson) {
      return { success: false, message: 'Falha ao consultar o SOC.' };
    }

    // Nenhum pedido encontrado
    if (!responseJson.length) {
      return {
        success: false,
        message: 'Nenhum pedido de exame encontrado.',
      };
    }

    // Filtra apenas pedidos do dia atual (ou sem DATAEXAME)
    let pedidosHoje = responseJson.filter(
      (p) => p.DATAEXAME === dataFim || p.DATAEXAME === '',
    );

    // Se uma ficha específica foi solicitada, filtra por SEQUENCIAFICHA
    if (ficha) {
      pedidosHoje = pedidosHoje.filter((p) => p.SEQUENCIAFICHA === ficha);
    }

    this.logger.debug({ event: 'SOC_PEDIDO_EXAME_REQUEST', request });
    this.logger.debug({
      event: 'SOC_PEDIDO_EXAME_RESPONSE_COUNT',
      count: pedidosHoje.length,
    });
    if (!pedidosHoje.length) {
      return {
        success: false,
        message: 'Nenhum ASO encontrado com data de hoje.',
      };
    }

    // Chama o processamento principal
    const resultado = await this.socExamService.handleUpdates(
      empresa,
      pedidosHoje,
      (pedido) => this.socRiskService.riscosFuncionario(pedido),
      manterExames,
    );

    // Retorna o documento atualizado/inserido para a rota
    if (resultado) {
      return resultado;
    }

    return { success: false, message: 'Nenhum documento foi processado.' };
  }

  /**
   * Retorna todas as opções de ASO disponíveis para um funcionário na data atual,
   * sem deduplicação por funcionário. Cada opção representa uma SEQUENCIAFICHA
   * (um tipo de ASO/ficha diferente).
   *
   * Usado pelo frontend para exibir um modal de seleção quando o funcionário
   * possui múltiplas fichas no mesmo dia (ex: PERIODICO + MONITORAÇÃO PONTUAL).
   */
  public async getPedidoExameOptions(
    codempresa: string,
    codfuncionario: string,
  ): Promise<{ sequenciaFicha: string; codigoTipoExame: string; tipoExameNome: string; dataFicha: string }[]> {
    const { diaBrStr } = calcularRangePipeline();

    const request: PedidoExameRequest = {
      empresa: codempresa,
      funcionario: codfuncionario,
      dataInicio: diaBrStr,
      dataFim: diaBrStr,
    };

    const responseJson = await this.socExportService.EdPedidoExame(request);

    if (!responseJson || !responseJson.length) {
      return [];
    }

    // Agrupa por SEQUENCIAFICHA (cada ficha = uma opção de ASO)
    const grupos = new Map<string, PedidoExame[]>();
    for (const pedido of responseJson) {
      const chave = pedido.SEQUENCIAFICHA || `${pedido.CODIGOEMPRESA}-${pedido.CODIGOFUNCIONARIO}-${pedido.CODIGOTIPOEXAME}-${pedido.DATAFICHA}`;
      if (!grupos.has(chave)) {
        grupos.set(chave, []);
      }
      grupos.get(chave)!.push(pedido);
    }

    const options: { sequenciaFicha: string; codigoTipoExame: string; tipoExameNome: string; dataFicha: string }[] = [];

    for (const [, pedidos] of grupos) {
      const primeiro = pedidos[0];
      options.push({
        sequenciaFicha: primeiro.SEQUENCIAFICHA || '',
        codigoTipoExame: primeiro.CODIGOTIPOEXAME,
        tipoExameNome: getTipoExameNome(primeiro.CODIGOTIPOEXAME),
        dataFicha: primeiro.DATAFICHA,
      });
    }

    // Ordena por dataFicha descendente para mostrar o mais recente primeiro
    options.sort((a, b) => (b.dataFicha || '').localeCompare(a.dataFicha || ''));

    return options;
  }

  private filtrarPedidosDaMesmaFichaSyncProntuario(
    responseJson: any[],
    agendamentoExistente: SchedulingDocument,
    dataOriginalFicha: string,
  ) {
    if (
      agendamentoExistente.SEQUENCIAFICHA &&
      agendamentoExistente.SEQUENCIAFICHA.trim() !== ''
    ) {
      return responseJson.filter(
        (p) => p.SEQUENCIAFICHA === agendamentoExistente.SEQUENCIAFICHA,
      );
    }

    return responseJson.filter((p) => p.DATAFICHA === dataOriginalFicha);
  }

  private montarUpdateFieldsSyncProntuario(
    agendamentoExistente: SchedulingDocument,
    ficha: any,
    examesFinais: any[],
  ) {
    const codigoInternoEmpresa = this.socCompanyService.getCompanyByCode(
      ficha.CODIGOEMPRESA,
    )?.['CÓD. CLIENTE (INT.)'];
    const dadosCadastrais = mapUpdateSchedulingWithPedidoExame(
      ficha,
      codigoInternoEmpresa,
    );

    delete dadosCadastrais.ASOSTATUS;
    delete dadosCadastrais.ASOINFO;

    const statusSeguro =
      agendamentoExistente.ATENDIMENTOSTATUS === AtendimentoStatus.AGENDADO ||
      !agendamentoExistente.ATENDIMENTOSTATUS
        ? AtendimentoStatus.AGENDADO
        : agendamentoExistente.ATENDIMENTOSTATUS;

    return {
      ...dadosCadastrais,
      EXAMES: examesFinais,
      ATENDIMENTOSTATUS: statusSeguro,
    };
  }

  /**
   * Atualiza dados cadastrais e realiza o Merge Inteligente de exames,
   * retornando um resumo das alteracoes.
   *
   * Fluxo exclusivo da rota /soc/sincronizar-prontuario.
   */
  public async sincronizarProntuario(
    schedulingId: string,
    empresa: string,
    funcionario: string,
  ): Promise<{
    success: boolean;
    data?: SchedulingDocument;
    message?: string;
    resumo?: any;
  }> {
    const agendamentoExistente =
      await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
        {
          _id: new ObjectId(schedulingId),
        },
      );

    if (!agendamentoExistente) {
      return {
        success: false,
        message: 'Agendamento nao encontrado no banco local.',
      };
    }

    const documentoOriginal = JSON.parse(JSON.stringify(agendamentoExistente));

    const dataOriginalFicha = agendamentoExistente.DATAAGENDAMENTO;

    const responseJson =
      await this.socExportService.EdPedidoExameSyncProntuario({
        empresa,
        funcionario,
        dataInicio: dataOriginalFicha,
        dataFim: dataOriginalFicha,
      });

    if (!responseJson || !responseJson.length) {
      return {
        success: false,
        message: `Nenhum pedido de exame encontrado no SOC gerado na data da Ficha: ${dataOriginalFicha}.`,
      };
    }

    const pedidosFicha = this.filtrarPedidosDaMesmaFichaSyncProntuario(
      responseJson,
      agendamentoExistente,
      dataOriginalFicha,
    );

    if (!pedidosFicha.length) {
      return {
        success: false,
        message: `A Ficha (Sequencial: ${agendamentoExistente.SEQUENCIAFICHA || dataOriginalFicha}) foi perdida ou alterada radicalmente no SOC e nao pode ser atualizada.`,
      };
    }

    const ficha = pedidosFicha[0];

    const [examesNovosSoc, riscos] = await Promise.all([
      this.socExamService.handleExamScheduledSyncProntuario(pedidosFicha),
      this.socRiskService.riscosFuncionario(ficha),
    ]);

    const { finais, resumo } = executeMergeInteligente(
      agendamentoExistente.EXAMES,
      examesNovosSoc,
      [],
    );

    const updateFields = {
      ...this.montarUpdateFieldsSyncProntuario(
        agendamentoExistente,
        ficha,
        finais,
      ),
      RISCOSASO: riscos,
    };

    let updatedDocument: SchedulingDocument | null = null;
    try {
      const result: any =
        await this.mongoService.schedulingsCollection.findOneAndUpdate(
          { _id: new ObjectId(schedulingId) },
          { $set: updateFields },
          { returnDocument: 'after' },
        );

      updatedDocument = result?.value || result;
    } catch (error) {
      await this.mongoService.schedulingsCollection.replaceOne(
        { _id: new ObjectId(schedulingId) },
        documentoOriginal,
      );
      this.logger.error('ROLLBACK EXECUTADO - Falha no findOneAndUpdate:', error);
      return {
        success: false,
        message: 'Erro critico ao atualizar. Documento restaurado ao estado original.',
      };
    }

    if (!updatedDocument) {
      await this.mongoService.schedulingsCollection.replaceOne(
        { _id: new ObjectId(schedulingId) },
        documentoOriginal,
      );
      return {
        success: false,
        message: 'Falha ao atualizar o agendamento. Documento restaurado.',
      };
    }

    return {
      success: true,
      data: updatedDocument as SchedulingDocument,
      resumo,
    };
  }

  /**
   * Sincroniza exames de outra data com a ficha atual reaproveitando handleExamScheduled.
   */
  public async sincronizarExamesOutraData(
    resultadoAtual: SchedulingDocument,
    examesOutraData: any[],
  ): Promise<SchedulingDocument> {
    return await this.socExamService.sincronizarExamesOutraData(
      resultadoAtual,
      examesOutraData,
    );
  }

  /**
   * Atualiza ou cria registros de agendamento ({@link SchedulingDocument})
   * com base nos pedidos de exame recebidos.
   *
   * @param empresa - Código da empresa
   * @param pedidosEmpresa - Lista de pedidos de exames da empresa
   * @returns O documento atualizado ou criado do agendamento
   */
  public async handleUpdates(
    empresa: string,
    pedidosEmpresa: any[],
  ): Promise<SchedulingDocument | null> {
    return await this.socExamService.handleUpdates(
      empresa,
      pedidosEmpresa,
      (pedido) => this.socRiskService.riscosFuncionario(pedido),
    );
  }

  async EdAsosFuncionario(
    empresa: string,
    funcionario: string,
    fichaAtual: string,
  ) {
    return await this.socExportService.EdAsosFuncionario(
      empresa,
      funcionario,
      fichaAtual,
    );
  }

  async handleCredenciadas(cpf: string) {
    return await this.socCredentialedService.handleCredenciadas(cpf);
  }

  async getAudiometriaAnterior(empresa: string, codigoFuncionario: string) {
    return await this.socAudiometryService.getAudiometriaAnterior(
      empresa,
      codigoFuncionario,
    );
  }

  async verifyPcdStatus(codFuncionario: string, empresa: string) {
    return await this.socPcdService.verifyPcdStatus(codFuncionario, empresa);
  }

  //  ---------------------------------------------------------
  //  Função principal para atualização SOC x Mongo
  // ---------------------------------------------------------
  async handleUpdateSocToMongo(): Promise<{
    success: boolean;
    message: string;
    empresasProcessadas?: number;
    erros?: string[];
  }> {
    const startTime = Date.now();

    try {
      const { diaBrStr } = calcularRangePipeline();
      this.logger.debug(
        `🚀 [handleUpdateSocToMongo] Iniciando sync para data: ${diaBrStr}`,
      );

      const empresas = await this.socCompanyService.getCompaniesRegister();
      const listaEmpresas = empresas.map((e) => e.CODIGO);

      if (listaEmpresas.length === 0) {
        return {
          success: false,
          message: 'Nenhuma empresa encontrada no cadastro.',
          empresasProcessadas: 0,
        };
      }

      let empresasProcessadas = 0;
      for (const empresa of listaEmpresas) {
        try {
          const resultado = await this.EdPedidoExame({ empresa });
          if (
            resultado &&
            ('success' in resultado ? resultado.success : true)
          ) {
            empresasProcessadas++;
          }
          await new Promise((resolve) => setTimeout(resolve, 550));
        } catch (empresaError) {
          this.logger.error(`❌ Erro empresa ${empresa}:`, empresaError);
        }
      }

      const duration = Date.now() - startTime;
      return {
        success: empresasProcessadas > 0,
        message: `Processado ${empresasProcessadas} empresas em ${duration}ms`,
        empresasProcessadas,
      };
    } catch (error) {
      this.logger.error(`❌ Erro crítico:`, error);
      return { success: false, message: `Erro crítico: ${error.message}` };
    }
  }

  // --- Novos Métodos Expostos ---

  async getCompanyContacts(codEmpresa: string) {
    return await this.socExportService.getCompanyContacts(codEmpresa);
  }

  async getCompanyContactsDetailed(codEmpresa: string) {
    return await this.socExportService.getCompanyContactsDetailed(codEmpresa);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isAsoPayload(payload: UploadSocged): boolean {
    const normalize = (value?: string) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

    const nomeArquivo = normalize(payload.nomeArquivo);
    const nomeGed = normalize(payload.nomeGed);
    const classificacao = normalize(payload.classificacao);

    return (
      classificacao === 'ASO' ||
      nomeGed === 'ASO' ||
      nomeGed.startsWith('ASO') ||
      nomeArquivo.startsWith('ASO')
    );
  }

  private isLikelyAsoUrl(url?: string | null): boolean {
    const normalized = String(url || '')
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    return normalized.includes('/aso/') || normalized.includes('%2faso%2f');
  }

  private resolvePreferredAsoUrl(params: {
    payloadUrl?: string | null;
    storedAsoUrl?: string | null;
    schedulingId?: string;
  }): string | null {
    const { payloadUrl, storedAsoUrl, schedulingId } = params;
    const payloadUrlNormalized = String(payloadUrl || '').trim();
    const storedUrlNormalized = String(storedAsoUrl || '').trim();

    if (!payloadUrlNormalized && !storedUrlNormalized) {
      return null;
    }

    if (
      payloadUrlNormalized &&
      storedUrlNormalized &&
      payloadUrlNormalized !== storedUrlNormalized
    ) {
      this.logger.warn(
        `[SOCGED][ASO] Divergencia de URL para schedulingId=${schedulingId || 'n/a'}: payloadUrl=${payloadUrlNormalized} | storedAsoUrl=${storedUrlNormalized}. Priorizando ASOINFO.url.`,
      );
    }

    if (this.isLikelyAsoUrl(storedUrlNormalized)) {
      return storedUrlNormalized;
    }

    if (this.isLikelyAsoUrl(payloadUrlNormalized)) {
      return payloadUrlNormalized;
    }

    // Ultimo fallback: fonte de verdade do Mongo
    return storedUrlNormalized || payloadUrlNormalized;
  }

  private buildSocgedBaseName(
    prefix: 'ASO' | 'Prontuario',
    scheduling: SchedulingDocument,
    options?: { includeCompany?: boolean },
  ): string {
    const includeCompany = options?.includeCompany ?? false;
    return formatDocumentFileName({
      prefix: prefix === 'Prontuario' ? 'PRONTUARIO' : 'ASO',
      nome: scheduling.NOME,
      empresa: includeCompany ? scheduling.NOMEEMPRESA : undefined,
      tipo: scheduling.TIPOEXAMENOME || 'ASO',
      data: scheduling.DATAAGENDAMENTO,
    });
  }

  private buildPdfFileName(baseName: string): string {
    const normalizedBase = standardizeFileName(String(baseName || 'ARQUIVO'))
      .replace(/[.]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .replace(/\.PDF$/i, '');
    return `${normalizedBase}.pdf`;
  }

  private async uploadSocgedFileToGoogleDrive(params: {
    scheduling: SchedulingDocument;
    payload: UploadSocged;
    mode: 'ASO' | 'PRONTUARIO';
  }): Promise<void> {
    const { scheduling, payload, mode } = params;

    if (mode === 'ASO' && scheduling.ASOINFO?.googleDrive?.fileId) {
      this.logger.log(
        `[GDRIVE][SOCGED] Upload ASO ja realizado previamente. Pulando fallback para schedulingId=${payload.schedulingId || scheduling._id || 'n/a'} | fileId=${scheduling.ASOINFO.googleDrive.fileId}`,
      );
      return;
    }

    if (mode === 'ASO' && scheduling.ASOINFO?.googleDrive?.pending) {
      const pendingAt = scheduling.ASOINFO.googleDrive.pendingAt
        ? new Date(scheduling.ASOINFO.googleDrive.pendingAt)
        : null;
      const isFreshPending =
        pendingAt && Date.now() - pendingAt.getTime() < 15 * 60 * 1000;

      if (isFreshPending) {
        this.logger.log(
          `[GDRIVE][SOCGED] Upload ASO em processamento pela fila dedicada. Pulando fallback para schedulingId=${payload.schedulingId || scheduling._id || 'n/a'}`,
        );
        return;
      }
    }

    if (!this.googleDriveService.isEnabled()) {
      this.logger.warn(
        `[GDRIVE][SOCGED] Integracao desabilitada. Pulando upload ${mode} para schedulingId=${payload.schedulingId || scheduling._id || 'n/a'}.`,
      );
      return;
    }

    if (!payload.arquivo || !payload.arquivo.length) {
      this.logger.warn(
        `[GDRIVE][SOCGED] Arquivo vazio. Pulando upload ${mode} para schedulingId=${payload.schedulingId || scheduling._id || 'n/a'}.`,
      );
      return;
    }

    try {
      const driveFileId = await this.googleDriveService.uploadFromBuffer(
        payload.nomeArquivo,
        payload.arquivo,
      );
      if (!driveFileId) {
        throw new Error('Google Drive retornou fileId vazio');
      }

      this.logger.log(
        `[GDRIVE][SOCGED] Upload ${mode} concluido | schedulingId=${payload.schedulingId || scheduling._id || 'n/a'} | fileName=${payload.nomeArquivo} | fileId=${driveFileId}`,
      );

      if (mode === 'ASO') {
        await this.mongoService.schedulingsCollection.updateOne(
          { _id: scheduling._id as any },
          {
            $set: {
              'ASOINFO.googleDrive': {
                fileId: driveFileId,
                fileName: payload.nomeArquivo,
                uploadedAt: new Date(),
                pending: false,
                source: 'SOCGED_FALLBACK',
                lastAttemptAt: new Date(),
              },
            },
            $unset: {
              'ASOINFO.googleDrive.pendingAt': '',
              'ASOINFO.googleDrive.lastError': '',
            },
          },
        );
      }
    } catch (error) {
      if (mode === 'ASO') {
        await this.mongoService.schedulingsCollection.updateOne(
          { _id: scheduling._id as any } as any,
          {
            $set: {
              'ASOINFO.googleDrive.pending': false,
              'ASOINFO.googleDrive.lastAttemptAt': new Date(),
              'ASOINFO.googleDrive.lastError':
                error instanceof Error ? error.message : String(error),
            },
            $unset: {
              'ASOINFO.googleDrive.pendingAt': '',
            },
          } as any,
        );
      }
      this.logger.warn(
        `[GDRIVE][SOCGED] Falha no upload ${mode} para schedulingId=${payload.schedulingId || scheduling._id || 'n/a'}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async findSchedulingForUpload(
    payload: UploadSocged,
  ): Promise<SchedulingDocument | null> {
    let scheduling: SchedulingDocument | null = null;

    if (!this.mongoService.schedulingsCollection) {
      this.logger.error(
        '[SOCGED] MongoService nao inicializado (schedulingsCollection indefinida).',
      );
      return null;
    }

    if (payload.schedulingId) {
      try {
        scheduling =
          await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
            {
              _id: new ObjectId(payload.schedulingId),
            },
          );
      } catch {
        scheduling =
          await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
            {
              _id: payload.schedulingId as any,
            },
          );
      }
    }

    if (!scheduling && payload.sequencialFicha) {
      scheduling =
        await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
          {
            SEQUENCIAFICHA: payload.sequencialFicha,
          },
        );
    }

    return scheduling;
  }

  private isComplementarScheduling(scheduling: SchedulingDocument): boolean {
    const entity = new FuncionarioEntity(scheduling);
    return entity.isComplementar() || entity.isComplementarManual();
  }

  private allExamsFinalized(scheduling: SchedulingDocument): boolean {
    const exames = scheduling.EXAMES || [];
    if (!exames.length) return false;
    return exames.every((exam) => exam.status === ExamStatus.FINALIZADO);
  }

  private formatExamDuration(
    scheduling: SchedulingDocument,
    dataExame?: string | Date | null,
  ): string {
    if (!dataExame) return '-';
    const ticketTime = scheduling.TICKET?.updatedAt || scheduling.TICKET?.emissao;
    if (!ticketTime) return '-';

    const start = new Date(ticketTime);
    const end = new Date(dataExame);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return '-';
    }

    const diffMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    if (diffMinutes <= 0) return '-';
    return `${diffMinutes} min`;
  }

  private async enqueueComplementarCompletionEmail(
    scheduling: SchedulingDocument,
  ): Promise<void> {
    if (!this.isComplementarScheduling(scheduling)) {
      return;
    }

    if (!this.allExamsFinalized(scheduling)) {
      this.logger.log(
        `[SOCGED][COMPLEMENTAR][EMAIL] Skip envio: exames ainda nao finalizados para schedulingId=${String(scheduling._id)}`,
      );
      return;
    }

    const acquireLockResult =
      await this.mongoService.schedulingsCollection.updateOne(
        {
          _id: scheduling._id as any,
          'ASOINFO.emailSent': { $ne: true },
        } as any,
        {
          $set: {
            'ASOINFO.emailSent': true,
          },
        } as any,
      );

    if (!acquireLockResult.modifiedCount) {
      this.logger.log(
        `[SOCGED][COMPLEMENTAR][EMAIL] Skip envio: notificacao ja enviada ou em processamento para schedulingId=${String(scheduling._id)}`,
      );
      return;
    }

    try {
      const companyContacts = await this.getCompanyContacts(
        scheduling.CODIGOEMPRESA || '',
      );
      const hasCompanyContacts = !!(
        companyContacts && companyContacts.length > 0
      );

      const forcedRecipient = String(
        process.env.COMPLEMENTAR_RELEASE_FORCE_TO ||
          process.env.ASO_RELEASE_FORCE_TO ||
          '',
      ).trim();

      const asoFallbackTo = String(process.env.ASO_RELEASE_EMAIL_FALLBACK_TO || 'liberacao@cmsocupacional.com.br,tecnologia@cmsocupacional.com.br,esocial@cmsocupacional.com.br,apoio.esocial@cmsocupacional.com.br').trim();
      const targetTo = hasCompanyContacts
        ? companyContacts.join(',')
        : asoFallbackTo;
      const finalTargetTo = forcedRecipient || targetTo;

      const email: EmailType = {
        to: finalTargetTo,
        bcc: String(process.env.COMPLEMENTAR_RELEASE_EMAIL_BCC || 'tecnologia@cmsocupacional.com.br').trim(),
        subject: `CMSO - Exames Finalizados - ${scheduling.NOME} - ${scheduling.NOMEEMPRESA}`,
        templatename: TemplateNames.COMPLEMENTAR_RELEASE,
        attachment: [],
        data: {
          complementarInfo: {
            nomeFuncionario: scheduling.NOME,
            nomeEmpresa: scheduling.NOMEEMPRESA,
            tipoExame: scheduling.TIPOEXAMENOME,
            data: scheduling.DATAAGENDAMENTO,
            chegada: scheduling.TICKET?.emissao ?? undefined,
            unidade: String(
              scheduling.TICKET?.unidade ||
              scheduling.UNIDADEATENDIMENTO ||
              scheduling.NOMEUNIDADE ||
              '',
            ).trim() || undefined,
            cpf: scheduling.CPFFUNCIONARIO || undefined,
            examesRealizados: (scheduling.EXAMES || []).map((ex) => ({
              nomeExame: ex.nomeExame,
              status: ex.status,
              dataExame: ex.dataExame ?? undefined,
              sala: ex.sala,
              profissional: ex.profissional,
              duracao: this.formatExamDuration(scheduling, ex.dataExame),
              url: ex.url,
            })),
          },
        },
      };

      await this.azureService.filaEnvioDeEmail(email);

      await this.mongoService.schedulingsCollection.updateOne(
        { _id: scheduling._id as any } as any,
        {
          $set: {
            'ASOINFO.emailSent': true,
          },
        } as any,
      );

      this.logger.log(
        `[SOCGED][COMPLEMENTAR][EMAIL] Notificacao enfileirada para ${finalTargetTo} | schedulingId=${String(scheduling._id)}`,
      );
    } catch (error) {
      await this.mongoService.schedulingsCollection.updateOne(
        { _id: scheduling._id as any } as any,
        {
          $set: {
            'ASOINFO.emailSent': false,
          },
        } as any,
      );
      throw error;
    }
  }

  private normalizeGroupName(value?: string): string {
    return this.mongoService.normalizeGroupName(value || '');
  }

  private summarizeQueueError(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    return raw.replace(/\s+/g, ' ').trim().slice(0, 500);
  }

  private resolveExamIndex(
    scheduling: SchedulingDocument,
    payload: ResultadoExameSocMessage,
  ): number {
    const explicitExam =
      typeof payload.examIndex === 'number'
        ? scheduling.EXAMES?.[payload.examIndex]
        : null;

    if (explicitExam) {
      return payload.examIndex;
    }

    return (scheduling.EXAMES || []).findIndex((exam) =>
      this.normalizeGroupName(exam.grupo) === this.normalizeGroupName(payload.grupo),
    );
  }

  public async processResultadoExameSocQueueMessage(
    payload: ResultadoExameSocMessage,
  ): Promise<{ deleteMessage: boolean }> {
    const schedulingId = String(payload.schedulingId || '').trim();
    const grupo = String(payload.grupo || '').trim();
    const requestedExamIndex =
      typeof payload.examIndex === 'number' ? payload.examIndex : -1;

    const scheduling = (await this.mongoService.getSchedulingById(
      schedulingId,
    )) as SchedulingDocument | null;

    if (!scheduling) {
      this.logger.warn(
        `[RESULT_SOC_SKIPPED] schedulingId=${schedulingId} grupo=${grupo} examIndex=${requestedExamIndex} reason=SCHEDULING_NOT_FOUND`,
      );
      return { deleteMessage: true };
    }

    const examIndex = this.resolveExamIndex(scheduling, payload);
    if (examIndex < 0) {
      this.logger.warn(
        `[RESULT_SOC_SKIPPED] schedulingId=${schedulingId} grupo=${grupo} examIndex=${requestedExamIndex} sequencialFicha=${scheduling.SEQUENCIAFICHA || 'n/a'} reason=EXAM_NOT_FOUND`,
      );
      return { deleteMessage: true };
    }

    const exam = scheduling.EXAMES?.[examIndex];
    const payloadSequencial = String(payload.sequencialResultadoExame || '').trim();
    const codigoExame = String(
      exam?.codigoExame || payload.codigoExame || '',
    ).trim();

    if (payloadSequencial && (!exam?.sequencialResultadoExame || exam.sequencialResultadoExame === '')) {
      await this.mongoService.schedulingsCollection.updateOne(
        { _id: new ObjectId(scheduling._id), [`EXAMES.${examIndex}.codigoExame`]: codigoExame },
        { $set: { [`EXAMES.${examIndex}.sequencialResultadoExame`]: payloadSequencial } }
      );
      if (exam) {
        exam.sequencialResultadoExame = payloadSequencial;
      }
    }

    let sequencialResultadoExame = String(
      exam?.sequencialResultadoExame || payload.sequencialResultadoExame || '',
    ).trim();

    // Fallback: tentar buscar sequencial da REST API SOC se ainda estiver vazio
    if (!sequencialResultadoExame && codigoExame && scheduling.SEQUENCIAFICHA) {
      try {
        const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro=${JSON.stringify({
          empresa: '16459',
          codigo: '193601',
          chave: '8ce693447b44481c7438',
          tipoSaida: 'json',
          sequencial: scheduling.SEQUENCIAFICHA,
          empresaTrabalho: scheduling.CODIGOEMPRESA,
        })}`;

        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const data = await response.json();
          const match = Array.isArray(data)
            ? data.find((c: any) => String(c.CODIGOEXAME).trim() === codigoExame)
            : null;

          if (match?.SEQUENCIALRESULTADO) {
            const sequencial = String(match.SEQUENCIALRESULTADO).trim();
            await this.mongoService.schedulingsCollection.updateOne(
              { _id: new ObjectId(scheduling._id), [`EXAMES.${examIndex}.codigoExame`]: codigoExame },
              { $set: { [`EXAMES.${examIndex}.sequencialResultadoExame`]: sequencial } },
            );
            sequencialResultadoExame = sequencial;
            if (exam) exam.sequencialResultadoExame = sequencial;
            this.logger.log(
              `[RESULT_SOC_RECOVERED] schedulingId=${schedulingId} examIndex=${examIndex} codigoExame=${codigoExame} sequencialResultadoExame=${sequencial} (recuperado via REST API SOC)`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `[RESULT_SOC_FALLBACK_FAIL] schedulingId=${schedulingId} examIndex=${examIndex} codigoExame=${codigoExame} error=${error?.message || error}`,
        );
      }
    }

    if (!sequencialResultadoExame || !codigoExame) {
      const validationError = [
        !sequencialResultadoExame ? 'sequencialResultadoExame ausente' : null,
        !codigoExame ? 'codigoExame ausente' : null,
      ]
        .filter(Boolean)
        .join('; ');

      this.logger.warn(
        `[RESULT_SOC_SKIPPED] schedulingId=${schedulingId} grupo=${exam?.grupo || grupo} examIndex=${examIndex} sequencialFicha=${scheduling.SEQUENCIAFICHA || 'n/a'} reason=${validationError}`,
      );
      return { deleteMessage: true };
    }

    const examGroup = exam?.grupo || grupo;
    const nomeExame = exam?.nomeExame || 'n/a';
    this.logger.log(
      `[RESULT_SOC_PROCESSING] schedulingId=${schedulingId} grupo=${examGroup} examIndex=${examIndex} codigoExame=${codigoExame} nomeExame=${nomeExame} sequencialFicha=${scheduling.SEQUENCIAFICHA || 'n/a'} sequencialResultadoExame=${sequencialResultadoExame || 'n/a'}`,
    );

    try {
      const result = await WsResultadoExame(scheduling, examIndex);

      this.logger.log(
        `[RESULT_SOC_SUCCESS] schedulingId=${schedulingId} grupo=${examGroup} examIndex=${examIndex} codigoExame=${codigoExame} nomeExame=${nomeExame} sequencialFicha=${scheduling.SEQUENCIAFICHA || 'n/a'} sequencialResultadoExame=${sequencialResultadoExame || 'n/a'} status=${result.status}`,
      );
      if (result.xml) {
        this.logger.log(
          `[RESULT_SOC_XML] schedulingId=${schedulingId} xml=${result.xml.slice(0, 8000)}`,
        );
      }
      if (result.responseText) {
        this.logger.log(
          `[RESULT_SOC_RESPONSE] schedulingId=${schedulingId} response=${result.responseText.slice(0, 5000)}`,
        );
      }

      return { deleteMessage: true };
    } catch (error) {
      const summarizedError = this.summarizeQueueError(error);

      const errorMsg = error instanceof Error ? error.message : String(error);
      const xmlSnippet = (error as any)?.xml || '';
      this.logger.error(
        `[RESULT_SOC_FAILURE] schedulingId=${schedulingId} grupo=${examGroup} examIndex=${examIndex} codigoExame=${codigoExame} nomeExame=${nomeExame} sequencialFicha=${scheduling.SEQUENCIAFICHA || 'n/a'} sequencialResultadoExame=${sequencialResultadoExame || 'n/a'} message=${summarizedError}`,
      );
      if (xmlSnippet) {
        this.logger.error(
          `[RESULT_SOC_FAILURE][XML] schedulingId=${schedulingId} xml=${xmlSnippet.slice(0, 3000)}`,
        );
      }

      throw error;
    }
  }

  async uploadFile(payload: UploadSocged) {
    const TIMEOUT_INICIAL_MS = 30000;
    await this.sleep(TIMEOUT_INICIAL_MS);

    const scheduling = await this.findSchedulingForUpload(payload);
    if (!scheduling) {
      throw new Error('Agendamento nao encontrado para upload SOCGED');
    }

    const entity = new FuncionarioEntity(scheduling);
    if (entity.isCredenciada()) {
      this.logger.log(
        `[SOCGED] Skip upload: Atendimento KIT CREDENCIADA para schedulingId=${payload.schedulingId || scheduling._id || 'n/a'}`,
      );
      return;
    }

    // Fonte de verdade para os identificadores no SOCGED.
    payload.codEmpresa = scheduling.CODIGOEMPRESA;
    payload.codFuncionario = scheduling.CODIGO;
    payload.sequencialFicha = scheduling.SEQUENCIAFICHA;
    payload.codigoGed = payload.codigoGed || '3';

    const isAso = this.isAsoPayload(payload);

    if (isAso) {
      const gedBaseName = this.buildSocgedBaseName('ASO', scheduling);
      const fileBaseName = this.buildSocgedBaseName('ASO', scheduling, {
        includeCompany: true,
      });

      payload.nomeGed = gedBaseName;
      payload.nomeArquivo = this.buildPdfFileName(fileBaseName);

      payload.classificacao = payload.classificacao || 'ASO';
      payload.tipoGed = payload.tipoGed || process.env.CODSOCGED_ASO || '41';
      payload.codigoGed = payload.codigoGed || '';

      if (!payload.arquivo) {
        const asoUrl = this.resolvePreferredAsoUrl({
          payloadUrl: payload.url,
          storedAsoUrl: scheduling.ASOINFO?.url,
          schedulingId: payload.schedulingId,
        });
        if (!asoUrl) {
          throw new Error(
            `URL do ASO indisponivel para upload no SOCGED (schedulingId=${payload.schedulingId || 'n/a'})`,
          );
        }
        payload.url = asoUrl;
        payload.arquivo = await this.azureService.downloadBlob(asoUrl);
      }

      await this.uploadSocgedFileToGoogleDrive({
        scheduling,
        payload,
        mode: 'ASO',
      });
    } else {
      const baseName = this.buildSocgedBaseName('Prontuario', scheduling);
      payload.nomeGed = payload.nomeGed || baseName;
      payload.nomeArquivo = payload.nomeArquivo || `${baseName}.PDF`;
      payload.classificacao = payload.classificacao || 'RESULTADO_EXAME';
      payload.tipoGed = payload.tipoGed || '16';
      payload.codigoGed = payload.codigoGed || '3';

      if (!payload.arquivo) {
        const buffers = await collectExamBuffers(
          scheduling,
          false,
          this.azureService.downloadBlob.bind(this.azureService),
        );

        if (!buffers.length) {
          throw new Error(
            `Nenhum PDF de exame disponivel para merge do prontuario (schedulingId=${payload.schedulingId || 'n/a'})`,
          );
        }

        payload.arquivo = await mergePdfs(buffers);
      }

      await this.uploadSocgedFileToGoogleDrive({
        scheduling,
        payload,
        mode: 'PRONTUARIO',
      });
    }

    await this.socUploadService.uploadFile(payload);

    if (!isAso) {
      try {
        await this.enqueueComplementarCompletionEmail(scheduling);
      } catch (error) {
        this.logger.error(
          `[SOCGED][COMPLEMENTAR][EMAIL] Falha ao enfileirar notificacao para schedulingId=${String(scheduling._id)}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Executa uma função com estratégia de retry.
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delayMs: number = 2000,
  ): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `[withRetry] Tentativa ${i + 1}/${retries} falhou: ${errMsg}. Retentando em ${delayMs}ms...`,
        );
        if (i < retries - 1) {
          await this.sleep(delayMs);
        }
      }
    }
    throw lastError;
  }

  /**
   * Fluxo principal para inativação de funcionários ativos no SOC.
   * Filtra empresas que não contém "VIDA" no código cliente interno.
   * Inativa funcionários (status "INATIVO") com rate limit.
   */
  async inactivateEmployeesFlow(options?: {
    dryRun?: boolean;
    limitCompanies?: number;
  }): Promise<{
    success: boolean;
    message: string;
    totalEmpresas?: number;
    totalInativados?: number;
  }> {
    const dryRun = options?.dryRun ?? false;
    const limitCompanies = options?.limitCompanies;
    const startTime = new Date();

    // Estatísticas para o relatório
    const stats = {
      totalEmpresasAlvo: 0,
      totalEmpresasProcessadas: 0,
      totalFuncionariosEncontrados: 0,
      totalFuncionariosInativados: 0,
      erros: [] as Array<{ company: string; employee?: string; error: string }>,
    };

    try {
      this.logger.log(
        `🚀 [inactivateEmployeesFlow] Iniciando fluxo de inativação (dryRun=${dryRun}, limit=${limitCompanies ?? 'N/A'})...`,
      );

      const empresas = await this.socCompanyService.getCompaniesRegister();

      // Filtra empresas que não contém "VIDA" no CÓD. CLIENTE (INT.)
      let empresasAlvo = empresas
        .filter((empresa) => {
          const codClienteInt = empresa['CÓD. CLIENTE (INT.)'] || '';
          const isVida = codClienteInt.toUpperCase().includes('VIDA');
          return !isVida;
        })
        .sort((a, b) =>
          (a.RAZAOSOCIAL || '').localeCompare(b.RAZAOSOCIAL || ''),
        );

      if (limitCompanies && limitCompanies > 0) {
        this.logger.log(
          `[inactivateEmployeesFlow] Limitando processamento para as primeiras ${limitCompanies} empresas.`,
        );
        empresasAlvo = empresasAlvo.slice(0, limitCompanies);
      }

      stats.totalEmpresasAlvo = empresasAlvo.length;
      this.logger.log(
        `[inactivateEmployeesFlow] Encontradas ${empresasAlvo.length} empresas alvo.`,
      );

      for (const empresa of empresasAlvo) {
        try {
          this.logger.log(
            `[inactivateEmployeesFlow] Processando empresa: ${empresa.RAZAOSOCIAL} (${empresa.CODIGO})`,
          );

          // Busca funcionários ativos/afastados etc. com RETRY
          const funcionarios = await this.withRetry(() =>
            this.socExportService.EdCadastroFuncionariosPorSituacao(
              empresa.CODIGO,
              { inativo: 'Não' },
            ),
          );

          if (funcionarios.length === 0) {
            this.logger.log(
              `[inactivateEmployeesFlow] Nenhum funcionário ativo encontrado para empresa ${empresa.CODIGO}`,
            );
            stats.totalEmpresasProcessadas++;
            continue;
          }

          stats.totalFuncionariosEncontrados += funcionarios.length;
          this.logger.log(
            `[inactivateEmployeesFlow] Encontrados ${funcionarios.length} funcionários para inativação em ${empresa.RAZAOSOCIAL}`,
          );

          if (dryRun) {
            this.logger.log(
              `[inactivateEmployeesFlow][DRY-RUN] Exemplo de funcionário que seria inativado: ${funcionarios[0].NOME}`,
            );
            stats.totalEmpresasProcessadas++;
            continue;
          }

          for (const funcionario of funcionarios) {
            try {
              this.logger.log(
                `[inactivateEmployeesFlow] Inativando funcionário: ${funcionario.NOME} (${funcionario.CODIGO})`,
              );

              // Inativa o funcionário com RETRY
              await this.withRetry(() =>
                WsFuncionarioModelo2(funcionario, 'INATIVO'),
              );
              stats.totalFuncionariosInativados++;

              // Rate limit entre 100ms e 800ms
              const delay = Math.floor(Math.random() * (800 - 100 + 1)) + 100;
              await this.sleep(delay);
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              this.logger.error(
                `[inactivateEmployeesFlow] Erro fatal ao inativar funcionário ${funcionario.CODIGO} (${funcionario.NOME}): ${errMsg}`,
              );
              stats.erros.push({
                company: empresa.RAZAOSOCIAL,
                employee: `${funcionario.NOME} (${funcionario.CODIGO})`,
                error: errMsg,
              });
            }
          }

          stats.totalEmpresasProcessadas++;
        } catch (empresaError) {
          const errMsg =
            empresaError instanceof Error
              ? empresaError.message
              : String(empresaError);
          this.logger.error(
            `[inactivateEmployeesFlow] Erro crítico processando empresa ${empresa.CODIGO}: ${errMsg}`,
          );
          stats.erros.push({
            company: empresa.RAZAOSOCIAL,
            error: errMsg,
          });
        }
      }

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      // Envia relatório por e-mail
      await this.sendInactivationReport(stats, startTime, endTime);

      return {
        success: true,
        message: `${dryRun ? 'Dry run' : 'Fluxo'} concluído com sucesso em ${durationMs}ms`,
        totalEmpresas: stats.totalEmpresasProcessadas,
        totalInativados: stats.totalFuncionariosInativados,
      };
    } catch (error) {
      this.logger.error(
        '❌ [inactivateEmployeesFlow] Erro crítico no fluxo de inativação:',
        error,
      );
      return { success: false, message: `Erro: ${error.message}` };
    }
  }

  /**
   * Gera e envia o relatório de inativação por e-mail.
   */
  private async sendInactivationReport(
    stats: any,
    startTime: Date,
    endTime: Date,
  ) {
    const recipients = String(process.env.INATIVACAO_REPORT_EMAIL_TO || 'tecnologia@cmsocupacional.com.br,draandrea@cmsocupacional.com.br,esocial@cmsocupacional.com.br,enfermagem@cmsocupacional.com.br,anagerucia@cmsocupacional.com.br').trim();
    const durationMin = (
      (endTime.getTime() - startTime.getTime()) /
      60000
    ).toFixed(2);

    const errorRows =
      stats.erros.length > 0
        ? stats.erros
            .map(
              (e) => `
        <tr>
          <td style="border-bottom: 1px solid #fee2e2; padding: 10px; font-size: 13px; color: #b91c1c;">${e.company}</td>
          <td style="border-bottom: 1px solid #fee2e2; padding: 10px; font-size: 13px; color: #b91c1c;">${e.employee || '-'}</td>
          <td style="border-bottom: 1px solid #fee2e2; padding: 10px; font-size: 13px; color: #b91c1c;">${e.error}</td>
        </tr>`,
            )
            .join('')
        : '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #64748b;">Nenhum erro registrado</td></tr>';

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; color: #334155; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 22px;">Relatório de Inativação SOC</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">CMSO 360 - Automático</p>
        </div>
        
        <div style="padding: 25px; background-color: #fff;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div><strong>Início:</strong> ${startTime.toLocaleString('pt-BR')}</div>
            <div><strong>Fim:</strong> ${endTime.toLocaleString('pt-BR')}</div>
            <div><strong>Duração:</strong> ${durationMin} min</div>
            <div><strong>Empresas Alvo:</strong> ${stats.totalEmpresasAlvo}</div>
            <div><strong>Empresas Processadas:</strong> ${stats.totalEmpresasProcessadas}</div>
            <div><strong>Funcionários Encontrados:</strong> ${stats.totalFuncionariosEncontrados}</div>
            <div style="color: #15803d; font-weight: 700;"><strong>Sucessos:</strong> ${stats.totalFuncionariosInativados}</div>
            <div style="color: #b91c1c; font-weight: 700;"><strong>Erros:</strong> ${stats.erros.length}</div>
          </div>

          <h3 style="color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px;">Detalhamento de Erros</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 10px; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">Empresa</th>
                <th style="padding: 10px; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">Funcionário</th>
                <th style="padding: 10px; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">Mensagem de Erro</th>
              </tr>
            </thead>
            <tbody>
              ${errorRows}
            </tbody>
          </table>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; text-align: center;">
            Este é um e-mail automático gerado pelo CMSO 360 Backend.<br>
            Não responda a este e-mail.
          </div>
        </div>
      </div>
    `;

    try {
      await this.emailService.sendEmail({
        to: recipients.split(',').map((r) => r.trim()),
        subject: `[Relatório] Inativação SOC - ${stats.totalFuncionariosInativados} inativados - ${endTime.toLocaleDateString('pt-BR')}`,
        template: html,
        templatename: 'CUSTOM_REPORT', // Nome genérico para não bater em templates existentes no worker
        attachment: [],
      });
      this.logger.log(
        `[inactivateEmployeesFlow] Relatório de e-mail enviado para: ${recipients}`,
      );
    } catch (error) {
      this.logger.error(
        `[inactivateEmployeesFlow] Falha ao enviar e-mail de relatório: ${error.message}`,
      );
    }
  }
}
