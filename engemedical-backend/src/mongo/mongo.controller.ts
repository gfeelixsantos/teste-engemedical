import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  Logger,
  Headers,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { MongoService } from './mongo.service';
import {
  AsoInfo,
  DeleteRequestBody,
  ExamDeleteBody,
  ExamUpdateDto,
  FilterParams,
  FinishSchedulingDto,
  GedArquivoNode,
  GedDiaNode,
  GedEmpresaNode,
  GedPeriodoNode,
  GedProntuarioNode,
  PaginatedReportData,
  RemoveAnexoBody,
  ReissueRequest,
  SchedulingDocument,
  UpdateAnexoDto,
} from './types/scheduling';
import {
  AsoStatus,
  AtendimentoStatus,
  ExamStatus,
} from './enum/scheduling.enum';
import { AzureService } from 'src/azure/azure.service';
import { ObjectId } from 'mongodb';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  encontrarGrupoPorCodigo,
  getExamGroupAndItemByCodigo,
  getExamGroupAndItemByCodigoAsync,
  mapCadastroPessoasToUserInfo,
  mergePdfs,
} from 'src/utils/util';
import { hasMeaningfulExamFormData } from 'src/core/exam-form.validation';
import { FuncionarioEntity } from './model/FuncionarioEntity';
import { SocService } from 'src/soc/soc.service';
import { StatisticsService } from './statistics.service';
import { Request, Response } from 'express';
import { IUserInfo } from 'src/user/interfaces/user.interface';
import { getExamesList } from 'src/exames/exames.provider';
import {
  hasProfessionalMismatch,
  parseAuthUserHeader,
} from 'src/core/professional-identity.resolver';
import { JwtAuthGuard } from 'src/soc/guards/jwt-auth.guard';
import { AuditLogInterceptor } from 'src/audit-log/audit-log.interceptor';
import {
  buildAttachmentDeletionSnapshot,
  buildSchedulingDeletionSnapshot,
} from './deletion-snapshot';

@Controller('schedulings')
export class MongoController {
  private readonly logger = new Logger(MongoController.name);

