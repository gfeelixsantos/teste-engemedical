import { Injectable, Logger } from '@nestjs/common';
import { DequeuedMessageItem } from '@azure/storage-queue';
import { AzureBaseWorker } from '../azure-worker';
import { WsIncluirPedidoExame } from '../../soc/webservice/incluir/WsIncluirPedidoExame';
import { EdPedidoExame } from '../../soc/exports/EdPedidoExame';
import { EdPedidoExamePeloSequencialFicha } from '../../soc/exports/EdPedidoExamePeloSequencialFicha';
import { WsIncluirAso } from '../../soc/webservice/incluir/WsIncluirAso';
import { WsResultadoExame } from '../../soc/webservice/incluir/WsResultadoExame';
import { EmailService } from '../../nodemailer/nodemailer.service';
import { runWithContext } from 'src/core/logger/async-storage';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class AzureAsoGenerationWorkerService extends AzureBaseWorker {
  protected queueName =
    process.env.AZURE_QUEUE_ASO_PROCESSING || 'aso-processing';
  protected readonly MAX_CONCURRENT_MESSAGES = 2;
  protected readonly RECEIVE_BATCH_SIZE = 1;
  protected readonly DELAY_BETWEEN_MESSAGES = 2000;
  protected readonly POLLING_INTERVAL_MS = 3000;

  protected isWorkerEnabled(): boolean {
    return true;
  }

  constructor(
    private readonly emailService: EmailService,
  ) {
    super();
  }

  protected async handleMessage(message: DequeuedMessageItem): Promise<void> {
    let payload: any;
    try {
      payload = JSON.parse(message.messageText);
    } catch (parseError: any) {
      this.logger.error(
        `[aso-generation] Payload inválido: ${parseError?.message}`,
      );
      return;
    }

    const employee = payload;

    if (!employee.exames?.length) {
      this.logger.error(
        `[aso-generation] Funcionário ${employee.nome} não possui exames para abertura de ASO`,
      );
      await this.notifyError(employee, 'Funcionário sem exames');
      return;
    }

    await runWithContext(
      {
        companyId: employee.codigoempresa,
        examId: employee.schedulingId || employee.idprocesso,
        patient: employee.nome,
      },
      async () => {
        await this.processAsoGeneration(employee);
      },
    );
  }

  private async processAsoGeneration(employee: any): Promise<void> {
    this.logger.log(
      `[aso-generation] Iniciando geração ASO para ${employee.nome}`,
    );

    try {
      // Fase 1: Criar pedido de exame no SOC (até 3 tentativas)
      this.logger.log(`[aso-generation] Fase 1: Iniciando criacao de pedido de exame para ${employee.nome}`);
      let pedidoCriado = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await WsIncluirPedidoExame(employee);
          pedidoCriado = true;
          this.logger.log(`[aso-generation] Fase 1: Pedido de exame criado na tentativa ${attempt}`);
          break;
        } catch (err: any) {
          this.logger.warn(
            `[aso-generation] Fase 1: Falha ao criar pedido (tentativa ${attempt}/3): ${err?.message}`,
          );
          if (attempt < 3) await delay(2000);
        }
      }

      if (!pedidoCriado) {
        throw new Error('Falha ao criar pedido de exame após 3 tentativas');
      }

      // Fase 2: Aguardar propagação da export e obter sequencialFicha (até 10 tentativas, 5s entre cada)
      this.logger.log(
        `[aso-generation] Fase 2: Aguardando propagacao da export 161440 para ${employee.codigoempresa}/${employee.codigo}`,
      );
      let sequencialFicha: string | null = null;
      for (let attempt = 1; attempt <= 10; attempt++) {
        try {
          sequencialFicha = await EdPedidoExame(employee);
          this.logger.log(
            `[aso-generation] Fase 2: Sequencial ficha obtido na tentativa ${attempt}: ${sequencialFicha}`,
          );
          break;
        } catch (err: any) {
          this.logger.warn(
            `[aso-generation] Fase 2: Export ainda não propagada (tentativa ${attempt}/10), aguardando 5s...`,
          );
          if (attempt < 10) await delay(5000);
        }
      }

      if (!sequencialFicha) {
        throw new Error(
          'Pedido de exame não encontrado na export após 10 tentativas',
        );
      }

      // Fase 3: Registrar ASO e resultados (até 3 tentativas)
      this.logger.log(
        `[aso-generation] Fase 3: Iniciando registro de ASO para sequencialFicha ${sequencialFicha}`,
      );
      let lastError: unknown;
      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await WsIncluirAso(employee, sequencialFicha);
          this.logger.log(`[aso-generation] Fase 3: ASO registrado na tentativa ${attempt}`);

          const resultados = await EdPedidoExamePeloSequencialFicha(
            employee,
            sequencialFicha,
          );
          this.logger.log(
            `[aso-generation] Fase 3: ${resultados.length} resultados encontrados para o sequencial ${sequencialFicha}`,
          );

          for (const resultado of resultados) {
            await WsResultadoExame(employee, sequencialFicha, resultado);
            await delay(1500);
          }

          success = true;
          this.logger.log(
            `[aso-generation] Fase 3: ASO e todos os resultados registrados com sucesso para ${employee.nome}`,
          );
          break;
        } catch (err) {
          lastError = err;
          this.logger.warn(
            `[aso-generation] Fase 3: Falha ao registrar ASO (tentativa ${attempt}/3): ${err instanceof Error ? err.message : err}`,
          );
          if (attempt < 3) await delay(2000);
        }
      }

      if (!success) {
        throw lastError || new Error('Falha ao registrar ASO após 3 tentativas');
      }

      this.logger.log(
        `[aso-generation] ASO gerado com sucesso para ${employee.nome}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[aso-generation] Falha na geração do ASO: ${error?.message}`,
        error,
      );

      await this.notifyError(employee, error?.message);

      throw error;
    }
  }

  private async notifyError(employee: any, errorMessage: string): Promise<void> {
    try {
      await this.emailService.sendEmail({
        from: 'CMSO Agendamento <esocial@cmsocupacional.com.br>',
        to: 'tecnologia@cmsocupacional.com.br',
        subject: `Erro geração ASO - ${employee.nome}`,
        templatename: 'ASO_GENERATION_ERROR',
        template: `<h1>Erro na geração de ASO</h1><p>${errorMessage}</p>`,
        attachment: [],
      });
    } catch (e) {
      this.logger.warn('[aso-generation] Falha ao enviar notificação de erro');
    }
  }
}
