// src/recovery/blob-recovery.service.ts
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { MongoService } from 'src/mongo/mongo.service';
import { SchedulingDocument } from 'src/mongo/types/scheduling';
import { ExamStatus, AtendimentoStatus } from 'src/mongo/enum/scheduling.enum';
import { ObjectId } from 'mongodb';
import { FuncionarioEntity } from 'src/mongo/model/FuncionarioEntity';

interface RecoveryResult {
  codigoProntuario: string;
  nome: string;
  examesRecuperados: number;
  examesNaoEncontrados: number;
  statusFinal: string;
  asoLiberado: boolean;
}

@Injectable()
export class BlobRecoveryService {
  private readonly logger = new Logger(BlobRecoveryService.name);
  private readonly containerName =
    process.env.AZURE_CONTAINER_DOCUMENTS || 'documents';
  private readonly blobConnectionString =
    process.env.AZURE_CONNECTION_STRING_BLOB;

  constructor(
    @Inject(forwardRef(() => MongoService))
    private readonly mongoService: MongoService,
  ) {}

  /**
   * Recupera URLs dos blobs baseado na estrutura conhecida
   */
  async recoverBlobUrls(
    funcionarios: SchedulingDocument[],
  ): Promise<RecoveryResult[]> {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      this.blobConnectionString!,
    );
    const containerClient = blobServiceClient.getContainerClient(
      this.containerName,
    );

    const results: RecoveryResult[] = [];

    for (const funcionario of funcionarios) {
      try {
        const result = await this.recoverSingleDocument(
          funcionario,
          containerClient,
        );
        results.push(result);
      } catch (err) {
        this.logger.error(
          `❌ Erro ao processar ${funcionario.CODIGOPRONTUARIO}: ${err.message}`,
        );
      }
    }

