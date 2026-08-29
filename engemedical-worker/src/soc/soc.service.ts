import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ICadastroPessoas } from 'src/soc/types/ICadastroPessoas';
import { CadastroEmpresa } from './types/ICadastroEmpresa';
import {
  ResultadoDataFichaExame,
  ResultadoDataFichaExameRequest,
} from './types/IResultadoExameDataFicha';
import { PedidoExame, PedidoExameRequest } from './types/IPedidoExame';
import { ExamsScheduled, SchedulingDocument } from 'src/mongo/types/scheduling';
import { SchedulingClass } from 'src/mongo/model/model';
import { ObjectId } from 'mongodb';
import {
  getExamGroupAndItemByCodigo,
  mapPedidoExameToSchedulingDocument,
  mapUpdateSchedulingWithPedidoExame,
  mergeExamBuffers,
} from 'src/utils/util';
import { executeMergeInteligente } from 'src/utils/merge-engine';
import { MongoService } from 'src/mongo/mongo.service';
import { AtendimentoStatus, ExamStatus } from 'src/mongo/enum/scheduling.enum';
import { PedidoExameSequencialFicha } from './types/PedidoExameSequencialFicha';
import { AsoFuncionario, AsoFuncionarioDto } from './types/IAsoFuncionario';
import { UploadSocged } from 'src/azure/types/azure.types';
import { WsUploadArquivo } from './webservice/upload/WsUploadArquivo';
import { logger } from '@azure/storage-blob';
import { AppRules } from 'src/core/AppRules';

type CodigoEmpresa = string;
export interface HandleUpdateResult {
  success: boolean;
  message: string;
}

@Injectable()
export class SocService {
  private today = new Date().toLocaleDateString('pt-br');

  private url?: string;
  private socCompaniesCache: Record<string, CadastroEmpresa> = {};
  private readonly logger = new Logger(SocService.name);

  /**
   * Cache dos resultados de exames, indexados pelo código da empresa.
   *
   * - Chave (`CodigoEmpresa`): código único da empresa.
   * - Valor (`ResultadoDataFichaExame[]`): lista de resultados vinculados à empresa.
   */
  private cacheResultadoDataFichaExame: Record<
    CodigoEmpresa,
    ResultadoDataFichaExame[]
  > = {};

  constructor(
    private readonly configService: ConfigService,
    private readonly mongoService: MongoService,
  ) {
    this.url = this.configService.get<string>('SOC_ED_CADASTRO_EMPRESAS_URL');
  }

