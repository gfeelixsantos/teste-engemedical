import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { promises as fs } from 'fs';
import { BryVerificationResponse } from './bry-verification.types';

export type KmsType = 'PSC' | 'BRYKMS';

type PscKmsData = {
  token: string;
  url: string;
};

type BryKmsData = {
  uuid_cert?: string;
  user?: string;
  pin?: string;
  token?: string;
};

export interface SignPdfOptions {
  pdfBuffer: Buffer;
  kmsType: KmsType;
  kmsData: PscKmsData | BryKmsData;
  signatureImageBuffer?: Buffer | null;
  includeVisualRepresentation?: boolean;
}

@Injectable()
export class BryClientService {
  private readonly logger = new Logger(BryClientService.name);

  private tokenCache: { accessToken: string; expiresAt: number } | null = null;

  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.tokenCache && this.tokenCache.expiresAt > now) {
      this.logger.debug(
        'Token OAuth2 de aplicacao em cache valido, reutilizando',
      );
      return this.tokenCache.accessToken;
    }

    this.logger.log(
      'Gerando novo token de acesso (Application JWT) para BRy Cloud...',
    );

    const authUrl = process.env.BRY_AUTH_URL;
    const clientId = process.env.BRY_CLIENT_ID;
    const clientSecret = process.env.BRY_CLIENT_SECRET;

    if (!authUrl || !clientId || !clientSecret) {
      throw new Error(
        'Variaveis BRY_AUTH_URL, BRY_CLIENT_ID ou BRY_CLIENT_SECRET ausentes no .env do worker.',
      );
    }

    const bodyParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    try {
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const responseText = await response.text();

      if (!response.ok) {
        this.logger.error(
          `Erro na autenticacao de aplicacao: ${response.status} - ${responseText}`,
        );
        throw new Error(
          `Falha na autenticacao da Aplicacao BRy: ${response.status}`,
        );
      }

      const data = JSON.parse(responseText);
      const expiresIn = data.expires_in || 3600;

      const marginSeconds = 300;
      this.tokenCache = {
        accessToken: data.access_token,
        expiresAt: now + (expiresIn - marginSeconds) * 1000,
      };

      this.logger.log('Token Application JWT gerado com sucesso.');
      return this.tokenCache.accessToken;
    } catch (error) {
      this.logger.error(
        `Erro ao gerar token application JWT: ${error.message}`,
      );
      throw error;
    }
  }

  async assinarPdfBry(
    pdfBuffer: Buffer,
    token: string,
    sessionIntegraUrl: string,
  ): Promise<Buffer> {
    return this.signPdfWithKms({
      pdfBuffer,
      kmsType: 'PSC',
      kmsData: {
        token,
        url: sessionIntegraUrl,
      },
    });
  }

  async signPdfWithKms(options: SignPdfOptions): Promise<Buffer> {
    const { pdfBuffer, kmsType, kmsData } = options;
    const bryHubUrlEnv = process.env.BRY_HUB_URL;
    const bryIntegraUrlEnv = process.env.BRY_INTEGRA_URL;

    if (!bryHubUrlEnv || !bryIntegraUrlEnv) {
      throw new Error(
        'FALHA CRITICA DE CONFIGURACAO: Variaveis BRY_HUB_URL ou BRY_INTEGRA_URL ausentes no .env.',
      );
    }

    if (kmsType === 'PSC') {
      const sessionIntegraUrl = (kmsData as PscKmsData).url;
      const isHomologSession = sessionIntegraUrl.includes('.hom.');
      const isHomologEnv = bryIntegraUrlEnv.includes('.hom.');

      if (isHomologSession !== isHomologEnv) {
        throw new Error(
          `FALHA DE COERENCIA AMBIENTAL: Tentativa de assinar sessao de ${isHomologSession ? 'Homologacao' : 'Producao'} usando ambiente de ${isHomologEnv ? 'Homologacao' : 'Producao'}.`,
        );
      }
    } else {
      this.validateBryKmsData(kmsData as BryKmsData);
    }

    const appToken = await this.getAccessToken();

    this.logger.log('===== DIAGNOSTICO DE ASSINATURA BRY HUB =====');
    this.logger.log(`Base Integra (.env): ${bryIntegraUrlEnv}`);
    this.logger.log(`Base HUB (.env): ${bryHubUrlEnv}`);
    this.logger.log(`KMS Type: ${kmsType}`);
    this.logger.log(`Size do PDF recebido: ${pdfBuffer.byteLength} bytes`);
    this.logger.log(
      `Montagem Authorization Header: Bearer ${appToken ? '(Gerado/Cacheado)' : 'FALHA'}`,
    );
    this.logger.log('===============================================');

    try {
      const formData = new FormData();
      formData.append('documento', pdfBuffer, {
        filename: 'documento.pdf',
        contentType: 'application/pdf',
      });

      const dadosAssinatura = {
        perfil: 'COMPLETA',
        algoritmoHash: 'SHA256',
        formatoAssinatura: 'PADES',
        kms_data: kmsData,
      };

      formData.append('dados_assinatura', JSON.stringify(dadosAssinatura));

      const includeVisual = options.includeVisualRepresentation !== false;

      if (includeVisual) {
        const configImagem = [
          {
            altura: 14,
            largura: 64,
            coordenadaX: 48,
            coordenadaY: 26,
            posicao: 'INFERIOR_ESQUERDO',
            pagina: 'ULTIMA',
          },
        ];
        formData.append('configuracao_imagem', JSON.stringify(configImagem));

        const imageBuffer =
          options.signatureImageBuffer ||
          (await this.loadSignatureImageBuffer());
        if (imageBuffer) {
          formData.append('imagem', imageBuffer, {
            filename: 'logo-cmso.png',
            contentType: 'image/png',
          });
        }
      }

      const signerPath =
        process.env.BRY_SIGNER_PATH || '/fw/v1/pdf/kms/lote/assinaturas';
      const urlHub = `${bryHubUrlEnv}${signerPath}`;

      this.logger.log(
        `Submetendo FormData (Axios) para: ${urlHub} | Headers: Authorization, kms_type: ${kmsType}`,
      );

      const response = await axios.post(urlHub, formData, {
        headers: {
          Authorization: `Bearer ${appToken}`,
          kms_type: kmsType,
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer',
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 15000,
      });

      const contentType = response.headers['content-type'] || '';
      let finalBuffer: Buffer;

      if (contentType.includes('application/json')) {
        this.logger.log(
          'Resposta JSON recebida da API BRy. Processando link de download do PDF assinado...',
        );
        const jsonResponse = JSON.parse(response.data.toString('utf-8'));
        const document = jsonResponse.documentos?.[0];

        if (document?.links?.[0]?.href) {
          const downloadUrl = document.links[0].href;
          this.logger.log(
            `Baixando PDF assinado resultante do link: ${downloadUrl}`,
          );

          const downloadResponse = await axios.get(downloadUrl, {
            headers: { Authorization: `Bearer ${appToken}` },
            responseType: 'arraybuffer',
            timeout: 15000,
          });

          finalBuffer = Buffer.from(downloadResponse.data);
        } else if (
          jsonResponse.conteudo ||
          jsonResponse.pdf ||
          jsonResponse.documento
        ) {
          const base64Data =
            jsonResponse.conteudo || jsonResponse.pdf || jsonResponse.documento;
          finalBuffer = Buffer.from(base64Data, 'base64');
        } else {
          throw new Error(
            'Retorno da API BRy nao conteve link "href" para download do PDF assinado.',
          );
        }
      } else {
        this.logger.log('Resposta binaria direta recebida da API BRy.');
        finalBuffer = Buffer.from(response.data);
      }

      this.logger.log(
        `PDF assinado retornado com sucesso. (Tamanho: ${finalBuffer.byteLength} bytes).`,
      );
      return finalBuffer;
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response) {
        const errorData = e.response.data
          ? Buffer.from(e.response.data).toString('utf-8')
          : e.message;
        this.logger.error(
          `Erro na assinatura BRy HUB Axios: ${e.response.status} - ${errorData}`,
        );

        if (
          kmsType === 'PSC' &&
          (errorData.includes('expired or completed') ||
            errorData.includes('operation for id not found'))
        ) {
          this.logger.error(
            'ERRO CRITICO: Token PSC expirado ou ja utilizado. Requer nova autenticacao.',
          );
          const error = new Error(
            'TOKEN_EXPIRED_OR_CONSUMED: Token PSC expirado, consumido ou ja utilizado. Autentique-se novamente.',
          );
          (error as any).status = 400;
          throw error;
        }

        const error = new Error(
          `BRy HUB API Error: ${e.response.status} - ${errorData}`,
        );
        (error as any).status = e.response.status;
        throw error;
      }

      this.logger.error(`Falha conectando ao BRy HUB Signer: ${e.message}`);
      throw e;
    }
  }

  async verifyPdfSignature(
    pdfBuffer: Buffer,
    fileName: string,
  ): Promise<BryVerificationResponse> {
    const bryHubUrlEnv = process.env.BRY_HUB_URL;

    if (!bryHubUrlEnv) {
      throw new Error(
        'FALHA CRITICA DE CONFIGURACAO: Variavel BRY_HUB_URL ausente no .env.',
      );
    }

    const appToken = await this.getAccessToken();
    const formData = new FormData();

    formData.append('nonce', '1');
    formData.append('signatures[0][nonce]', '1');
    formData.append('signatures[0][content]', pdfBuffer, {
      filename: fileName,
      contentType: 'application/pdf',
    });
    formData.append('contentsReturn', 'false');

    const verifyUrl = `${bryHubUrlEnv}/api/pdf-verification-service/v1/signatures/verify`;

    const response = await axios.post(verifyUrl, formData, {
      headers: {
        Authorization: `Bearer ${appToken}`,
        ...formData.getHeaders(),
      },
      timeout: 30000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const data = response.data;
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as BryVerificationResponse;
    }

    return data as BryVerificationResponse;
  }

  private validateBryKmsData(kmsData: BryKmsData) {
    const hasIdentity = !!kmsData.uuid_cert || !!kmsData.user;
    const hasSecret = !!kmsData.pin || !!kmsData.token;

    if (!hasIdentity) {
      throw new Error('BRYKMS requires uuid_cert or user in kms_data.');
    }

    if (!hasSecret) {
      throw new Error('BRYKMS requires pin or token in kms_data.');
    }
  }

  private async loadSignatureImageBuffer(): Promise<Buffer | null> {
    const imagePath = process.env.BRY_SIGNATURE_IMAGE_PATH;
    if (imagePath) {
      try {
        return await fs.readFile(imagePath);
      } catch (error) {
        this.logger.warn(
          `Falha ao carregar imagem local BRY_SIGNATURE_IMAGE_PATH: ${error.message}`,
        );
      }
    }

    const imageUrl = process.env.BRY_SIGNATURE_IMAGE_URL;
    if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        this.logger.warn(
          `Falha ao baixar imagem BRY_SIGNATURE_IMAGE_URL: ${error.message}`,
        );
      }
    }

    return null;
  }
}
