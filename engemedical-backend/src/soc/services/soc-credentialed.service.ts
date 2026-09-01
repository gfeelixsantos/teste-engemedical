import { Injectable, Logger } from '@nestjs/common';
import { ExamsScheduled } from 'src/mongo/types/scheduling';
import { ExamStatus } from 'src/mongo/enum/scheduling.enum';
import { ExameSocnet } from '../types/ExameSocnet';
import { getExamesList, ExamToogle } from 'src/exames/exames.provider';
import { OpenAI } from 'openai';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
} from '../utils/soc-export-data-url';

@Injectable()
export class SocCredentialedService {
  private readonly logger = new Logger(SocCredentialedService.name);
  private readonly azureClient: OpenAI;
  private readonly groqClient: OpenAI;

  constructor() {
    const azureEndpoint = (
      process.env.AZURE_OPENAI_ENDPOINT ||
      'https://cmsoopenai.openai.azure.com/'
    ).replace(/\/openai\/v1\/?$/i, '');
    this.azureClient = new OpenAI({
      baseURL: `${azureEndpoint}/openai/v1/`,
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
    });
    this.groqClient = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  private async callWithFallback(
    messages: { role: string; content: string }[],
    options: any,
  ) {
    try {
      this.logger.debug('[GROQ] Tentando Groq...');
      return await this.groqClient.chat.completions.create({
        model: process.env.GROQ_MODEL || 'qwen/qwen3.6-27b',
        messages,
        ...options,
      });
    } catch (groqError) {
      this.logger.warn(
        `[GROQ] Falhou, fallback Azure: ${groqError?.message || groqError}`,
      );
      return await this.azureClient.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1-mini',
        //@ts-ignore
        messages,
        ...options,
      });
    }
  }

  /**
   * Busca exames de credenciadas baseado no CPF do funcionário.
   */
  async handleCredenciadas(cpf: string): Promise<ExamsScheduled[]> {
    try {
      // Buscar dados no SOC
      const dataInicio = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      }).format(new Date());
      const credentials = getSocExportCredentials('SOC_ED_CREDENCIADAS');
      const url = buildSocExportDataUrl({
        ...credentials,
        tipoSaida: 'json',
        DataInicio: dataInicio,
        empresasFiltro: '',
      });

      const fetchResponse = await fetch(url);
      if (!fetchResponse.ok)
        throw new Error(`Erro HTTP ${fetchResponse.status}`);

      const buffer = await fetchResponse.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);

      let pedidosFuncionario: ExameSocnet[];
      try {
        const json = JSON.parse(decoded);
        pedidosFuncionario = json.filter((r: any) => r['CPF'] === cpf);
      } catch (e) {
        throw new Error('Falha ao decodificar JSON da SOC');
      }

      if (!pedidosFuncionario.length) return [];

      const messages = [
        {
          role: 'system',
          content:
            "Você é um mapeador de exames. Retorne APENAS um array JSON de strings, utilizando EXCLUSIVAMENTE os nomes da chave 'nome' da Tabela de referência.",
        },
        {
          role: 'user',
          content: `Mapeie exames...
          DATA DE REFERÊNCIA: ${dataInicio}
          Texto do PDF: ${JSON.stringify(pedidosFuncionario)}
          Tabela de referência: ${JSON.stringify(getExamesList())}
          Formato esperado: ["Nome 1", "Nome 2"]`,
        },
      ];

      const response = await this.callWithFallback(messages, {
        max_tokens: 300,
        temperature: 0,
      });

      const raw = response.choices[0]?.message?.content ?? '[]';
      const clean = raw.replace(/```json|```/g, '').trim();

      let examesPadronizados: string[];
      try {
        examesPadronizados = JSON.parse(clean);
      } catch {
        examesPadronizados = [];
      }

      // Mapear resultado
      if (!examesPadronizados.length) return [];

      // Opcional: criar índice de lookup rápido
      const exameLookup = new Map<
        string,
        { categoria: string; exame: ExamToogle }
      >();
      for (const [categoria, exames] of Object.entries(getExamesList())) {
        for (const exame of exames) {
          exameLookup.set(exame.nome, { categoria, exame });
        }
      }

      const examesResponse: ExamsScheduled[] = [];
      for (const nome of examesPadronizados) {
        const found = exameLookup.get(nome);
        if (found) {
          examesResponse.push({
            codigoExame: found.exame.codigos[0],
            nomeExame: found.exame.nome,
            status: ExamStatus.PENDENTE,
            dataExame: null,
            preparacao: '',
            profissional: '',
            sala: '',
            sequencialResultadoExame: '',
            url: '',
            grupo: found.categoria,
          });
        }
      }

      return examesResponse;
    } catch (err: any) {
      throw new Error(`Erro ao buscar credenciadas: ${err.message || err}`);
    }
  }
}
