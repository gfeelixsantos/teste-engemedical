import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import type { MongoService } from 'src/mongo/mongo.service';
import { PedidoExame } from '../types/PedidoExame';
import { PedidoExameSequencialFicha } from '../types/PedidoExameSequencialFicha';
import { ExamsScheduled, SchedulingDocument } from 'src/mongo/types/scheduling';
import { ExamStatus, AtendimentoStatus } from 'src/mongo/enum/scheduling.enum';
import {
  calcularRangePipeline,
  gerarCodigoProntuario,
  getExamGroupAndItemByCodigo,
  getExamGroupAndItemByCodigoAsync,
  parseDDMMYYYYtoDateBR,
} from 'src/utils/util';
import {
  mapPedidoExameToSchedulingDocument,
  mapUpdateSchedulingWithPedidoExame,
} from 'src/utils/util';
import { executeMergeInteligente } from 'src/utils/merge-engine';
import { SchedulingClass } from 'src/mongo/model/SchedulingClass';
import { ObjectId } from 'mongodb';
import { RiscosAso, FileUpload } from 'src/mongo/types/scheduling';
import { SocCompanyService } from './soc-company.service';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
} from '../utils/soc-export-data-url';

const getMongoService = () =>
  require('../../mongo/mongo.service').MongoService;

@Injectable()
export class SocExamService {
  private readonly logger = new Logger(SocExamService.name);

  constructor(
    @Inject(forwardRef(getMongoService))
    private readonly mongoService: MongoService,
    private readonly socCompanyService: SocCompanyService,
  ) {}

  /**
   * Função que mapeia exames agendados e chama exporta dados `Pedido de Exame pelo Sequencial da ficha(WS Resultado de exames)`
   * para vincular o `sequencial resultado` no exames do pedido.
   */
  async handleExamScheduled(
    resultados: PedidoExame[],
  ): Promise<ExamsScheduled[]> {
    if (!resultados || resultados.length === 0) {
      return [];
    }

    const credentials = getSocExportCredentials('SOC_ED_SEQUENCIAL_RESULTADO');
    const url = buildSocExportDataUrl({
      ...credentials,
      tipoSaida: 'json',
      sequencial: resultados[0].SEQUENCIAFICHA,
      empresaTrabalho: resultados[0].CODIGOEMPRESA,
    });

    let codigosSequenciaisResultados: PedidoExameSequencialFicha[] = [];
    let response: Response | undefined;
    const maxRetries = 1;
    const timeoutMs = 15000;
    const delayMs = 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `[SOC] Tentativa ${attempt + 1}/${maxRetries + 1} buscando dados de ${resultados[0].NOMEEMPRESA} - ${resultados[0].NOMEFUNCIONARIO}`,
        );