  private createCriticalDeleteRequestId(): string {
    return `engemedical-connect_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private requireReauthenticatedUser(req: Request): IUserInfo {
    const authUser = parseAuthUserHeader(req.headers['x-auth-user']);
    const reauthenticatedHeader = String(
      req.headers['x-reauthenticated'] || '',
    ).trim();

    if (!authUser) {
      throw new UnauthorizedException('Usuario autenticado nao informado.');
    }

    if (reauthenticatedHeader !== 'true') {
      throw new UnauthorizedException('Reautenticacao obrigatoria.');
    }

    (req as Request & { user?: IUserInfo }).user = authUser;

    return authUser;
  }

  private requireDeleteReason(motivo?: string): string {
    const normalized = String(motivo || '').trim();

    if (!normalized) {
      throw new BadRequestException('Motivo da exclusao e obrigatorio.');
    }

    return normalized;
  }

  private resolveTrackedRequestId(req: Request, fallback?: string): string {
    return (
      String(req.headers['x-request-id'] || '').trim() ||
      String(fallback || '').trim() ||
      this.createCriticalDeleteRequestId()
    );
  }

  private applyAuditDeleteContext(
    req: Request,
    params: {
      recursoTipo: 'atendimento' | 'anexo';
      recursoId: string;
      pacienteCodigo?: string;
      pacienteNome?: string;
      unidade?: string;
      requestId: string;
      motivo: string;
      snapshotId: string;
      snapshotHash: string;
    },
  ) {
    (
      req as Request & {
        auditLogContext?: Record<string, unknown>;
      }
    ).auditLogContext = {
      recursoId: params.recursoId,
      recursoTipo: params.recursoTipo,
      pacienteCodigo: params.pacienteCodigo,
      pacienteNome: params.pacienteNome,
      unidade: params.unidade,
      requestId: params.requestId,
      detalhes: {
        motivo: params.motivo,
        reautenticado: true,
        snapshotId: params.snapshotId,
        snapshotHash: params.snapshotHash,
      },
    };
  }

  private normalizeExamGroup(value?: string) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private isExamUrlFromCurrentProntuario(url?: string, prontuario?: string) {
    const normalizedUrl = String(url || '')
      .trim()
      .toLowerCase();
    const normalizedProntuario = String(prontuario || '')
      .trim()
      .toLowerCase();

    if (!normalizedUrl || !normalizedProntuario) {
      return false;
    }

    return normalizedUrl.includes(`/${normalizedProntuario}/`);
  }

  private getExamGroupConfig(grupo?: string) {
    const normalizedGroup = this.normalizeExamGroup(grupo);
    const matchedKey = Object.keys(getExamesList()).find(
      (key) => this.normalizeExamGroup(key) === normalizedGroup,
    );

    return matchedKey ? getExamesList()[matchedKey]?.[0] : undefined;
  }

  private async buildExamReissueData(params: {
    schedule: SchedulingDocument;
    funcionarioId: string;
    codigoExame: string;
    credentials?: any;
  }): Promise<ExamUpdateDto> {
    const { schedule, funcionarioId, codigoExame, credentials } = params;

    const exameToReissue = schedule.EXAMES.find(
      (ex) => ex.codigoExame === codigoExame,
    );

    if (!exameToReissue) {
      this.logger.warn(
        '[REISSUE][VALIDATION] Exame nao encontrado. funcionarioId=' +
          funcionarioId +
          ' codigoExame=' +
          codigoExame,
      );
      throw new BadRequestException('Exame solicitado não encontrado.');
    }

    const snapshotFallbackNeeded =
      !String(exameToReissue.sala || '').trim() ||
      !hasMeaningfulExamFormData(exameToReissue.formulario);

    const snapshotFallback = snapshotFallbackNeeded
      ? await this.mongoService.findLatestMatchingExamFormSnapshot({
          schedulingId: funcionarioId,
          codigoExame,
          grupo: exameToReissue.grupo,
        })
      : null;

    const effectiveSala =
      String(exameToReissue.sala || '').trim() || snapshotFallback?.sala || '';
    const effectiveFormulario = hasMeaningfulExamFormData(
      exameToReissue.formulario,
    )
      ? exameToReissue.formulario
      : snapshotFallback?.formulario;

    if (!effectiveFormulario) {
      this.logger.warn(
        '[REISSUE][VALIDATION] Sem formulario nem snapshot. funcionarioId=' +
          funcionarioId +
          ' codigoExame=' +
          codigoExame,
      );
      throw new BadRequestException(
        'Informações para reemissão não autorizadas.',
      );
    }

    const codigoProfissional = String(
      exameToReissue.codigoProfissional ||
        snapshotFallback?.profissional?.codigo ||
        snapshotFallback?.authUser?.codigo ||
        '',
    ).trim();

    let userInfo: IUserInfo | null = null;

    try {
      const pessoasSoc = await this.socService.EdCadastroPessoas();
      const user = pessoasSoc?.find(
        (p) => String(p.CODIGO).trim() === codigoProfissional,
      );

      if (user) {
        userInfo = mapCadastroPessoasToUserInfo(user);
      }
    } catch (error) {
      this.logger.warn(
        'Falha ao buscar profissional no SOC durante reemissão (' +
          codigoProfissional +
          '): ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }

    if (!userInfo && codigoProfissional && exameToReissue.profissional) {
      userInfo = {
        codigo: codigoProfissional,
        nome: exameToReissue.profissional,
        cpf: '',
        perfil: '',
        conselho: '',
        ufconselho: '',
      };

      this.logger.warn(
        'Reemissão usando fallback do exame para profissional ' +
          codigoProfissional +
          ' (' +
          exameToReissue.profissional +
          ').',
      );
    }

    if (!userInfo && snapshotFallback?.profissional?.codigo) {
      userInfo = {
        codigo: String(snapshotFallback.profissional.codigo || '').trim(),
        nome: snapshotFallback.profissional.nome || '',
        cpf: snapshotFallback.profissional.cpf || '',
        perfil: snapshotFallback.profissional.perfil || '',
        conselho: '',
        ufconselho: '',
      };

      this.logger.warn(
        'Reemissão usando fallback do snapshot para profissional ' +
          userInfo.codigo +
          ' (' +
          userInfo.nome +
          ').',
      );
    }

    if (!userInfo && snapshotFallback?.authUser?.codigo) {
      userInfo = {
        codigo: String(snapshotFallback.authUser.codigo || '').trim(),
        nome: snapshotFallback.authUser.nome || '',
        cpf: snapshotFallback.authUser.cpf || '',
        perfil: snapshotFallback.authUser.perfil || '',
        conselho: '',
        ufconselho: '',
      };

      this.logger.warn(
        'Reemissão usando fallback do authUser do snapshot para profissional ' +
          userInfo.codigo +
          ' (' +
          userInfo.nome +
          ').',
      );
    }

    if (!userInfo) {
      this.logger.warn(
        '[REISSUE][VALIDATION] Profissional indisponivel. funcionarioId=' +
          funcionarioId +
          ' codigoExame=' +
          codigoExame +
          ' codigoProfissional=' +
          codigoProfissional,
      );
      throw new BadRequestException('Informações incompletas para reemissão.');
    }

    return {
      codigoExame: [codigoExame],
      formulario: effectiveFormulario,
      funcionarioId,
      profissional: userInfo,
      sala: effectiveSala,
      isEditing: true,
      dataExame: exameToReissue.dataExame || snapshotFallback?.dataExame,
      credentials,
    };
  }

  constructor(
    private readonly mongoService: MongoService,
    private readonly statisticsService: StatisticsService,
    private readonly azureService: AzureService,
    private readonly socService: SocService,
  ) {}

  /**
   *
   * @returns dados informativos do dashboard
   */
  @Get('/dashboard')
  async getDashboardData() {
    const dashboardData = await this.mongoService.getDashboardStats();

    if (!dashboardData) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Erro ao obter dados do dashboard',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return dashboardData;
  }

  @Get('/today')
  async getAllToday() {
    const schedulings = await this.mongoService.getSchedulingsToday();

    if (schedulings.length === 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Nenhum agendamento encontrado para esta data',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return schedulings;
  }

  @Get('/record-params')
  async getMedicalRecordParams() {
    const recordParams = await this.mongoService.getRecordParams();
    if (!recordParams) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Erro ao obter parâmetros para filtro de prontuários',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return recordParams;
  }

  @Get('/ged/empresas')
  async listGedEmpresas(): Promise<GedEmpresaNode[]> {
    return this.mongoService.listGedEmpresas();
  }

  @Get('/ged/periodos')
  async listGedPeriodos(
    @Query('codigoEmpresa') codigoEmpresa?: string,
  ): Promise<GedPeriodoNode[]> {
    if (!codigoEmpresa?.trim()) {
      throw new BadRequestException(
        'Parametro codigoEmpresa e obrigatorio.',
      );
    }

    return this.mongoService.listGedPeriodos(codigoEmpresa.trim());
  }

  @Get('/ged/dias')
  async listGedDias(
    @Query('codigoEmpresa') codigoEmpresa?: string,
    @Query('ano') ano?: string,
    @Query('mes') mes?: string,
  ): Promise<GedDiaNode[]> {
    if (!codigoEmpresa?.trim()) {
      throw new BadRequestException(
        'Parametro codigoEmpresa e obrigatorio.',
      );
    }

    if (!ano?.trim()) {
      throw new BadRequestException('Parametro ano e obrigatorio.');
    }

    if (!mes?.trim()) {
      throw new BadRequestException('Parametro mes e obrigatorio.');
    }

    return this.mongoService.listGedDias({
      codigoEmpresa: codigoEmpresa.trim(),
      ano: ano.trim(),
      mes: mes.trim(),
    });
  }

  @Get('/ged/prontuarios')
  async listGedProntuarios(
    @Query('codigoEmpresa') codigoEmpresa?: string,
    @Query('ano') ano?: string,
    @Query('mes') mes?: string,
    @Query('dia') dia?: string,
  ): Promise<GedProntuarioNode[]> {
    if (!codigoEmpresa?.trim()) {
      throw new BadRequestException(
        'Parametro codigoEmpresa e obrigatorio.',
      );
    }

    if (!ano?.trim()) {
      throw new BadRequestException('Parametro ano e obrigatorio.');
    }

    if (!mes?.trim()) {
      throw new BadRequestException('Parametro mes e obrigatorio.');
    }

    return this.mongoService.listGedProntuarios({
      codigoEmpresa: codigoEmpresa.trim(),
      ano: ano.trim(),
      mes: mes.trim(),
      dia: dia?.trim() || undefined,
    });
  }

  @Get('/ged/arquivos')
  async listGedArquivos(
    @Query('codigoEmpresa') codigoEmpresa?: string,
    @Query('ano') ano?: string,
    @Query('mes') mes?: string,
    @Query('codigoProntuario') codigoProntuario?: string,
  ): Promise<GedArquivoNode[]> {
    if (!codigoEmpresa?.trim()) {
      throw new BadRequestException(
        'Parametro codigoEmpresa e obrigatorio.',
      );
    }

    if (!ano?.trim()) {
      throw new BadRequestException('Parametro ano e obrigatorio.');
    }

    if (!mes?.trim()) {
      throw new BadRequestException('Parametro mes e obrigatorio.');
    }

    if (!codigoProntuario?.trim()) {
      throw new BadRequestException(
        'Parametro codigoProntuario e obrigatorio.',
      );
    }

    return this.mongoService.listGedArquivos({
      codigoEmpresa: codigoEmpresa.trim(),
      ano: ano.trim(),
      mes: mes.trim(),
      codigoProntuario: codigoProntuario.trim(),
    });
  }

  @Get('/records')
  async getMedicalRecords(
    @Query('status') status: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @Query('empresa') empresa?: string,
    @Query('medico') medico?: string,
  ) {
    console.log(
      `Filtros recebidos - status: ${status}, empresa: ${empresa}, medico: ${medico}`,
    );
    const records = await this.mongoService.findSchedulingsWithFilters(
      status,
      page,
      limit,
      empresa,
      medico,
    );

    if (!records) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Nenhum registro de agendamento encontrado para os filtros',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return records;
  }

  @Get('/report-params')
  async getReportParams() {
    const reportParams = await this.mongoService.getReportFilterParameters();
    if (!reportParams) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Erro ao obter parâmetros para filtro de relatórios',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return reportParams;
  }

  @Get('/report-filters')
  async getReportWithFilters(
    @Query() filters: FilterParams,
  ): Promise<PaginatedReportData> {
    const reportData = await this.mongoService.getReportData(filters);
    if (!reportData) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Não há filtros para obter resultados.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return reportData;
  }

  @Get('/report/:id')
  async getReportScheduling(
    @Param('id') id: string,
  ): Promise<SchedulingDocument> {
    if (!id) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Identificador é obrigatório para ver detalhes.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.mongoService.getSchedulingForModal(id);
  }

  @Post('/csv-download')
  async downloadCsv() {
    throw new HttpException(
      {
        status: HttpStatus.GONE,
        error:
          'Exportação CSV temporariamente indisponível para garantir consistência do relatório.',
      },
      HttpStatus.GONE,
    );
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditLogInterceptor)
  @Get('/prontuario/:id')
  async getFullMedicalReport(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!id) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Identificador é obrigatório visualização do prontuário.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.warn(
      '[AUDIT][PRONTUARIO_MERGE] schedulingId=' +
        id +
        ' ip=' +
        (req?.ip || 'n/a') +
        ' ua=' +
        (req?.headers?.['user-agent'] || 'n/a'),
    );

    const { buffer, fileName } =
      await this.mongoService.createUrlViewFullMedicalRecord(id, true);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-store');

    return res.send(buffer);
  }

  @Delete('delete')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditLogInterceptor)
  async deleteScheduleRequest(
    @Body() request: DeleteRequestBody,
    @Req() req: Request,
  ) {
    const { schedulingId } = request;
    const motivo = this.requireDeleteReason(request.motivo);
    const authUser = this.requireReauthenticatedUser(req);
    const requestId = this.resolveTrackedRequestId(req, request.requestId);

    if (!schedulingId) {
      throw new BadRequestException('schedulingId e obrigatorio');
    }

    const document =
      await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
        {
          _id: new ObjectId(schedulingId),
        },
      );

    if (!document) {
      throw new NotFoundException('Agendamento nao encontrado');
    }

    const snapshot = buildSchedulingDeletionSnapshot({
      requestId,
      motivo,
      actor: authUser,
      document,
    });

    await this.mongoService.saveDeletionSnapshot(snapshot);
    this.applyAuditDeleteContext(req, {
      recursoTipo: 'atendimento',
      recursoId: String(document._id || ''),
      pacienteCodigo: String(document.CODIGO || ''),
      pacienteNome: String(document.NOME || ''),
      unidade: String(document.UNIDADEATENDIMENTO || ''),
      requestId,
      motivo,
      snapshotId: snapshot.snapshotId,
      snapshotHash: snapshot.snapshotHash,
    });

    const success =
      await this.mongoService.handleSchedulingDeleteNotification(document);

    if (!success) {
      throw new InternalServerErrorException('Falha ao excluir atendimento.');
    }

    return {
      success: true,
      requestId,
      snapshotId: snapshot.snapshotId,
    };
  }

  /**
   * Rota responsável por realizar a exclusão do anexo vinculado ao exame
   * @param request schedulingId: id documento funcionário, codigoExame: anexo exame a ser removido
   * @returns
   */
  @Post('delete-attachment')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditLogInterceptor)
  async deleteExamResultUpload(
    @Body() request: ExamDeleteBody,
    @Req() req: Request,
  ) {
    try {
      const { schedulingId, codigoExame, grupo } = request;
      const motivo = this.requireDeleteReason(request.motivo);
      const authUser = this.requireReauthenticatedUser(req);
      const requestId = this.resolveTrackedRequestId(req, request.requestId);

      if (!schedulingId || !codigoExame || !grupo) {
        throw new BadRequestException(
          'Parametros enviados nao sao validos para exclusao.',
        );
      }

      const funcionarioDoc =
        await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
          { _id: new ObjectId(schedulingId) },
        );

      if (!funcionarioDoc) {
        throw new NotFoundException('Agendamento nao encontrado');
      }

      const funcionario = new FuncionarioEntity(funcionarioDoc);
      const examReference = funcionarioDoc.EXAMES.find(
        (exam) => exam.codigoExame === codigoExame || exam.grupo === grupo,
      );

      const snapshot = buildAttachmentDeletionSnapshot({
        requestId,
        motivo,
        actor: authUser,
        document: funcionarioDoc,
        recursoId: codigoExame,
        exam: examReference ?? null,
      });

      await this.mongoService.saveDeletionSnapshot(snapshot);
      this.applyAuditDeleteContext(req, {
        recursoTipo: 'anexo',
        recursoId: codigoExame,
        pacienteCodigo: String(funcionarioDoc.CODIGO || ''),
        pacienteNome: String(funcionarioDoc.NOME || ''),
        unidade: String(funcionarioDoc.UNIDADEATENDIMENTO || ''),
        requestId,
        motivo,
        snapshotId: snapshot.snapshotId,
        snapshotHash: snapshot.snapshotHash,
      });

      const raw = funcionario.getRaw();
      const exames = raw.EXAMES;
      const indices: number[] = [];
      for (let i = 0; i < exames.length; i++) {
        if (exames[i].grupo === grupo) {
          indices.push(i);
        }
      }

      if (indices.length === 0) {
        throw new NotFoundException(`Exame ${grupo} nao encontrado`);
      }

      let mudouAlgo = false;

      for (const idx of indices) {
        const ex = exames[idx];
        ex.url = '';
        ex.status = funcionario.getStatusAfterRemovingResult(ex);
        mudouAlgo = true;
      }

      if (!mudouAlgo) {
        return {
          success: true,
          message: 'Nenhum exame possuia arquivo para remover',
          scheduling: raw,
          requestId,
          snapshotId: snapshot.snapshotId,
        };
      }

      const previousStatus =
        funcionarioDoc.ATENDIMENTOSTATUS as AtendimentoStatus;
      funcionario.updateAtendimentoStatus(previousStatus);

      const result = await this.mongoService.updateFullDocument(
        funcionario.getRaw(),
      );

      if (!result) {
        throw new InternalServerErrorException(
          'Falha ao salvar alteracoes no banco de dados',
        );
      }

      return {
        success: true,
        message: 'Exames do grupo removidos com sucesso',
        scheduling: result,
        requestId,
        snapshotId: snapshot.snapshotId,
      };
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }

      throw new InternalServerErrorException(
        'Erro ao processar exclusao do anexo',
      );
    }
  }

  /**
   * Rota que recebe agendamento e anexos da recepção para atualizar o agendamento no MongoDB
   * Aqui faz a atualização para disponibilizar atendimento as salas
   */
  @Post('/update')
  @UseInterceptors(FilesInterceptor('files'))
  async updateScheduling(
    @Body('scheduling') raw: string,
    @Body('somentepa') somentepaRaw: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // 1. Parsing seguro
    let scheduling: SchedulingDocument;
    const somentepa = somentepaRaw === true || somentepaRaw === 'true';

    try {
      scheduling = JSON.parse(raw);
    } catch (e) {
      throw new BadRequestException('JSON inválido no campo "scheduling".');
    }

    // 2. Encapsula regras de negócio no domínio
    const funcionario = new FuncionarioEntity(scheduling);

    funcionario.setAtendimentoStatus(AtendimentoStatus.EM_ATENDIMENTO);
    funcionario.setHorarioAtual();
    funcionario.addTriagemSeNecessario();
    funcionario.aplicarSomentePa(somentepa);

    if (
      !funcionario.getRaw().ASOINFO ||
      typeof funcionario.getRaw().ASOINFO !== 'object'
    ) {
      funcionario.setAsoInfo({
        status: null as any,
        url: null,
        validacao: null,
        updatedAt: new Date(),
        emailSent: false,
        signature: {
          retry: {
            pending: false,
            count: 0,
          },
        } as any,
      } as any);
    }

    if (!funcionario.getRaw().ASOSTATUS) {
      funcionario.getRaw().ASOSTATUS = AsoStatus.NAO_GERADO;
    }

    const isPcd = await this.socService.verifyPcdStatus(
      funcionario.getRaw().CODIGO,
      funcionario.getRaw().CODIGOEMPRESA,
    );
    if (isPcd && isPcd !== null) {
      if (funcionario.getRaw().ANOTACOES != null) {
        funcionario.getRaw().ANOTACOES += `\nFuncionário PCD: ${isPcd}`;
      } else {
        funcionario.getRaw().ANOTACOES = `\nFuncionário PCD: ${isPcd}`;
      }
    }

    // 3. Upload (se houver)
    if (files?.length) {
      scheduling = await this.azureService.updateFile(scheduling, files);
    }

    // 4. Pelo updateFullDocument se for somente PA deve ser retirada do documento do mongo.
    if (somentepa) {
      await this.mongoService.schedulingsCollection.updateOne(
        { _id: new ObjectId(funcionario.getRaw()._id) },
        {
          $pull: {
            EXAMES: { grupo: { $in: ['Exame Clínico', 'Exame Clinico'] } } as any,
          },
        },
      );
    }

    // 5. Atualização no Mongo
    return await this.mongoService.updateFullDocument(funcionario.getRaw());
  }

  /**
   * Rota que atualiza um exame específico (ou grupo inteiro)
   * Aplica regras de negócio conforme necessário
   * Envia para Azure Queue se aplicável
   */
  @Post('/exame/update')
  async updateExamController(
    @Body() payload: ExamUpdateDto,
    @Req() req: Request,
  ) {
    const authUser = parseAuthUserHeader(req.headers['x-auth-user']);

    if (hasProfessionalMismatch(authUser, payload.profissional)) {
      this.logger.warn(
        `[IDENTITY_AUTH_BODY_MISMATCH] route=/schedulings/exame/update auth=${authUser?.codigo || 'n/a'} body=${payload.profissional?.codigo || 'n/a'}`,
      );
    }

    return await this.mongoService.updateExam(payload, authUser);
  }

  /**
   * Rota responsável por reemitir um exame já realizado
   * mantendo os mesmos dados do exame.
   * @param payload dados de reemissão de exame
   * @returns
   */
  @Post('/exame/reissue')
  async reissueExamRequest(@Body() payload: ReissueRequest) {
    const { funcionarioId, codigoExame } = payload;
    this.logger.log(
      '[REISSUE][IN] funcionarioId=' +
        (funcionarioId || 'n/a') +
        ' codigoExame=' +
        (codigoExame || 'n/a'),
    );

    if (!funcionarioId || !codigoExame) {
      this.logger.warn('[REISSUE][VALIDATION] Payload incompleto.');
      throw new BadRequestException('Informações de reemissão incompletas.');
    }

    const schedule =
      await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
        {
          _id: new ObjectId(funcionarioId),
        },
      );

    if (!schedule) {
      this.logger.warn(
        '[REISSUE][VALIDATION] Agendamento nao encontrado: ' + funcionarioId,
      );
      throw new NotFoundException('Agendamento não encontrado.');
    }

    const data = await this.buildExamReissueData({
      schedule,
      funcionarioId,
      codigoExame,
      credentials: payload.credentials,
    });

    this.logger.log(
      '[REISSUE] Reemitindo exame ' +
        codigoExame +
        ' para funcionário ' +
        funcionarioId +
        ' (profissional ' +
        (data.profissional?.codigo || 'n/a') +
        ' - Assinatura: ' +
        (payload.credentials?.pin ? 'Sim' : 'Não') +
        ').',
    );

    return await this.mongoService.updateExam(data);
  }

  @Post('upload-anexo')
  @UseInterceptors(FilesInterceptor('files'))
  async updateAnexoController(
    @Body() payload: UpdateAnexoDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!payload.schedulingId) {
      throw new BadRequestException('ID do agendamento não fornecido');
    }

    try {
      const result = await this.mongoService.updateAnexo(
        payload.schedulingId,
        files,
        payload.origin,
      );

      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao realizar upload do anexo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('remove-anexo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditLogInterceptor)
  async removeAnexoController(
    @Body() request: RemoveAnexoBody,
    @Req() req: Request,
  ) {
    const { schedulingId, fileName } = request;
    const motivo = this.requireDeleteReason(request.motivo);
    const authUser = this.requireReauthenticatedUser(req);
    const requestId = this.resolveTrackedRequestId(req, request.requestId);

    if (!schedulingId || !fileName) {
      throw new BadRequestException('Dados incompletos para remover o anexo');
    }

    try {
      const document =
        await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
          { _id: new ObjectId(schedulingId) },
        );

      if (!document) {
        throw new NotFoundException('Agendamento nao encontrado');
      }

      const fileReference = (document.ANEXOS || []).find(
        (anexo) => anexo.Name === fileName,
      );

      if (!fileReference) {
        throw new NotFoundException('Anexo nao encontrado ou ja removido');
      }

      const snapshot = buildAttachmentDeletionSnapshot({
        requestId,
        motivo,
        actor: authUser,
        document,
        recursoId: fileName,
        file: fileReference,
      });

      await this.mongoService.saveDeletionSnapshot(snapshot);
      this.applyAuditDeleteContext(req, {
        recursoTipo: 'anexo',
        recursoId: fileName,
        pacienteCodigo: String(document.CODIGO || ''),
        pacienteNome: String(document.NOME || ''),
        unidade: String(document.UNIDADEATENDIMENTO || ''),
        requestId,
        motivo,
        snapshotId: snapshot.snapshotId,
        snapshotHash: snapshot.snapshotHash,
      });

      const result = await this.mongoService.removeAnexo(
        schedulingId,
        fileName,
      );

      return {
        ...(result as Record<string, unknown>),
        requestId,
        snapshotId: snapshot.snapshotId,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Erro ao remover anexo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ========================  ROTAS PARA SEREM OTIMIZADAS ======================== //
  /**
   * Rota para anexar resultado de exame em PDF ao agendamento no MongoDB
   * Encaminha para Azure Storage e atualiza o agendamento com o link do arquivo
   */
  @Post('/update/resultadoexame')
  @UseInterceptors(FilesInterceptor('files'))
  async updateExamWithPdf(
    @Body('schedulingid') id: string,
    @Body('grupo') grupo: string,
    @Body('codigoExame') codigoExame: string,
    @Req() req: Request,
    @UploadedFiles() uploadedFiles: Express.Multer.File[],
  ) {
    if (
      id &&
      typeof id === 'object' &&
      Array.isArray((id as any).files) &&
      typeof grupo === 'string' &&
      typeof codigoExame === 'string'
    ) {
      const legacyPayload = id as any;
      const legacySchedulingId = grupo;
      const legacyGrupo = codigoExame;
      const legacyCodigoExame = req as any;
      uploadedFiles = legacyPayload.files;
      req = { ip: 'n/a', headers: {} } as Request;
      id = legacySchedulingId;
      grupo = legacyGrupo;
      codigoExame = legacyCodigoExame;
    }

    try {
      if (!id) throw new BadRequestException('Parâmetros inválidos');
      this.logger.warn(
        '[AUDIT][MANUAL_EXAM_UPLOAD] schedulingId=' +
          id +
          ' grupo=' +
          (grupo || 'n/a') +
          ' codigoExame=' +
          (codigoExame || 'n/a') +
          ' ip=' +
          (req.ip || 'n/a') +
          ' ua=' +
          (req.headers['user-agent'] || 'n/a'),
      );

      const normalizeGroup = (value?: string) =>
        this.mongoService.normalizeGroupName(value);
      const grupoPorCodigo =
        (await getExamGroupAndItemByCodigoAsync(codigoExame))?.grupo ||
        encontrarGrupoPorCodigo(codigoExame);
      let grupoResolvido = (grupo || '').trim();

      if (!grupoResolvido && grupoPorCodigo) {
        grupoResolvido = grupoPorCodigo;
      }

      // === 1. Buscar agendamento ===
      const funcionarioDoc =
        await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
          {
            _id: new ObjectId(id),
          },
        );

      if (!funcionarioDoc)
        throw new NotFoundException('Agendamento não encontrado');

      const funcionario = new FuncionarioEntity(funcionarioDoc);

      // === 2. Validar exame ===
      const exames = funcionario.getRaw().EXAMES;
      const examePeloCodigo = exames.find((e) => e.codigoExame === codigoExame);

      if (!grupoResolvido && examePeloCodigo?.grupo) {
        grupoResolvido = examePeloCodigo.grupo;
      }

      if (
        grupoPorCodigo &&
        normalizeGroup(grupoResolvido) !== normalizeGroup(grupoPorCodigo)
      ) {
        grupoResolvido = grupoPorCodigo;
      }

      let examesDoGrupo = grupoResolvido
        ? exames.filter(
            (e) => normalizeGroup(e.grupo) === normalizeGroup(grupoResolvido),
          )
        : [];

      // Fallback: se não encontrou por grupo, tenta pelo código exato no agendamento
      if (examesDoGrupo.length === 0 && codigoExame) {
        examesDoGrupo = exames.filter((e) => e.codigoExame === codigoExame);
        if (examesDoGrupo.length > 0) {
          grupoResolvido =
            examesDoGrupo.find((e) => !!e.grupo)?.grupo ||
            grupoResolvido ||
            grupoPorCodigo ||
            '';
        }
      }

      if (examesDoGrupo.length === 0)
        throw new BadRequestException('Grupo de exame inválido');
      if (!grupoResolvido)
        throw new BadRequestException('Grupo de exame não identificado');

      // === 3. Validar arquivos ===
      if (!uploadedFiles?.length || uploadedFiles.length === 0)
        throw new BadRequestException('Nenhum arquivo enviado');

      const allowedMimeTypes = new Set([
        'application/pdf',
        'image/jpeg',
        'image/png',
      ]);
      for (const f of uploadedFiles) {
        if (!allowedMimeTypes.has(f.mimetype))
          throw new BadRequestException(
            `Arquivo inválido: ${f.originalname}. Apenas PDFs são permitidos.`,
          );
      }

      // === 4. Coletar PDFs existentes do grupo ===
      const pdfs: Buffer[] = [];
      const urlsExistentes: string[] = [];
      const groupConfig = this.getExamGroupConfig(grupoResolvido);
      const requiresSystemGeneratedQuestionnaire =
        !!groupConfig?.enviarParaAzure;
      const allowsManualUploadWithoutQuestionnaire = true;

      // Para cada exame do grupo, coletar PDFs existentes
      examesDoGrupo.forEach((exame) => {
        if (
          exame.url &&
          this.isExamUrlFromCurrentProntuario(
            exame.url,
            funcionario.getRaw().CODIGOPRONTUARIO,
          ) &&
          !urlsExistentes.includes(exame.url)
        ) {
          urlsExistentes.push(exame.url);
        }
      });

      if (
        requiresSystemGeneratedQuestionnaire &&
        urlsExistentes.length === 0 &&
        !allowsManualUploadWithoutQuestionnaire
      ) {
        const examForFallback = examesDoGrupo.find(
          (exame) =>
            !!exame.codigoExame &&
            (exame.codigoExame === codigoExame ||
              normalizeGroup(exame.grupo) === normalizeGroup(grupoResolvido)),
        );

        if (examForFallback?.codigoExame) {
          this.logger.warn(
            `[UPLOAD_ANEXO][SNAPSHOT_FALLBACK] Tentando reemitir exame por snapshot antes do anexo. schedulingId=${id} codigoExame=${examForFallback.codigoExame} grupo=${grupoResolvido}`,
          );

          await this.mongoService.updateExam(
            await this.buildExamReissueData({
              schedule: funcionarioDoc,
              funcionarioId: id,
              codigoExame: examForFallback.codigoExame,
            }),
          );

          const refreshedSchedule =
            await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
              {
                _id: new ObjectId(id),
              },
            );

          if (refreshedSchedule) {
            const refreshedFuncionario = new FuncionarioEntity(
              refreshedSchedule,
            );
            const refreshedExamesDoGrupo = refreshedFuncionario
              .getRaw()
              .EXAMES.filter(
                (e) =>
                  normalizeGroup(e.grupo) === normalizeGroup(grupoResolvido) ||
                  e.codigoExame === codigoExame,
              );

            for (const exame of refreshedExamesDoGrupo) {
              if (
                exame.url &&
                this.isExamUrlFromCurrentProntuario(
                  exame.url,
                  refreshedFuncionario.getRaw().CODIGOPRONTUARIO,
                ) &&
                !urlsExistentes.includes(exame.url)
              ) {
                urlsExistentes.push(exame.url);
              }
            }
          }
        }
      }

      if (
        requiresSystemGeneratedQuestionnaire &&
        urlsExistentes.length === 0 &&
        !allowsManualUploadWithoutQuestionnaire
      ) {
        throw new BadRequestException(
          'O questionário deste exame ainda não foi gerado pelo sistema para este prontuário. Reemita o exame e aguarde a nova URL antes de anexar o laudo.',
        );
      }

      if (
        requiresSystemGeneratedQuestionnaire &&
        urlsExistentes.length === 0 &&
        allowsManualUploadWithoutQuestionnaire
      ) {
        this.logger.warn(
          `[UPLOAD_ANEXO][MANUAL_FORM_UPLOAD] Prosseguindo sem questionario base. schedulingId=${id} grupo=${grupoResolvido} codigoExame=${codigoExame}`,
        );
      }

      // Baixar PDFs existentes do Azure
      for (const url of urlsExistentes) {
        try {
          const buffer = await this.azureService.downloadBlob(url);
          if (buffer) {
            pdfs.push(buffer);
          }
        } catch (error) {
          console.warn(`Não foi possível baixar PDF existente: ${url}`, error);
        }
      }

      // Adicionar novos PDFs enviados
      if (uploadedFiles?.length) {
        for (const f of uploadedFiles) {
          const normalizedUpload =
            await this.azureService.normalizeUploadFileToPdf({
              buffer: f.buffer,
              contentType: f.mimetype,
              originalName: f.originalname,
            });
          pdfs.push(normalizedUpload.buffer);
        }
      }

      if (pdfs.length === 0)
        throw new BadRequestException(
          'Nenhum PDF disponível para processamento',
        );

      // === 5. Merge dos PDFs ===
      const mergedPdf = await mergePdfs(pdfs);

      // === 6. Atualizar arquivo no Azure ===
      await this.azureService.updateExamFile(
        funcionario.getRaw(),
        grupoResolvido,
        mergedPdf,
        'BACKEND_MANUAL_UPLOAD',
      );

      // === 7. Atualizar status dos exames do grupo ===
      const indicesParaAtualizar: number[] = [];

      // Encontrar todos os índices do grupo
      exames.forEach((exame, index) => {
        if (
          normalizeGroup(exame.grupo) === normalizeGroup(grupoResolvido) ||
          exame.codigoExame === codigoExame
        ) {
          indicesParaAtualizar.push(index);
        }
      });

      // Atualizar o status de cada exame do grupo
      indicesParaAtualizar.forEach((index) => {
        funcionario.updateExameAtIndex(index, {
          grupo: grupoResolvido,
          status: ExamStatus.FINALIZADO,
        });
      });

      // === 8. Atualizar status geral ===
      const previousStatus =
        funcionarioDoc.ATENDIMENTOSTATUS as AtendimentoStatus;
      funcionario.updateAtendimentoStatus(previousStatus);

      // === 9. Persistir ===
      const result = await this.mongoService.updateFullDocument(
        funcionario.getRaw(),
      );

      // Enfileirar cada exame finalizado para envio ao SOC via resultado-exame-soc
      for (const idx of indicesParaAtualizar) {
        const ex = funcionario.getRaw().EXAMES[idx];
        if (ex?.grupo) {
          await this.azureService.filaResultadoExameSoc({
            schedulingId: id,
            grupo: ex.grupo,
            examIndex: idx,
            requestedAt: new Date().toISOString(),
            codigoExame: ex.codigoExame,
            sequencialResultadoExame: ex.sequencialResultadoExame,
            sequencialFicha: funcionario.getRaw().SEQUENCIAFICHA,
          });
        }
      }

      return result;
    } catch (err) {
      console.error('Erro ao atualizar resultado de exame:', err);
      throw new BadRequestException(
        err.message || 'Erro ao atualizar resultado de exame',
      );
    }
  }

  @Post('/finish')
  async finishScheduling(
    @Body() finishData: FinishSchedulingDto,
    @Req() req: Request,
  ) {
    /**
     * {
          "opinionType": "APTO",
          "details": "",
          "laudoPCD": null,
          "laudoRestricao": null,
          "altura": null,
          "confinado": null,
          "examesParaRepetir": []
        }
     */
    const authUser = parseAuthUserHeader(req.headers['x-auth-user']);
    const { scheduledId, user, options, credentials } = finishData;
    const effectiveUser = authUser || user;

    if (hasProfessionalMismatch(authUser, user)) {
      this.logger.warn(
        `[IDENTITY_AUTH_BODY_MISMATCH] route=/schedulings/finish auth=${authUser?.codigo || 'n/a'} body=${user?.codigo || 'n/a'}`,
      );
    }

    if (!scheduledId || !effectiveUser || !options) {
      throw new HttpException(
        'Dados obrigatórios não enviados',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.mongoService.finishScheduling(
        scheduledId,
        effectiveUser,
        options,
        credentials,
        authUser,
      );
      return;
    } catch (err) {
      throw new HttpException(
        `Erro ao finalizar parecer médico ${err}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('statistics')
  async getAtendimentos(
    @Query('unidade') unidade?: string,
    @Query('data') data?: string,
  ) {
    const statisticsData =
      await this.statisticsService.getAtendimentosPorUnidade(unidade, data);

    return statisticsData;
  }

}