    this.printSummary(results);
    return results;
  }

  /**
   * Recupera blobs de um único documento
   */
  private async recoverSingleDocument(
    funcionarioDoc: SchedulingDocument,
    containerClient: ContainerClient,
  ): Promise<RecoveryResult> {
    this.logger.log(
      `Recuperando: ${funcionarioDoc.NOME} (${funcionarioDoc.CODIGOPRONTUARIO})`,
    );

    const funcionario = new FuncionarioEntity(funcionarioDoc);
    const raw = funcionario.getRaw();

    let examesRecuperados = 0;
    let examesNaoEncontrados = 0;

    // Processa cada exame com grupo definido
    for (let i = 0; i < raw.EXAMES.length; i++) {
      const exame = raw.EXAMES[i];

      // Pula exames sem grupo ou que já tem URL
      if (!exame.grupo || exame.url) continue;

      try {
        const resolvedBlobPath = await this.resolveBlobByGrupo(
          containerClient,
          raw,
          exame.grupo,
        );

        if (resolvedBlobPath) {
          const blobClient =
            containerClient.getBlockBlobClient(resolvedBlobPath);

          funcionario.updateExameAtIndex(i, {
            url: blobClient.url,
            status: ExamStatus.FINALIZADO,
          });

          examesRecuperados++;
          this.logger.log(`  ✅ ${exame.grupo}: URL recuperada`);
        } else {
          examesNaoEncontrados++;
          this.logger.warn(`  ⚠️  ${exame.grupo}: Blob não encontrado`);
        }
      } catch (err) {
        examesNaoEncontrados++;
        this.logger.error(
          `  ❌ ${exame.grupo}: Erro ao buscar blob - ${err.message}`,
        );
      }
    }

    // Atualiza status do atendimento
    const statusFinal = this.determineStatus(funcionario);
    funcionario.setAtendimentoStatus(statusFinal);

    // // Verifica se ASO está liberado
    // const asoLiberado = this.verificarLiberacaoASO(funcionario);

    // // Se ASO liberado, finaliza
    // if (asoLiberado) {
    //   funcionario.setAtendimentoStatus(AtendimentoStatus.FINALIZADO);
    //   this.logger.log(`  🎯 ASO liberado - Status alterado para FINALIZADO`);
    // }
    const asoLiberado = false;
    // Persiste no MongoDB
    await this.persistRecoveredData(funcionario);

    return {
      codigoProntuario: raw.CODIGOPRONTUARIO,
      nome: raw.NOME,
      examesRecuperados,
      examesNaoEncontrados,
      statusFinal: funcionario.getRaw().ATENDIMENTOSTATUS,
      asoLiberado,
    };
  }

  private async resolveBlobByGrupo(
    containerClient: ContainerClient,
    funcionario: SchedulingDocument,
    grupo: string,
  ): Promise<string | null> {
    const dataAgendamento = funcionario.DATAAGENDAMENTO_DATE
      ? new Date(funcionario.DATAAGENDAMENTO_DATE)
      : new Date();

    const ano = dataAgendamento.getFullYear();
    const dia = String(dataAgendamento.getDate()).padStart(2, '0');
    const mes = String(dataAgendamento.getMonth() + 1).padStart(2, '0');
    const dataFormatada = `${dia}${mes}${ano}`;

    const pastaPrefix = `funcionarios/${ano}/${funcionario.CODIGOEMPRESA}-${funcionario.CODIGO}-${funcionario.TIPOEXAME}-${dataFormatada}/`;

    const candidatos = [
      `${dataFormatada}-${grupo}.pdf`,
      `${grupo}.pdf`,
      `${grupo.replace(/\s+/g, '')}.pdf`,
    ];

    // 1. Buscamos todos os blobs na pasta uma única vez (otimização de rede)
    const arquivosEncontrados: string[] = [];

    for await (const blob of containerClient.listBlobsFlat({
      prefix: pastaPrefix,
    })) {
      const nomeArquivo = blob.name.split('/').pop();
      if (nomeArquivo) {
        arquivosEncontrados.push(blob.name);
      }
    }

    // 2. Verificamos na ordem exata do array 'candidatos' para garantir a prioridade
    for (const candidato of candidatos) {
      const pathEncontrado = arquivosEncontrados.find((path) =>
        path.endsWith(candidato),
      );
      if (pathEncontrado) {
        return pathEncontrado; // Retorna o primeiro da lista de prioridade que existir no storage
      }
    }

    return null;
  }

  /**
   * Determina o status do atendimento baseado nos exames
   */
  private determineStatus(funcionario: FuncionarioEntity): AtendimentoStatus {
    const raw = funcionario.getRaw();

    // Se tem exames aguardando resultado
    const temAguardandoResultado = raw.EXAMES.some(
      (e) => e.status === ExamStatus.AGUARDANDO_RESULTADO,
    );

    if (temAguardandoResultado) {
      return AtendimentoStatus.AGUARDANDO_RESULTADOS;
    }

    // Se todos finalizados, aguarda avaliação médica
    const todosFinalizados = raw.EXAMES.every(
      (e) => e.status === ExamStatus.FINALIZADO,
    );

    if (todosFinalizados) {
      return AtendimentoStatus.FINALIZADO;
    }

    const aoMenosUmFinalizado = raw.EXAMES.some(
      (e) => e.status === ExamStatus.FINALIZADO,
    );
    const aoMenosUmPendente = raw.EXAMES.some(
      (e) => e.status === ExamStatus.FINALIZADO,
    );
    if (aoMenosUmFinalizado && aoMenosUmPendente) {
      return AtendimentoStatus.AGUARDANDO_RESULTADOS;
    }

    // Caso contrário, mantém status atual ou em atendimento
    return AtendimentoStatus.AGENDADO;
  }

  /**
   * Verifica se pode liberar ASO automaticamente
   */
  private verificarLiberacaoASO(funcionario: FuncionarioEntity): boolean {
    return (
      funcionario.isAptoSomenteClinico() ||
      funcionario.isAptoClinicoAudiometria() ||
      funcionario.isAptoClinicoAcuidade() ||
      funcionario.isAptoClinicoAudiometriaAcuidade()
    );
  }

  /**
   * Persiste as alterações no MongoDB
   */
  private async persistRecoveredData(
    funcionario: FuncionarioEntity,
  ): Promise<void> {
    const raw = funcionario.getRaw();

    await this.mongoService.schedulingsCollection.findOneAndUpdate(
      { _id: new ObjectId(raw._id) },
      {
        $set: {
          EXAMES: raw.EXAMES,
          ATENDIMENTOSTATUS: raw.ATENDIMENTOSTATUS,
        },
      },
    );

    this.logger.log(`  💾 Documento atualizado`);
  }

  /**
   * Recupera por códigos de prontuário
   */
  async recoverByCodigosProntuario(
    codigos: string[],
  ): Promise<RecoveryResult[]> {
    const funcionarios = await this.mongoService.schedulingsCollection
      .find<SchedulingDocument>({
        CODIGOPRONTUARIO: { $in: codigos },
      })
      .toArray();

    this.logger.log(
      `📋 Encontrados ${funcionarios.length}/${codigos.length} documentos`,
    );

    return await this.recoverBlobUrls(funcionarios);
  }

  /**
   * Recupera documentos sem URL em exames finalizados
   */
  async recoverMissingUrls(filters?: {
    empresas?: string[];
    dataInicio?: Date;
    dataFim?: Date;
    limit?: number;
  }): Promise<RecoveryResult[]> {
    const query: any = {
      EXAMES: {
        $elemMatch: {
          status: ExamStatus.FINALIZADO,
          grupo: { $exists: true, $ne: null },
          $or: [{ url: { $exists: false } }, { url: null }, { url: '' }],
        },
      },
    };

    if (filters?.empresas?.length) {
      query.CODIGOEMPRESA = { $in: filters.empresas };
    }

    if (filters?.dataInicio || filters?.dataFim) {
      query.DATAAGENDAMENTO_DATE = {};
      if (filters.dataInicio) {
        query.DATAAGENDAMENTO_DATE.$gte = filters.dataInicio;
      }
      if (filters.dataFim) {
        query.DATAAGENDAMENTO_DATE.$lte = filters.dataFim;
      }
    }

    let queryBuilder =
      this.mongoService.schedulingsCollection.find<SchedulingDocument>(query);

    if (filters?.limit) {
      queryBuilder = queryBuilder.limit(filters.limit);
    }

    const funcionarios = await queryBuilder.toArray();

    this.logger.log(
      `📋 Encontrados ${funcionarios.length} documentos com URLs faltantes`,
    );

    return await this.recoverBlobUrls(funcionarios);
  }

  /**
   * Verifica status de ASO
   */
  async checkAsoStatus(codigos: string[]): Promise<
    Array<{
      codigoProntuario: string;
      nome: string;
      asoLiberado: boolean;
      statusAtual: AtendimentoStatus;
      detalhes: {
        todosFinalizados: boolean;
        temAguardandoResultado: boolean;
        gruposExames: string[];
      };
    }>
  > {
    const funcionarios = await this.mongoService.schedulingsCollection
      .find<SchedulingDocument>({
        CODIGOPRONTUARIO: { $in: codigos },
      })
      .toArray();

    return funcionarios.map((doc) => {
      const funcionario = new FuncionarioEntity(doc);
      const raw = funcionario.getRaw();

      const todosFinalizados = raw.EXAMES.every(
        (e) => e.status === ExamStatus.FINALIZADO,
      );
      const temAguardandoResultado = raw.EXAMES.some(
        (e) => e.status === ExamStatus.AGUARDANDO_RESULTADO,
      );

      return {
        codigoProntuario: raw.CODIGOPRONTUARIO,
        nome: raw.NOME,
        asoLiberado: this.verificarLiberacaoASO(funcionario),
        statusAtual: raw.ATENDIMENTOSTATUS as AtendimentoStatus,
        detalhes: {
          todosFinalizados,
          temAguardandoResultado,
          gruposExames: [
            ...new Set(raw.EXAMES.map((e) => e.grupo).filter(Boolean)),
          ] as string[],
        },
      };
    });
  }

  /**
   * Imprime resumo
   */
  private printSummary(results: RecoveryResult[]): void {
    const totalRecuperados = results.reduce(
      (sum, r) => sum + r.examesRecuperados,
      0,
    );
    const totalNaoEncontrados = results.reduce(
      (sum, r) => sum + r.examesNaoEncontrados,
      0,
    );
    const totalASOLiberados = results.filter((r) => r.asoLiberado).length;

    this.logger.log(`
╔════════════════════════════════════════════════════════════╗
║                  RESUMO DA RECUPERAÇÃO                     ║
╠════════════════════════════════════════════════════════════╣
║ Documentos processados:         ${results.length.toString().padStart(4)}                  ║
║ Exames recuperados:             ${totalRecuperados.toString().padStart(4)}                  ║
║ Exames não encontrados:         ${totalNaoEncontrados.toString().padStart(4)}                  ║
║ ASOs liberados automaticamente: ${totalASOLiberados.toString().padStart(4)}                  ║
╚════════════════════════════════════════════════════════════╝
    `);

    const liberados = results.filter((r) => r.asoLiberado);
    if (liberados.length > 0) {
      this.logger.log(`\n🎯 ASOs liberados:`);
      liberados.forEach((r) => {
        this.logger.log(`   ${r.codigoProntuario} - ${r.nome}`);
      });
    }
  }
}