        response = await fetch(url, {
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.ok) {
          codigosSequenciaisResultados = await response.json();
          break;
        } else {
          if (response.status >= 500 && attempt < maxRetries) {
            throw new Error(
              `Servidor SOC retornou erro HTTP ${response.status}. Retentando...`,
            );
          }

          this.logger.error(
            `[SOC] Erro HTTP fatal (${response.status}) na busca de dados. Não haverá retentativa.`,
          );
          return [];
        }
      } catch (error) {
        if (attempt < maxRetries) {
          const errorName =
            error.name ||
            (error.cause && error.cause.name) ||
            'Erro de Rede Desconhecido';
          this.logger.warn(
            `[SOC] Falha na Tentativa ${attempt + 1}: ${errorName}. Esperando ${delayMs}ms para retentar...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          this.logger.error(
            `[SOC] Falha CRÍTICA após ${maxRetries + 1} tentativas. Erro final:`,
            error.message,
          );
          return [];
        }
      }
    }

    // Lógica de processamento dos resultados
    const results: ExamsScheduled[] = [];
    const { diaBrStr } = calcularRangePipeline();
    for (const item of resultados) {
      if (item.CODIGOINTERNOEXAME != 'EXM1') {
        const hasCode = codigosSequenciaisResultados.find(
          (c) => c.CODIGOEXAME === item.CODIGOINTERNOEXAME,
        )?.SEQUENCIALRESULTADO;

        const dataExameStr = item.DATAEXAME?.trim();
        const dataExame = dataExameStr
          ? parseDDMMYYYYtoDateBR(dataExameStr)
          : parseDDMMYYYYtoDateBR(diaBrStr);

        const exame: ExamsScheduled = {
          codigoExame: item.CODIGOINTERNOEXAME,
          nomeExame: item.NOMEEXAME,
          status: ExamStatus.PENDENTE,
          dataExame,
          preparacao: '',
          profissional: '',
          sala: '',
          sequencialResultadoExame: hasCode ?? '',
          url: '',
          grupo: (await getExamGroupAndItemByCodigoAsync(item.CODIGOINTERNOEXAME))?.grupo,
        };

        results.push(exame);
      }
    }

    return results;
  }

  /**
   * Fluxo EXCLUSIVO para sincronização de prontuário.
   * Duplicado intencionalmente para não impactar o handleExamScheduled legado.
   */
  async handleExamScheduledSyncProntuario(
    resultados: PedidoExame[],
  ): Promise<ExamsScheduled[]> {
    if (!resultados || resultados.length === 0) {
      return [];
    }

    const credentials = getSocExportCredentials('SOC_ED_SEQUENCIAL_RESULTADO');
    const url = buildSocExportDataUrl({
      ...credentials,
      tipoSaida: 'json',
      sequencial: resultados[0].SEQUENCIAFICHA,
      empresaTrabalho: resultados[0].CODIGOEMPRESA,
    });

    let codigosSequenciaisResultados: PedidoExameSequencialFicha[] = [];
    let response: Response | undefined;
    const maxRetries = 1;
    const timeoutMs = 15000;
    const delayMs = 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `[SYNC_PRONTUARIO] Tentativa ${attempt + 1}/${maxRetries + 1} buscando dados de ${resultados[0].NOMEEMPRESA} - ${resultados[0].NOMEFUNCIONARIO}`,
        );

        response = await fetch(url, {
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.ok) {
          codigosSequenciaisResultados = await response.json();
          break;
        } else {
          if (response.status >= 500 && attempt < maxRetries) {
            throw new Error(
              `Servidor SOC retornou erro HTTP ${response.status}. Retentando...`,
            );
          }

          this.logger.error(
            `[SYNC_PRONTUARIO] Erro HTTP fatal (${response.status}) na busca de dados. Não haverá retentativa.`,
          );
          return [];
        }
      } catch (error) {
        if (attempt < maxRetries) {
          const errorName =
            error.name ||
            (error.cause && error.cause.name) ||
            'Erro de Rede Desconhecido';
          this.logger.warn(
            `[SYNC_PRONTUARIO] Falha na Tentativa ${attempt + 1}: ${errorName}. Esperando ${delayMs}ms para retentar...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          this.logger.error(
            `[SYNC_PRONTUARIO] Falha crítica após ${maxRetries + 1} tentativas. Erro final:`,
            error.message,
          );
          return [];
        }
      }
    }

    const results: ExamsScheduled[] = [];
    const { diaBrStr } = calcularRangePipeline();
    for (const item of resultados) {
      if (item.CODIGOINTERNOEXAME != 'EXM1') {
        const hasCode = codigosSequenciaisResultados.find(
          (c) => c.CODIGOEXAME === item.CODIGOINTERNOEXAME,
        )?.SEQUENCIALRESULTADO;

        const dataExameStr = item.DATAEXAME?.trim();
        const dataExame = dataExameStr
          ? parseDDMMYYYYtoDateBR(dataExameStr)
          : parseDDMMYYYYtoDateBR(diaBrStr);

        const exame: ExamsScheduled = {
          codigoExame: item.CODIGOINTERNOEXAME,
          nomeExame: item.NOMEEXAME,
          status: ExamStatus.PENDENTE,
          dataExame,
          preparacao: '',
          profissional: '',
          sala: '',
          sequencialResultadoExame: hasCode ?? '',
          url: '',
          grupo: (await getExamGroupAndItemByCodigoAsync(item.CODIGOINTERNOEXAME))?.grupo,
        };

        results.push(exame);
      }
    }

