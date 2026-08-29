import { Injectable, Logger } from '@nestjs/common';
import { EmailType } from './types/emailtype';
import { AzureService } from '../azure/azure.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly azureService: AzureService) { }

  /**
   * Envia e-mail enfileirando-o na Azure Queue para processamento no Worker.
   * O Worker será responsável por renderizar o template e enviar via API (Resend/Brevo).
   */
  async sendEmail(mail: EmailType): Promise<void> {
    try {
      this.logger.log(
        `Enfileirando e-mail para ${mail.to} (Template: ${mail.templatename})...`,
      );

      // Posta o payload bruto na fila. O Worker cuidará da renderização.
      await this.azureService.filaEnvioDeEmail(mail);

      this.logger.log(`E-mail enfileirado com sucesso para ${mail.to}`);
    } catch (error) {
      this.logger.error(
        `Falha ao enfileirar e-mail para ${mail.to}: ${error.message}`,
      );
      // Lançamos o erro para que os serviços chamadores saibam que o enfileiramento falhou
      throw error;
    }
  }
}
