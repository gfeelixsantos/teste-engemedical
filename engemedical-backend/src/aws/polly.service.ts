// src/polly/polly.service.ts
import { Injectable } from '@nestjs/common';
import {
  PollyClient,
  SynthesizeSpeechCommand,
  SynthesizeSpeechCommandInput,
} from '@aws-sdk/client-polly';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PainelCall } from 'src/painel/painel.interface';
import { Ticket } from 'src/ticket/interfaces/ticket';

@Injectable()
export class PollyService {
  private readonly client: PollyClient;

  constructor() {
    this.client = new PollyClient({
      region: 'sa-east-1',
    });
  }

  async synthesize(chamada: PainelCall): Promise<string | undefined> {
    const chamadaModelo =
      chamada.name != '' ? chamada.name : `Senha: ${chamada.ticket}`;

    try {
      const input: SynthesizeSpeechCommandInput = {
        Engine: 'standard',
        LanguageCode: 'pt-BR',
        OutputFormat: 'mp3',
        Text: `${chamadaModelo}, ${chamada.sala}`,
        VoiceId: 'Camila',
      };

      const command = new SynthesizeSpeechCommand(input);
      const response = await this.client.send(command);

      if (!response.AudioStream) {
        throw new Error('No audio stream returned from Polly.');
      }

      const responseByte = await response.AudioStream.transformToByteArray();

      const salaNormalizada = chamada.sala?.replace(/\s/g, '') || '';
      const audioUrl = `temp/audio/${chamada.unidade}_${salaNormalizada}_${chamada.ticket}_${chamada.id}.mp3`;
      const filePath = path.join(process.cwd(), audioUrl);

      // Cria o diretório se ele não existir
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, responseByte);

      return audioUrl;
    } catch (error) {
      console.error('Error generating audio:', error);
    }
  }

  async synthesizeMural(text: string, muralId: string): Promise<string | undefined> {
    if (!text || text.trim() === '') return undefined;

    try {
      const input: SynthesizeSpeechCommandInput = {
        Engine: 'standard',
        LanguageCode: 'pt-BR',
        OutputFormat: 'mp3',
        Text: text,
        VoiceId: 'Camila',
      };

      const command = new SynthesizeSpeechCommand(input);
      const response = await this.client.send(command);

      if (!response.AudioStream) {
        throw new Error('No audio stream returned from Polly.');
      }

      const responseByte = await response.AudioStream.transformToByteArray();
      const audioUrl = `temp/audio/mural_${muralId}_${Date.now()}.mp3`;
      const filePath = path.join(process.cwd(), audioUrl);

      // Cria o diretório se ele não existir
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, responseByte);

      return audioUrl;
    } catch (error) {
      console.error('Error generating audio for Mural:', error);
      return undefined;
    }
  }

  deleteMp3(ticket: Ticket): void {
    try {
      const salaNormalizada = ticket.sala?.replace(/\s/g, '') || '';
      const audioUrl = `temp/audio/${ticket.unidade}_${salaNormalizada}_${ticket.prefixo}${ticket.numero}_${ticket.id}.mp3`;
      const filePath = path.join(process.cwd(), audioUrl);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Erro ao excluir mp3', err);
    }
  }
}