    return results;
  }

  /**
   * Busca a ficha mais recente do mesmo funcionário e tipo de exame
   * (excluindo a data atual para não pegar a mesma ficha)
   */
  private async buscarFichaAnterior(
    codigoEmpresa: string,
    codigoFuncionario: string,
    tipoExame: string,
    dataAtual: string, // formato: dd/MM/yyyy
  ): Promise<SchedulingDocument | null> {
    // Regex para buscar prontuários do mesmo funcionário e tipo
    const regexProntuario = new RegExp(
      `^${codigoEmpresa}-${codigoFuncionario}-${tipoExame}-`,
    );

    // Converte data atual para formato do prontuário (ddMMyyyy)
    const dataAtualFormatada = dataAtual.replace(/\//g, '');
    const prontuarioAtual = `${codigoEmpresa}-${codigoFuncionario}-${tipoExame}-${dataAtualFormatada}`;

    // Busca fichas anteriores ordenadas por data (mais recente primeiro)
    const fichaAnterior =
      await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
        {
          CODIGOPRONTUARIO: {
            $regex: regexProntuario,
            $ne: prontuarioAtual, // Exclui a própria ficha atual
          },
        },
        {
          sort: { DATAAGENDAMENTO_DATE: -1 }, // Mais recente primeiro
        },
      );

    return fichaAnterior;
  }

  /**
   * ✅ FUNÇÃO CORRIGIDA: Seleciona quais exames copiar da ficha anterior
   *
   * REGRA IMPLEMENTADA:
   * - Se DATAEXAME do pedido < DATAFICHA atual → COPIA exame finalizado da ficha anterior
   * - Se DATAEXAME do pedido >= DATAFICHA atual OU sem data → Deixa PENDENTE
   *
   * @param examesAnteriores - Exames da ficha anterior (TODOS os exames)
   * @param examesNovos - Exames do pedido atual (todos PENDENTE)
   * @param dataFichaAtual - Data da ficha atual (dd/MM/yyyy)
   * @param pedidosFuncionario - Pedidos originais do SOC (contém DATAEXAME de cada exame)
   */
  private selecionarExamesParaCopiar(
    examesAnteriores: ExamsScheduled[],
    examesNovos: ExamsScheduled[],
    dataFichaAtual: string,
    pedidosFuncionario: PedidoExame[],
  ): { copiados: ExamsScheduled[]; novos: ExamsScheduled[] } {
    const copiados: ExamsScheduled[] = [];
    const novos: ExamsScheduled[] = [];

    // Converte data da ficha atual para Date
    const [dia, mes, ano] = dataFichaAtual.split('/').map(Number);
    const dataFichaDate = new Date(ano, mes - 1, dia);
    dataFichaDate.setHours(0, 0, 0, 0);

    // Cria mapa de exames anteriores (TODOS, não só finalizados)
    const mapaExamesAnteriores = new Map<string, ExamsScheduled>();
    examesAnteriores.forEach((ex) => {
      mapaExamesAnteriores.set(ex.codigoExame, ex);
    });

    // Cria mapa de pedidos por código de exame (para acessar DATAEXAME)
    const mapaPedidos = new Map<string, PedidoExame>();
    pedidosFuncionario.forEach((pedido) => {
      mapaPedidos.set(pedido.CODIGOINTERNOEXAME, pedido);
    });

    this.logger.debug(
      `[SOC] Análise de exames: Ficha=${dataFichaAtual}, Pedido=${examesNovos.length}, Anterior=${examesAnteriores.length}`,
    );

    for (const exameNovo of examesNovos) {
      const exameAnterior = mapaExamesAnteriores.get(exameNovo.codigoExame);
      const pedido = mapaPedidos.get(exameNovo.codigoExame);

      // Se não existe na ficha anterior, deixa pendente
      if (!exameAnterior) {
        this.logger.log(
          `   ✏️ ${exameNovo.nomeExame}: SEM registro anterior → PENDENTE`,
        );
        novos.push(exameNovo);
        continue;
      }

      // Se não encontrou o pedido (não deveria acontecer), deixa pendente por segurança
      if (!pedido) {
        this.logger.warn(
          `   ⚠️ ${exameNovo.nomeExame}: Pedido não encontrado → PENDENTE (por segurança)`,
        );
        novos.push(exameNovo);
        continue;
      }

      // REGRA PRINCIPAL: Só COPIA se:
      // 1. Exame anterior está FINALIZADO ou AGUARDANDO_RESULTADO
      // 2. Data do exame é ANTERIOR à data da ficha atual

      const isExameFinalizado =
        exameAnterior.status === ExamStatus.FINALIZADO ||
        exameAnterior.status === ExamStatus.AGUARDANDO_RESULTADO;

      if (!isExameFinalizado) {
        this.logger.log(
          `   ✏️ ${exameNovo.nomeExame}: Status ${exameAnterior.status} (não finalizado) → PENDENTE`,
        );
        novos.push(exameNovo);
        continue;
      }

      // Extrai data do exame do pedido (DATAEXAME)
      let dataExame: Date | null = null;

      if (pedido.DATAEXAME) {
        try {
          const [dE, mE, aE] = pedido.DATAEXAME.split('/').map(Number);
          dataExame = new Date(aE, mE - 1, dE);
          dataExame.setHours(0, 0, 0, 0);
        } catch (error) {
          this.logger.warn(
            `   ⚠️ ${exameNovo.nomeExame}: Erro ao parsear data "${pedido.DATAEXAME}" → PENDENTE`,
          );
          novos.push(exameNovo);
          continue;
        }
      }

      if (!dataExame) {
        // Sem data = exame para realizar
        this.logger.log(
          `   ✏️ ${exameNovo.nomeExame}: SEM data → PENDENTE (para realizar)`,
        );
        novos.push(exameNovo);
      } else if (dataExame < dataFichaDate) {
        // Data do exame é ANTERIOR à data da ficha → COPIA o exame finalizado
        this.logger.log(
          `   📋 ${exameNovo.nomeExame}: ${pedido.DATAEXAME} < ${dataFichaAtual} → COPIA (${exameAnterior.status})`,
        );
        copiados.push({
          ...exameAnterior,
          // Preserva o status original, não altera para PENDENTE
        });
      } else {
        // Data do exame é IGUAL ou POSTERIOR
        this.logger.log(
          `   ✏️ ${exameNovo.nomeExame}: ${pedido.DATAEXAME} >= ${dataFichaAtual} → PENDENTE (para realizar)`,
        );
        novos.push(exameNovo); // Deixa PENDENTE
      }
    }

    this.logger.debug(
      `[SOC] Resultado análise exames: ${copiados.length} copiados, ${novos.length} pendentes | ${dataFichaAtual}`,
    );

    return { copiados, novos };
  }

  /**
   * Converte exames FINALIZADOS que possuem laudo (url) em ANEXOS do tipo FileUpload,
   * apontando para o mesmo blob de destino (StoragePath = url) sem reenviar o PDF.
   * Usado quando o paciente retorna em outra data: os resultados anteriores ficam
   * disponíveis como ANEXOS no novo documento, sem sobrescrever a lista EXAMES do dia.
   */
  private converterExamesFinalizadosEmAnexos(
    exames: ExamsScheduled[],
  ): FileUpload[] {
    if (!Array.isArray(exames) || exames.length === 0) return [];

    const anexos: FileUpload[] = [];

    for (const exame of exames) {
      const url = String(exame.url || '').trim();
      if (!url) continue;

      const isFinalizado =
        exame.status === ExamStatus.FINALIZADO ||
        exame.status === ExamStatus.AGUARDANDO_RESULTADO;

      if (!isFinalizado) continue;

      anexos.push({
        Name: exame.nomeExame || exame.codigoExame || 'Resultado anterior',
        Content: 'uploaded',
        Type: 'application/pdf',
        Size: 0,
        StoragePath: url,
        UploadedAt: new Date(),
        Origin: 'historico',
      });
    }

    return anexos;
  }

  /**
   * Atualização Integrada com Merge Inteligente 2.0
   * Respeita Histórico, Evita Duplicidade e Trata Faltas.
   */
  private async aplicarMergeAgendamento(
    agendamentoExistente: SchedulingDocument,
    examesNovosSoc: ExamsScheduled[],
    riscos: RiscosAso[] | undefined,
    examesHerdados: ExamsScheduled[],
    ficha: PedidoExame,
  ): Promise<SchedulingDocument | null> {
    this.logger.debug(
      `[SOC] Iniciando Merge Inteligente para o Prontuário ${agendamentoExistente.CODIGOPRONTUARIO}`,
    );

    const { finais, resumo } = executeMergeInteligente(
      agendamentoExistente.EXAMES,
      examesNovosSoc,
      examesHerdados,
    );

    this.logger.debug(
      `[SOC] Resumo Merge: ${resumo.preservados} preservados, ${resumo.adicionados} adicionados, ${resumo.removidos} cancelados/removidos`,
    );

    // Atualização inteligente de dados cadastrais (Ignora EXAMES, DATAAGENDAMENTO, e ATENDIMENTOSTATUS p/ segurança)
    const { diaBrStr } = calcularRangePipeline();
    const codigoInternoEmpresa = this.socCompanyService.getCompanyByCode(
      ficha.CODIGOEMPRESA,
    )?.['CÓD. CLIENTE (INT.)'];
    const dadosCadastrais = mapUpdateSchedulingWithPedidoExame(
      ficha,
      codigoInternoEmpresa,
    );

    // Atualiza dataExame para hoje nos exames não concluídos (PENDENTE ou NAO_REALIZADO),
    // permitindo que o paciente seja lançado novamente em um novo dia
    const hojeDate = parseDDMMYYYYtoDateBR(diaBrStr);
    for (const exameFinal of finais) {
      if (
        exameFinal.status === ExamStatus.PENDENTE ||
        exameFinal.status === ExamStatus.NAO_REALIZADO
      ) {
        exameFinal.dataExame = hojeDate;
      }
    }

    // Atualiza DATAAGENDAMENTO para o dia atual, permitindo re-lançamento
    dadosCadastrais.DATAAGENDAMENTO = diaBrStr;

    // Se o merge adicionou novos exames PENDENTE (retorno/repetição),
    // reabre o atendimento como AGENDADO para permitir lançamento no frontend
    const ATENDIMENTOSTATUS =
      resumo.adicionados > 0
        ? AtendimentoStatus.AGENDADO
        : agendamentoExistente.ATENDIMENTOSTATUS === AtendimentoStatus.AGENDADO ||
          !agendamentoExistente.ATENDIMENTOSTATUS
          ? AtendimentoStatus.AGENDADO
          : agendamentoExistente.ATENDIMENTOSTATUS;

    const updateFields: any = {
      ...dadosCadastrais,
      EXAMES: finais,
      ATENDIMENTOSTATUS,
    };

    if (riscos) {
      updateFields['RISCOSASO'] = riscos;
    }

    const result =
      await this.mongoService.schedulingsCollection.findOneAndUpdate(
        { _id: new ObjectId(agendamentoExistente._id) },
        { $set: updateFields },
        { returnDocument: 'after' },
      );

    return result as unknown as SchedulingDocument;
  }

  /**
   * Atualiza ou cria registros de agendamento ({@link SchedulingDocument})
   * com base nos pedidos de exame recebidos.
   *
   * REGRA:
   * - Cada data gera um novo documento
   * - Copia exames finalizados de fichas anteriores SE a DATAEXAME do pedido for anterior à DATAFICHA
   * - Exames com DATAEXAME >= DATAFICHA ou sem data = PENDENTE (para realizar)
   */
  async handleUpdates(
    empresa: string,
    pedidosEmpresa: PedidoExame[],
    riscosFuncionario: (pedido: PedidoExame) => Promise<RiscosAso[]>,
    manterExames: boolean = true,
  ): Promise<SchedulingDocument | null> {
    if (!pedidosEmpresa?.length) {
      this.logger.error(
        'handleUpdates: Nenhum pedido de exame encontrado para a empresa:',
        empresa,
      );
      return null;
    }

    if (!this.mongoService?.schedulingsCollection) {
      this.logger.error(
        'SocExamService: schedulingsCollection não inicializada!',
      );
      return null;
    }

    // Agrupa pedidos por SEQUENCIAFICFA. Se vazio (ex: Demissionais), agrupa por Prontuário gerado
    const aglutinados = pedidosEmpresa.reduce(
      (acc, pedido) => {
        const agrupadora =
          pedido.SEQUENCIAFICHA && pedido.SEQUENCIAFICHA !== ''
            ? pedido.SEQUENCIAFICHA
            : gerarCodigoProntuario(pedido);

        if (!acc[agrupadora]) acc[agrupadora] = [];
        acc[agrupadora].push(pedido);
        return acc;
      },
      {} as Record<string, PedidoExame[]>,
    );

    // ✅ FILTRO DE DUPLICADOS: Se o funcionário tem múltiplas sequências ativas no SOC,
    // processamos apenas a mais recente para evitar duplicar o card na recepção.
    const employeeToSequences = new Map<string, string[]>();
    for (const seq of Object.keys(aglutinados)) {
      const first = aglutinados[seq][0];
      const empKey = `${first.CODIGOEMPRESA}-${first.CODIGOFUNCIONARIO}`;
      if (!employeeToSequences.has(empKey)) employeeToSequences.set(empKey, []);
      employeeToSequences.get(empKey)!.push(seq);
    }

    const pedidosPorFuncionario: Record<string, PedidoExame[]> = {};
    for (const [empKey, seqs] of employeeToSequences.entries()) {
      if (seqs.length > 1) {
        // Ordena por data da ficha (mais recente primeiro) e depois por número da sequência
        const bestSeq = seqs.sort((a, b) => {
          const pA = aglutinados[a][0];
          const pB = aglutinados[b][0];
          const dA = pA.DATAFICHA?.split('/').reverse().join('') || '';
          const dB = pB.DATAFICHA?.split('/').reverse().join('') || '';
          if (dA !== dB) return dB.localeCompare(dA);
          return b.localeCompare(a, undefined, { numeric: true });
        })[0];
        pedidosPorFuncionario[bestSeq] = aglutinados[bestSeq];
        this.logger.debug(
          `[SYNC] Múltiplas sequências para ${empKey}. Escolhida a mais recente: ${bestSeq}`,
        );
      } else {
        pedidosPorFuncionario[seqs[0]] = aglutinados[seqs[0]];
      }
    }

    let ultimoAgendamento: SchedulingDocument | null = null;

    for (const [sequenciaFicha, pedidosFuncionario] of Object.entries(
      pedidosPorFuncionario,
    )) {
      if (!pedidosFuncionario.length) continue;

      try {
        const ficha = pedidosFuncionario[0];
        const codigoInternoEmpresa = this.socCompanyService.getCompanyByCode(
          ficha.CODIGOEMPRESA,
        )?.['CÓD. CLIENTE (INT.)'];

        // 1. Gerar CODIGOPRONTUARIO com data
        const codigoProntuario = gerarCodigoProntuario(ficha);

        const startTime = Date.now();
        const totalExamesNoPedido = 0;

        // 2. Processar exames e riscos do pedido atual
        let [examesNovos, riscos] = await Promise.all([
          this.handleExamScheduled(pedidosFuncionario),
          riscosFuncionario(ficha),
        ]);

        // 3. Buscar documento DESTA data (por CODIGOPRONTUARIO ou Empresa + Funcionário na mesma data).
        // Isso impede a criação de documentos duplicados no mesmo dia quando o SOC altera a matrícula ou sequencial.
        const agendamentoDestaData =
          await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
            {
              $or: [
                { CODIGOPRONTUARIO: codigoProntuario },
                {
                  CODIGOEMPRESA: ficha.CODIGOEMPRESA,
                  DATAAGENDAMENTO: ficha.DATAFICHA,
                  $or: [
                    ...(ficha.CPFFUNCIONARIO ? [{ CPFFUNCIONARIO: ficha.CPFFUNCIONARIO }] : []),
                    ...(ficha.CODIGOFUNCIONARIO ? [{ CODIGO: ficha.CODIGOFUNCIONARIO }] : []),
                  ],
                },
              ],
            },
          );

        // 4. Se não existe documento desta data, detecta RETORNO do paciente em outra data:
        //    a mesma SEQUENCIAFICHA casando com um documento de CODIGOPRONTUARIO (data) diferente.
        //    Nesse caso NÃO mesclamos no documento antigo; criamos novo documento e os laudos
        //    (resultados com url) da ficha anterior entram como ANEXOS do documento novo.
        let fichaRetornoOutraData: SchedulingDocument | null = null;
        let isRetornoOutraData = false;
        if (
          !agendamentoDestaData &&
          ficha.SEQUENCIAFICHA &&
          ficha.SEQUENCIAFICHA !== ''
        ) {
          const retorno =
            await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
              { SEQUENCIAFICHA: ficha.SEQUENCIAFICHA },
              { sort: { DATAAGENDAMENTO_DATE: -1 } },
            );
          if (retorno && retorno.CODIGOPRONTUARIO !== codigoProntuario) {
            fichaRetornoOutraData = retorno;
            isRetornoOutraData = true;
            this.logger.debug(
              `[SOC] Retorno detectado em outra data (SEQUENCIAFICHA=${ficha.SEQUENCIAFICHA}). Laudos anteriores viram ANEXOS do novo documento - ${ficha.NOMEFUNCIONARIO}`,
            );
          }
        }

        // 5. Copiar exames / preparar ANEXOS de retorno (se aplicável)
        let examesCopiados: ExamsScheduled[] = [];
        let anexosLaudosRetorno: FileUpload[] = [];

        if (manterExames) {
          if (agendamentoDestaData) {
            // CENÁRIO 1: Atualização no MESMO dia - usa exames do próprio documento
            this.logger.debug(
              `[SOC] Documento desta data - usando exames atuais para cópia - ${ficha.NOMEFUNCIONARIO}`,
            );

            const resultadoCopia = this.selecionarExamesParaCopiar(
              agendamentoDestaData.EXAMES, // PASSA TODOS os exames, não só finalizados
              examesNovos,
              ficha.DATAFICHA,
              pedidosFuncionario,
            );

            examesCopiados = resultadoCopia.copiados;
            examesNovos = resultadoCopia.novos; // Atualiza com os pendentes
          } else if (isRetornoOutraData && fichaRetornoOutraData) {
            // RETORNO em OUTRA data: laudos anteriores viram ANEXOS; EXAMES só do dia
            anexosLaudosRetorno = this.converterExamesFinalizadosEmAnexos(
              fichaRetornoOutraData.EXAMES,
            );
            examesCopiados = [];
            this.logger.debug(
              `[SOC] Retorno ${ficha.NOMEFUNCIONARIO} em nova data - ${anexosLaudosRetorno.length} laudo(s) anterior(es) movido(s) para ANEXOS`,
            );
          } else {
            // CENÁRIO 2: Novo documento (primeira vez) - busca ficha anterior por padrão de prontuário
            const fichaAnterior = await this.buscarFichaAnterior(
              ficha.CODIGOEMPRESA,
              ficha.CODIGOFUNCIONARIO,
              ficha.CODIGOTIPOEXAME,
              ficha.DATAFICHA,
            );

            if (fichaAnterior) {
              this.logger.debug(
                `[SOC] Ficha anterior encontrada: ${fichaAnterior.CODIGOPRONTUARIO} para ${ficha.NOMEFUNCIONARIO}`,
              );

              const resultadoCopia = this.selecionarExamesParaCopiar(
                fichaAnterior.EXAMES, // PASSA TODOS os exames da ficha anterior
                examesNovos,
                ficha.DATAFICHA,
                pedidosFuncionario,
              );

              examesCopiados = resultadoCopia.copiados;
              examesNovos = resultadoCopia.novos; // Atualiza com os pendentes
            } else {
              this.logger.debug(
                `[SOC] Nenhuma ficha anterior encontrada para ${ficha.NOMEFUNCIONARIO}`,
              );
            }
          }
        }

        if (agendamentoDestaData) {
          // ===== CENÁRIO 1: Prontuário desta data JÁ EXISTE (merge no mesmo dia) =====
          this.logger.debug(
            `[SOC] Documento desta data já existe - ATUALIZAÇÃO VIA MERGE 2.0 - ${ficha.NOMEFUNCIONARIO}`,
          );

          // Usa o motor inteligente de Merge
          ultimoAgendamento = await this.aplicarMergeAgendamento(
            agendamentoDestaData,
            examesNovos, // Estes são os que acabaram de vir do SOC (Exames Base Pedidos)
            riscos,
            examesCopiados,
            ficha,
          );

          this.logger.debug(
            `[SOC] Documento atualizado com sucesso (Merge Concluído) - ${ficha.NOMEFUNCIONARIO}`,
          );
        } else {
          // ===== CENÁRIO 2: NOVO prontuário (nova data) =====
          this.logger.debug(
            `[SOC] Novo documento - CRIANDO - ${ficha.NOMEFUNCIONARIO}`,
          );

          // 6. Preparar documento base
          const dataMaped = mapPedidoExameToSchedulingDocument(
            ficha,
            codigoInternoEmpresa,
          );
          const scheduleToInsert = new SchedulingClass(dataMaped);
          scheduleToInsert.CODIGOPRONTUARIO = codigoProntuario;

          if (riscos) {
            scheduleToInsert.RISCOSASO = riscos;
          }

          // 7. Combina exames copiados + novos pendentes
          scheduleToInsert.EXAMES = [...examesCopiados, ...examesNovos].sort(
            (a, b) => a.nomeExame.localeCompare(b.nomeExame, 'pt-BR'),
          );

          // 8. Em retorno em outra data, os laudos anteriores entram como ANEXOS
          if (anexosLaudosRetorno.length > 0) {
            scheduleToInsert.ANEXOS = anexosLaudosRetorno;
          }

          // 9. Inserir novo documento (com proteção contra duplicidade)
          try {
            const insertResult =
              await this.mongoService.schedulingsCollection.insertOne(
                scheduleToInsert,
              );

            if (insertResult.insertedId) {
              ultimoAgendamento =
                await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
                  {
                    _id: insertResult.insertedId,
                  },
                );
            }

            this.logger.debug(
              `[SOC] Documento criado com sucesso - ${ficha.NOMEFUNCIONARIO}`,
            );
          } catch (insertError: any) {
            if (insertError?.code === 11000) {
              this.logger.warn(
                `[SOC] Duplicidade detectada (CODIGOPRONTUARIO=${codigoProntuario}) - buscando documento existente - ${ficha.NOMEFUNCIONARIO}`,
              );

              ultimoAgendamento =
                await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
                  { CODIGOPRONTUARIO: codigoProntuario },
                );
            } else {
              throw insertError;
            }
          }
        }

        const duration = Date.now() - startTime;
        this.logger.log({
          event: 'SOC_PATIENT_PROCESSED',
          patient: ficha.NOMEFUNCIONARIO,
          prontuario: codigoProntuario,
          exams: totalExamesNoPedido,
          duration,
        });
      } catch (error) {
        this.logger.error(
          `❌ Erro ao processar SEQUENCIAFICHA ${sequenciaFicha}:`,
          error,
        );
      }
    }

    return ultimoAgendamento;
  }

  /**
   * Sincroniza exames de outra data com a ficha atual reaproveitando handleExamScheduled.
   */
  async sincronizarExamesOutraData(
    resultadoAtual: SchedulingDocument,
    examesOutraData: PedidoExame[],
  ): Promise<SchedulingDocument> {
    const sequencia = examesOutraData[0].SEQUENCIAFICHA;

    // 1. Buscar ficha anterior
    const fichaAnterior = await this.mongoService.schedulingsCollection.findOne(
      {
        SEQUENCIAFICHA: sequencia,
      },
    );

    // Criar mapa dos exames existentes na ficha anterior
    const mapaExamesAnteriores = new Map<string, any>();
    if (fichaAnterior?.EXAMES?.length) {
      for (const ex of fichaAnterior.EXAMES) {
        mapaExamesAnteriores.set(ex.codigoExame, ex);
      }
    }

    // 2. Aproveitar sua função existente para mapear exames PENDENTES
    const examesBase = await this.handleExamScheduled(examesOutraData);

    // 3. Construir a lista final de exames a adicionar
    const examesParaAdicionar: ExamsScheduled[] = [];

    for (const exame of examesBase) {
      if (mapaExamesAnteriores.has(exame.codigoExame)) {
        // COPIA exame da ficha anterior
        examesParaAdicionar.push({
          ...mapaExamesAnteriores.get(exame.codigoExame),
        });
      } else {
        // Cria exame reaproveitando a estrutura existente
        examesParaAdicionar.push({
          ...exame,
          status: 'AGUARDANDO_RESULTADO',
        });
      }
    }

    // 4. Atualizar a ficha atual
    const filter = { _id: new ObjectId(resultadoAtual._id) };

    const update = {
      $push: { EXAMES: { $each: examesParaAdicionar } },
    } as any;

    await this.mongoService.schedulingsCollection.updateOne(filter, update);

    // 5. Buscar documento atualizado e retornar
    const fichaAtualizada =
      await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
        {
          _id: new ObjectId(resultadoAtual._id),
        },
      );

    return fichaAtualizada!;
  }
}
