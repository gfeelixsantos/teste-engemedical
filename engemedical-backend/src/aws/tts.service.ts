import { Injectable, Logger } from '@nestjs/common';
import { PollyService } from './polly.service';
import { PainelCall } from 'src/painel/painel.interface';
import { Ticket } from 'src/ticket/interfaces/ticket';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  constructor(private readonly pollyService: PollyService) {}

  async synthesize(chamada: PainelCall): Promise<string | undefined> {
    this.logger.log(`Iniciando síntese para ticket: ${chamada.ticket}`);

    // Principal: AWS Polly
    try {
      this.logger.log('Tentando AWS Polly...');
      const pollyAudio = await this.pollyService.synthesize(chamada);
      if (pollyAudio) {
        this.logger.log(`AWS Polly gerado com sucesso: ${pollyAudio}`);
        return pollyAudio;
      }
    } catch (error) {
      this.logger.error('Falha no AWS Polly:', error);
    }

    // Se falhar, retorna undefined para que o frontend use o fallback do navegador
    this.logger.warn(
      'Serviço de TTS do backend falhou. Retornando para fallback do navegador.',
    );
    return undefined;
  }

  deleteAudio(ticket: Ticket): void {
    try {
      this.pollyService.deleteMp3(ticket);
    } catch (err) {
      this.logger.error('Erro ao excluir arquivos de áudio', err);
    }
  }
}
