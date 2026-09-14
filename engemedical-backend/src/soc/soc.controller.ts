import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Logger,
  Post,
  Body,
  UseGuards,
  Param,
  Req,
  Optional,
  ForbiddenException,
  Delete,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { StructuredLogger } from 'src/utils/logger';
import { calcularRangePipeline } from 'src/utils/util';
import { SocService } from './soc.service';
import { MongoService } from 'src/mongo/mongo.service';
import { SchedulingDocument } from 'src/mongo/types/scheduling';
import { ICadastroPessoas } from './types/CadastroPessoas';
import { parseAuthUserHeader } from 'src/core/professional-identity.resolver';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { SocInactivationCancellationRegistry } from './soc-inactivation-cancellation';

@Controller('soc')
export class SocController {
  constructor(
    private readonly socService: SocService,
    private readonly mongoService: MongoService,
    private readonly logger: StructuredLogger,
    @Optional() private readonly cancellation?: SocInactivationCancellationRegistry,
  ) {
    this.logger.setContext(SocController.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('inactivation/runs')
  async getInactivationRuns(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: string,
  ) {
    return this.socService.listInactivationRuns({
      limit: limit ? Number(limit) : undefined,
      skip: skip ? Number(skip) : undefined,
      status,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('inactivation/runs/:id')
  async getInactivationRun(@Param('id') id: string) {
    return this.socService.getInactivationRun(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('inactivation/preview')
  async previewInactivation(@Body() body: { companyCodes?: string[] }, @Req() request: Request) {
    const companyCodes = Array.isArray(body.companyCodes)
      ? [...new Set(body.companyCodes.map(String).filter(Boolean))].slice(0, 100)
      : [];
    if (!companyCodes.length) throw new BadRequestException('Selecione ao menos uma empresa');
    const authUser = parseAuthUserHeader(request.headers['x-auth-user']);
    return this.socService.inactivateEmployeesFlow({
      companyCodes,
      dryRun: true,
      trigger: 'manual',
      persist: false,
      sendReport: false,
      returnDetails: true,
      initiatedBy: (authUser as any)?.nome || (authUser as any)?.codigo || 'usuário autenticado',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('inactivation/manual')
  async manualInactivation(@Body() body: { companyCodes?: string[]; dryRun?: boolean }, @Req() request: Request) {
    const companyCodes = Array.isArray(body.companyCodes)
      ? [...new Set(body.companyCodes.map(String).filter(Boolean))].slice(0, 100)
      : [];
    if (!companyCodes.length) throw new BadRequestException('Selecione ao menos uma empresa');
    const authUser = parseAuthUserHeader(request.headers['x-auth-user']);
    const manualRecipient = (authUser as any)?.email?.trim();
    if (!manualRecipient) throw new BadRequestException('E-mail do usuário autenticado não identificado');
    const executionId = randomUUID();
    this.cancellation?.start(executionId);
    void this.socService.inactivateEmployeesFlow({
      companyCodes,
      dryRun: body.dryRun !== false,
      trigger: 'manual',
      executionId,
      reportRecipients: [manualRecipient],
      initiatedBy: (authUser as any)?.nome || (authUser as any)?.codigo || manualRecipient,
    }).finally(() => this.cancellation?.finish(executionId));
    return { executionId, status: 'started', dryRun: body.dryRun !== false, companyCodes };
  }

  @UseGuards(JwtAuthGuard)
  @Post('inactivation/:executionId/cancel')
  cancelManualInactivation(@Param('executionId') executionId: string) {
    this.cancellation?.cancel(executionId);
    return { executionId, status: 'cancellation_requested' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('inactivation/runs/:id/report')
  async downloadInactivationReport(@Param('id') id: string, @Res() res: Response) {
    const report = await this.socService.getInactivationReportForDownload(id);
    const fileName = report.fileName.replace(/["\r\n]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(report.buffer);
  }

  // retorna do banco de dados local MongoDB se local=true, senão retorna do cache do SOC
  @Get('empresas')
  async getAll(@Query('local') local?: string) {
    if (local === 'true') {
      return await this.socService.getLocalCompanies();
    }
    return await this.socService.getCompaniesRegister();
  }

  @Get('empresas/soc-export')
  async getRawSocCompanies() {
    try {
      const companies = await this.socService.fetchRawSocCompanies();
      return companies;
    } catch (err) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Falha ao buscar empresas do SOC: ' + err.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('hierarquia/exporta-dados')
  async getExportaDados() {
    const { SocExportaDadosService } = require('./soc-exporta-dados.service');
    const exportaDadosService = new SocExportaDadosService();
    try {
      const hierarchy = await exportaDadosService.getGrupoToraHierarchyFromEnv();
      return hierarchy;
    } catch (err) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Falha ao exportar dados do SOC: ' + err.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('empresas/:codigo')
  async getCompanyByCode(@Param('codigo') codigo: string) {
    const company = await this.socService.getCompanyByCode(codigo);
    if (!company) {
      throw new NotFoundException(`Empresa com código ${codigo} não encontrada`);
    }
    return company;
  }

  @Get('empresas/:codigo/contatos')
  async getCompanyContacts(@Param('codigo') codigo: string) {
    const contacts = await this.socService.getCompanyContactsDetailed(codigo);
    if (!contacts) {
      return [];
    }
    return contacts;
  }

  @UseGuards(JwtAuthGuard)
  @Post('empresas/:codigo')
  async updateCompany(
    @Param('codigo') codigo: string,
    @Body() body: any,
    @Req() request: Request,
  ) {
    const userHeader = request.headers['x-auth-user'];
    const authUser = parseAuthUserHeader(userHeader as string);
    if (!authUser || authUser.perfil !== 'MASTER') {
      throw new ForbiddenException('Acesso restrito ao perfil MASTER');
    }

    try {
      return await this.socService.updateCompany(codigo, body);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('empresas')
  async createCompany(
    @Body() body: any,
    @Req() request: Request,
  ) {
    const userHeader = request.headers['x-auth-user'];
    const authUser = parseAuthUserHeader(userHeader as string);
    if (!authUser || authUser.perfil !== 'MASTER') {
      throw new ForbiddenException('Acesso restrito ao perfil MASTER');
    }

    try {
      return await this.socService.createCompany(body);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('empresas/:codigo')
  async deleteCompany(
    @Param('codigo') codigo: string,
    @Req() request: Request,
  ) {
    const userHeader = request.headers['x-auth-user'];
    const authUser = parseAuthUserHeader(userHeader as string);
    if (!authUser || authUser.perfil !== 'MASTER') {
      throw new ForbiddenException('Acesso restrito ao perfil MASTER');
    }

    try {
      await this.socService.deleteCompany(codigo);
      return { success: true };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @Get('/asos')
  async getRecords(
    @Query('empresa') empresa: string,
    @Query('funcionario') funcionario: string,
    @Query('ficha') ficha: string,
  ) {
    const socResponse = await this.socService.EdAsosFuncionario(
      empresa,
      funcionario,
      ficha,
    );

    if (!socResponse || socResponse.length === 0) {
      return [];
    }

    // 🔹 Remove duplicados de IDFICHA
    const uniqueList = Array.from(
      new Map(
        socResponse.reverse().map((item) => [item.IDFICHA, item]),
      ).values(),
    );

    return uniqueList;
  }

  @Get('pedidoexame/validate')
  async pedidoExamValidate(
    @Query('codempresa') codempresa: string,
    @Query('codfuncionario') codfuncionario: string,
    @Query('data') data?: string,
  ) {
    const validaData =
      data ??
      new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      }).format(new Date());

    const asos = await this.socService.EdAsosFuncionario(
      codempresa,
      codfuncionario,
      '',
    );

    const asosFiltrados = asos.filter(
      (aso) => aso.DTEXAME === validaData || aso.DTEXAME === '',
    );

    if (!asosFiltrados.length) {
      return { data: null };
    }

    const ficha = asosFiltrados[asosFiltrados.length - 1];

    let document =
      await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
        {
          SEQUENCIAFICHA: ficha?.IDFICHA,
        },
      );

    if (!document && ficha) {
      const codigoProntuario = `${ficha.CODIGOEMPRESA}-${ficha.CODIGOFUNCIONARIO}-${ficha.TPASO}-${(ficha.DATAFICHA || validaData).replace(/\//g, '')}`;

      document =
        await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
          { CODIGOPRONTUARIO: codigoProntuario },
        );
    }

    return { data: document ?? null };
  }

  @Get('pedidoexame')
  async getExamesRealizadosPorEmpresaFiltradoFuncionario(
    @Query('codempresa') codempresa: string,
    @Query('codfuncionario') codfuncionario: string,
    @Query('data') data?: string,
    @Query('manterExamesRealizados') manterExamesRealizados?: string,
    @Query('ficha') ficha?: string,
  ) {
    if (codempresa && codfuncionario) {
      try {
        // Base temporal alinhada ao fluxo automático (BRT).
        const { diaBrStr, inicioDoDiaBR } = calcularRangePipeline();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const dataInicioPadrao = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
        }).format(new Date(inicioDoDiaBR.getTime() - THIRTY_DAYS_MS));

        // Mantém override manual existente via query `data`.
        const dataInicio = data ?? dataInicioPadrao;
        const dataFim = diaBrStr;

        const manterExames = manterExamesRealizados === 'true';

        this.logger.debug({
          event: 'SOC_PEDIDO_EXAME_QUERY',
          empresa: codempresa,
          funcionario: codfuncionario,
          dataInicio,
          dataFim,
          manterExames,
          ficha: ficha || undefined,
        });

        const response = await this.socService.EdPedidoExame(
          {
            empresa: codempresa,
            funcionario: codfuncionario,
            dataInicio,
            dataFim,
          },
          manterExames,
          ficha,
        );

        return response;
      } catch (err) {
        throw new BadRequestException(
          `Erro durante a exportação de dados ${err}`,
        );
      }
    } else {
      throw new BadRequestException(`Parâmetros incorretos ou inválidos`);
    }
  }

  @Get('pedidoexame/options')
  async getPedidoExameOptions(
    @Query('codempresa') codempresa: string,
    @Query('codfuncionario') codfuncionario: string,
  ) {
    if (!codempresa || !codfuncionario) {
      throw new BadRequestException('Parâmetros codempresa e codfuncionario são obrigatórios');
    }

    try {
      const options = await this.socService.getPedidoExameOptions(
        codempresa,
        codfuncionario,
      );

      return { options };
    } catch (err) {
      throw new BadRequestException(
        `Erro ao buscar opções de ASO: ${err}`,
      );
    }
  }

  @Post('pedidoexame/credenciadas')
  async getExameCredenciada(@Body('cpf') cpf: string) {
    if (!cpf)
      throw new BadRequestException(`Parâmetros incorretos ou inválidos [CPF]`);

    try {
      const data = await this.socService.handleCredenciadas(cpf);
      this.logger.debug({ event: 'SOC_CREDENCIADAS_DATA', data });
      if (!data)
        throw new BadRequestException(
          'Não foi localizado exames para o funcionário informado...',
        );

      return data;
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err);
    }
  }

  @Get('cadastropessoas')
  async getCadastroPessoas() {
    try {
      const listaCadastroPessoas = await this.socService.EdCadastroPessoas();
      return listaCadastroPessoas || [];
    } catch (err) {
      console.log(err);
      // Fallback seguro em vez de erro, conforme solicitado
      return [];
    }
  }

  @Get('audiometria-anterior')
  async getAudiometriaAnteriorSocged(
    @Query('empresa') empresa: string,
    @Query('codigoFuncionario') codigoFuncionario: string,
  ) {
    const audiometriaPath = await this.socService.getAudiometriaAnterior(
      empresa,
      codigoFuncionario,
    );

    if (!audiometriaPath) {
      throw new BadRequestException('Audiometria anterior indisponível');
    }

    return audiometriaPath;
  }

  @Post('sync-soc-to-mongo/test')
  async testHandleUpdateSocToMongo() {
    const result = await this.socService.handleUpdateSocToMongo();
    this.logger.log({ event: 'SOC_UPDATE_MONGOTEST_RESULT', result });
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('sincronizar-prontuario')
  async sincronizarProntuario(
    @Body()
    body: {
      schedulingId: string;
      empresa: string;
      funcionario: string;
    },
  ) {
    if (!body.schedulingId || !body.empresa || !body.funcionario) {
      throw new BadRequestException(
        'Parâmetros ausentes (schedulingId, empresa, funcionario)',
      );
    }

    this.logger.log({
      event: 'SOC_SYNC_PRONTUARIO_START',
      schedulingId: body.schedulingId,
    });

    const result = await this.socService.sincronizarProntuario(
      body.schedulingId,
      body.empresa,
      body.funcionario,
    );

    if (result && result.success === false) {
      throw new BadRequestException(result.message);
    }

    // Retorna { success, data, resumo } para que o Frontend mostre o que aconteceu no alert
    return result;
  }

  // ─── ENDPOINT DE TESTE: Inativação em massa (dry-run ou produção) ───
  @Post('inactivation/test')
  async testInactivation(
    @Body() body: { dryRun?: boolean; companyCode?: string },
  ) {
    const dryRun = body.dryRun !== false; // default: true (seguro)
    const startTime = new Date();

    this.logger.log({
      event: 'SOC_INACTIVATION_TEST_START',
      dryRun,
      companyCode: body.companyCode || 'ALL',
    });

    try {
      // 1. Empresas alvo
      const companies = await this.socService.getCompaniesRegister();
      const targetCompanies = body.companyCode
        ? companies.filter((c) => c.CODIGO === body.companyCode)
        : companies;

      // 2. FASE 2: Verificar elegibilidade via Preço 218761
      const exportService = (this.socService as any).socExportService;
      const eligible: any[] = [];
      const ineligible: any[] = [];
      const companiesWithSOC: string[] = [];

      // Limitar a 5 empresas para teste (evitar timeout)
      const testCompanies = targetCompanies.slice(0, 5);

      for (const company of testCompanies) {
        const codigo = String(company.CODIGO);
        const nome = company.NOMEABREVIADO || company.RAZAOSOCIAL || 'Desconhecida';

        try {
          if (typeof exportService?.fetchPrecosEmpresa === 'function') {
            const priceCheck = await exportService.fetchPrecosEmpresa(codigo);
            if (!priceCheck.isElegivel) {
              ineligible.push({
                codigo,
                nome,
                motivo: priceCheck.motivo || 'Protegido (Vida Ativa/eSocial)',
              });
              continue;
            }
          }
          // Se não tem 218761, assume elegível
          eligible.push({ codigo, nome });
          companiesWithSOC.push(codigo);
        } catch (err) {
          eligible.push({ codigo, nome, aviso: 'Erro ao consultar preço' });
          companiesWithSOC.push(codigo);
        }
      }

      // 3. Buscar funcionários das empresas elegíveis
      const employeesResult: any[] = [];
      if (!dryRun && companiesWithSOC.length > 0) {
        const employeeData = await exportService.fetchEmployees();
        for (const emp of employeeData) {
          if (companiesWithSOC.includes(String(emp.empresa))) {
            employeesResult.push(emp);
          }
        }
      }

      // 4. Executar SOAP se não for dry-run
      let soapResults: any[] = [];
      if (!dryRun && employeesResult.length > 0) {
        soapResults = await this.socService.executeInactivationSoap(
          employeesResult,
        );
      }

      const endTime = new Date();
      const elapsed = Math.round(
        (endTime.getTime() - startTime.getTime()) / 1000,
      );

      const result = {
        dryRun,
        tempoExecucao: `${elapsed}s`,
        empresas: {
          totalAlvo: targetCompanies.length,
          analisadas: testCompanies.length,
          elegiveis: eligible.length,
          inelegiveis: ineligible.length,
        },
        funcionarios: {
          total: employeesResult.length,
          inativados: soapResults.filter((r) => r.success).length,
          erros: soapResults.filter((r) => !r.success).length,
        },
        detalhes: {
          empresasElegiveis: eligible,
          empresasInelegiveis: ineligible,
          SOAP: dryRun ? 'SIMULADO (nenhum chamado)' : soapResults.slice(0, 20),
        },
      };

      this.logger.log({
        event: 'SOC_INACTIVATION_TEST_COMPLETE',
        dryRun,
        elapsed: `${elapsed}s`,
        eligible: eligible.length,
        ineligible: ineligible.length,
      });

      return result;
    } catch (error) {
      this.logger.error({
        event: 'SOC_INACTIVATION_TEST_ERROR',
        message: error.message,
      });
      throw new HttpException(
        `Erro no teste de inativação: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