  async onModuleInit() {
    // this.handleUpdateSocToMongo() // Função para atualizar agendamentos rodar todo inicio do dia...
    //   .catch((err) => Logger.fatal('Erro ao atualizar SOC para MongoDB', err))
    //   .finally(() =>
    //     Logger.log('✅ Finalizado processo de atualização SOC para MongoDB'),
    //   );
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
    const {
      empresa = '',
      funcionario = '',
      dataInicio = this.today,
      dataFim = this.today,
    } = request;

    const codigosDeExames = [
      'clinico',
      'EXM1', // Gestão vencimento
      '51.01.004-6', // Audiometria
      '50.01.001-8', // Acuidade visual
      '20221407', // Acuidade Ishihara
      '28011023', // Hemoglobina
      '02020', // Toxicologico
      '28.01.097-3', // Glicemia
      '28.04.048-1', // Hemograma
      '111', // Coluna lombo-sacra
      '20.01.001-0', // ECG
      '22010017', // EEG
      '19.01.029-0', // Espirometria
      '32050070', // RX Tórax
      '12200', // Tomografia
      '225588', // Psicossocial
      '28.01.054-0', // Creatinina
      '28100239', // Cultura
      '28030141', // Parasitológico
      '28.01.136-8', // TGO
      '28.01.137-6', // TGP
    ];

    for (const codigo of codigosDeExames) {
      const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro={"empresa":"16459","codigo":"208636","chave":"2b11b1211e2258516d3f","tipoSaida":"json","dataInicio":"${dataInicio}","datafim":"${dataFim}","codexame":"${codigo}"}`;

      try {
        const response = await fetch(url);

        if (!response.ok) {
          console.error(
            'Falha na requisição no exporta dados resultados de exames todas as empresas',
            await response.text(),
          );
          return;
        }

        const responseBuff = await response.arrayBuffer();
        const responseDecode = new TextDecoder('iso-8859-1').decode(
          responseBuff,
        );
        let responseJson: ResultadoDataFichaExame[] =
          JSON.parse(responseDecode);

        if (responseJson.length > 0) {
          // Caso houver empresa e funcionario, filtra o resultado
          if (funcionario && empresa) {
            responseJson = responseJson.filter(
              (r) => r.EMPRESA === empresa && r.CODFUNCIONARIO === funcionario,
            );

            // SE ENCONTROU O FUNCIONÁRIO, ENCERRA O LOOP
            if (responseJson.length > 0) {
              // Aqui você ainda pode salvar no cache antes de sair, se necessário
              if (this.cacheResultadoDataFichaExame[empresa])
                this.cacheResultadoDataFichaExame[empresa].push(
                  ...responseJson,
                );
              else this.cacheResultadoDataFichaExame[empresa] = responseJson;

              console.log(
                `Funcionário ${funcionario} encontrado no exame ${codigo}.`,
              );
              console.log(
                'cache resultado data ficha',
                this.cacheResultadoDataFichaExame[empresa],
              );
              break;
            }
          }

          // Agrupamento padrão, se não filtrou por funcionário
          const agrupado = responseJson.reduce<
            Record<string, ResultadoDataFichaExame[]>
          >((acc, ficha) => {
            if (!acc[ficha.EMPRESA]) acc[ficha.EMPRESA] = [];
            acc[ficha.EMPRESA].push(ficha);
            return acc;
          }, {});

          for (const [empresa, fichas] of Object.entries(agrupado)) {
            if (!this.cacheResultadoDataFichaExame[empresa]) {
              this.cacheResultadoDataFichaExame[empresa] = fichas;
            } else {
              const sequenciasExistentes = new Set(
                this.cacheResultadoDataFichaExame[empresa].map(
                  (f) => f.SEQUENCIAFICHA,
                ),
              );

              for (const ficha of fichas) {
                if (!sequenciasExistentes.has(ficha.SEQUENCIAFICHA)) {
                  this.cacheResultadoDataFichaExame[empresa].push(ficha);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error(
          'Um erro ocorreu no exporta dados ficha todas as empresas',
          e,
        );
      }
    }
  }

  /**
   * Exporta os pedidos de exames de uma empresa.
   *
   * ⚠️ Observação:
   *
   * - Caso não sejam informados `dataInicio` e `dataFim`, ambos assumem a data atual.
   *
   * @param request Objeto {@link PedidoExameRequest} contendo os parâmetros da busca:
   *   - `empresa`: Código da empresa
   *   - `funcionario` (opcional): Código do funcionário para filtro
   *   - `dataInicio` (opcional): Data inicial do filtro (default: data atual)
   *   - `dataFim` (opcional): Data final do filtro (default: data atual)
   *
   * @returns Lista de {@link PedidoExame}, ou `void` caso não haja resultados.
   */
  public async EdPedidoExame(
    request: PedidoExameRequest,
  ): Promise<void | PedidoExame[] | { success; message }> {
    const {
      empresa,
      funcionario = '',
      dataInicio = this.today,
      dataFim = this.today,
    } = request;

    const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro={"empresa":"${empresa}","codigo":"161440","chave":"3d0851191bdd7e498167","tipoSaida":"json","paramSequencial":"","sequenciaFicha":"","funcionarioInicio":"1","funcionarioFim":"999999999","paramData":"1","dataInicio":"${dataInicio}","dataFim":"${dataFim}","paramFunc":"","cpffuncionario":"","nomefuncionario":"","codpresta":"","nomepresta":"","paramPresta":"","codunidade":"","nomeunidade":"","paramUnidade":""}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          'Falha na requisição no exporta dados PEDIDO DE EXAME',
          await response.text(),
        );
        return;
      }

      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);

      // Se a resposta não for JSON válido (ex.: "De..."), loga e retorna
      if (decoded.startsWith('De')) {
        console.error('Resposta inesperada:', decoded);
        return;
      }

      // Se a empresa não autorizou a clínica (mensagem contendo o erro de perfil do procurador)
      if (
        decoded.includes(
          'O procurador não possui perfil com autenção de acesso à Web',
        ) ||
        decoded.includes('O procurador não possui perfil')
      ) {
        this.logger.warn(
          `[SOC] Empresa ${empresa} desconsiderada: Procurador não possui perfil com autenticação de acesso à Web.`,
        );
        delete this.cacheResultadoDataFichaExame[empresa];
        return;
      }

      let responseJson: PedidoExame[];
      try {
        responseJson = JSON.parse(decoded);
      } catch (e) {
        console.error(
          'Erro ao converter resposta em JSON',
          e,
          decoded.slice(0, 200),
        );
        return;
      }

      if (!responseJson || responseJson.length === 0) {
        return;
      }

      if (funcionario != '') {
        responseJson = responseJson.filter(
          (r) => r.CODIGOFUNCIONARIO === funcionario,
        );
      }

      const responseJsonToday = responseJson.filter(
        (e) => e.DATAEXAME === this.today || e.DATAEXAME === '',
      );

      return this.handleUpdates(empresa, responseJsonToday).finally(() =>
        console.log(
          `Pedidos gerados ${responseJson[0]?.NOMEEMPRESA} ${responseJson?.length}`,
        ),
      );
    } catch (e) {
      console.error('Erro ao processar exporta dados pedido de exame', e, url);
    }
  }

  /**
   * Função que mapeia exames agendados e chama exporta dados `Pedido de Exame pelo Sequencial da ficha(WS Resultado de exames)`
   * para vincular o `sequencial resultado` no exames do pedido.
   * @param resultados
   * @returns
   */
  private async handleExamScheduled(
    resultados: PedidoExame[],
  ): Promise<ExamsScheduled[]> {
    if (!resultados || resultados.length === 0) {
      return [];
    }

    const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro={"empresa":'16459',"codigo":"193601","chave":"8ce693447b44481c7438","tipoSaida":"json","sequencial":"${resultados[0].SEQUENCIAFICHA}","empresaTrabalho":"${resultados[0].CODIGOEMPRESA}"}`;

    let codigosSequenciaisResultados: PedidoExameSequencialFicha[] = [];
    let response: Response | undefined;
    const maxRetries = 1; // Para um total de 2 tentativas (0 e 1)
    const timeoutMs = 15000; // Tempo limite total da requisição (ex: 15 segundos)
    const delayMs = 1000; // Intervalo de 1 segundo entre as tentativas

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[SOC] Tentativa ${attempt + 1}/${maxRetries + 1} de buscar dados para ficha ${resultados[0].SEQUENCIAFICHA}...`,
        );

        // Usamos AbortSignal.timeout para controlar o tempo limite total da requisição.
        response = await fetch(url, {
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.ok) {
          // Sucesso na requisição: processa o JSON e sai do loop.
          codigosSequenciaisResultados = await response.json();
          break;
        } else {
          // Resposta HTTP falhou (ex: 404, 500)
          if (response.status >= 500 && attempt < maxRetries) {
            // Erro de servidor (5xx): tenta novamente.
            throw new Error(
              `Servidor SOC retornou erro HTTP ${response.status}. Retentando...`,
            );
          }

          console.error(
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
          console.warn(
            `[SOC] Falha na Tentativa ${attempt + 1}: ${errorName}. Esperando ${delayMs}ms para retentar...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delayMs)); // Espera o tempo definido
        } else {
          console.error(
            `[SOC] Falha CRÍTICA após ${maxRetries + 1} tentativas. Erro final:`,
            error.message,
          );
          return [];
        }
      }
    }

    // Lógica de processamento dos resultados
    const results: ExamsScheduled[] = [];
    for (const item of resultados) {
      const hasCode = codigosSequenciaisResultados.find(
        (c) => c.CODIGOEXAME === item.CODIGOINTERNOEXAME,
      )?.SEQUENCIALRESULTADO;

      const exame: ExamsScheduled = {
        codigoExame: item.CODIGOINTERNOEXAME,
        nomeExame: item.NOMEEXAME,
        status: ExamStatus.PENDENTE,
        dataExame: null,
        preparacao: '',
        profissional: '',
        sala: '',
        sequencialResultadoExame: hasCode ?? '',
        url: '',
        grupo: getExamGroupAndItemByCodigo(item.CODIGOINTERNOEXAME)?.grupo,
      };

      results.push(exame);
    }

    return results;
  }

  /**
   * Função que executa a atualização da lista de pedidos para o modelo
   * {@link SchedulingDocument}
   * @param empresa
   * @param pedidosEmpresa
   * @returns
   */
  private async handleUpdates(empresa: string, pedidosEmpresa: PedidoExame[]) {
    const funcionariosComFichas = this.cacheResultadoDataFichaExame[empresa];

    if (pedidosEmpresa && pedidosEmpresa.length > 0 && funcionariosComFichas) {
      for (const ficha of funcionariosComFichas) {
        const pedidosFuncionario = pedidosEmpresa.filter(
          (p) => p.SEQUENCIAFICHA === ficha.SEQUENCIAFICHA,
        );
        if (pedidosFuncionario.length > 0) {
          const examesNovosSoc =
            await this.handleExamScheduled(pedidosFuncionario);

          const code = ficha.EMPRESA + ficha.CODFUNCIONARIO + ficha.TIPOFICHA;
          const filter = {
            SCHEDULINGCODE: code.toString(),
            DATAAGENDAMENTO: new Date().toLocaleDateString('pt-br'),
          };

          const hasScheduling =
            await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
              filter,
            );

          // Atualiza ou insere
          if (hasScheduling) {
            const update = mapUpdateSchedulingWithPedidoExame(
              pedidosFuncionario[0],
            );

            // Preserva o status de atendimento atual (nunca regride para AGENDADO)
            const statusSeguro =
              hasScheduling.ATENDIMENTOSTATUS === AtendimentoStatus.AGENDADO ||
              !hasScheduling.ATENDIMENTOSTATUS
                ? AtendimentoStatus.AGENDADO
                : hasScheduling.ATENDIMENTOSTATUS;

            // Motor de Merge Inteligente — idêntico ao cmso360-backend-estavel
            // Preserva grupo, url, formulário, assinaturas, status para exames existentes
            const { finais, resumo } = executeMergeInteligente(
              hasScheduling.EXAMES || [],
              examesNovosSoc,
              [], // sem herança no worker (ficha do dia)
            );

            console.log(
              `[SOC] Merge concluído para ${ficha.CODFUNCIONARIO}: ${resumo.preservados} preservados, ${resumo.adicionados} adicionados, ${resumo.removidos} removidos`,
            );

            update.EXAMES = finais;
            (update as any).ATENDIMENTOSTATUS = statusSeguro;

            await this.mongoService.schedulingsCollection.findOneAndUpdate(
              filter,
              { $set: update },
            );
          } else {
            const dataMaped = mapPedidoExameToSchedulingDocument(
              pedidosFuncionario[0],
            );
            const scheduleToInsert = new SchedulingClass(dataMaped);
            scheduleToInsert.EXAMES = examesNovosSoc;
            await this.mongoService.schedulingsCollection.insertOne(
              scheduleToInsert,
            );
          }
        }
      }
    } else {
      console.error('handleUpdate: pedidos de exame não possuí registros...');
    }
  }

  //  ---------------------------------------------------------
  //  Função principal para atualização SOC x Mongo
  // ----------------------------------------------------------
  async handleUpdateSocToMongo() {
    await this.EdResultadoExamesTodasEmpresas({});
    const listaEmpresas = Object.keys(this.cacheResultadoDataFichaExame);

    for (const empresa of listaEmpresas) {
      await this.EdPedidoExame({ empresa });
      await new Promise((resolve) => setTimeout(resolve, 550)); // pausa entre as requisições
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async sendUploadSocgedWs(payload: UploadSocged) {
    // -------------------------------
    // Constantes de configuração
    // -------------------------------
    const TIMEOUT_INICIAL_MS = 30000; // 30 segundos de espera inicial
    await this.sleep(TIMEOUT_INICIAL_MS);

    // buscamos pelo _id se enviado - facilita rastreio em logs
    let scheduling: SchedulingDocument | null = null;

    if (payload.schedulingId) {
      scheduling =
        await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
          { _id: new ObjectId(payload.schedulingId) },
        );
    }

    if (!scheduling) {
      // fallback para sequência antiga
      scheduling =
        await this.mongoService.schedulingsCollection.findOne<SchedulingDocument>(
          { SEQUENCIAFICHA: payload.sequencialFicha },
        );
    }

    if (!scheduling) {
      throw new Error('Agendamento não encontrado');
    }

    // mergeExamBuffers já valida presença de exames e PDF; não filtramos por
    // status aqui para não invalidar mensagens que o back já considerou
    // elegíveis.

    const buff = await mergeExamBuffers(scheduling, false);

    if (!buff || buff.length === 0) {
      throw new Error('Timeout aguardando geração do PDF para upload');
    }

    // -------------------------------
    // Upload
    // -------------------------------
    payload.arquivo = buff;

    await WsUploadArquivo(payload);

    this.logger.log(`[SOC SERVICE] Upload SOCGED realizado com sucesso`);
  }
}
