import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const SIGNATURE_FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['11111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  6: ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['000', '000', '000', '000', '000', '011', '011'],
};

type EasySignSigner = {
  signerNonce?: string;
  name: string;
  email: string;
  authenticationOptions?: string[];
  typeMessaging?: string[];
  positioningMode?: string;
  personal_identifier?: string;
  personal_identifier_type?: string;
  signatureConfig?: {
    mode: string;
  };
};

type EasySignDocument = {
  documentNonce: string;
  name: string;
  base64Document: string;
  signaturePositions?: Array<{
    signerNonce: string;
    imageNonce?: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
};

type EasySignImage = {
  imageNonce: string;
  image: string;
};

type EasySignRequest = {
  name: string;
  clientName: string;
  signersData: EasySignSigner[];
  documents: EasySignDocument[];
  images?: EasySignImage[];
};

type EasySignResponse = {
  uuid: string;
  status?: string;
  documents?: Array<{
    documentNonce?: string;
    documentUuid?: string;
  }>;
  signers?: Array<{
    status?: string;
    link?: {
      url?: string;
    };
    iframe?: {
      url?: string;
      href?: string;
    };
  }>;
};

type FacialTransaction = {
  sessionId: string;
  transactionId: string;
  redirectUrl: string;
};

type FacialStatusResponse = {
  transactionId: string;
  status: 'PENDENTE' | 'CONCLUIDO' | 'ERRO' | 'CANCELADO';
  resultado?: {
    facialId: string;
    confidence: number;
    liveness: boolean;
    imagemUrl: string;
    imagemHash: string;
  };
};

type IniciarTransacaoArgs = {
  schedulingId: string;
  funcionario: {
    nome: string;
    cpf: string;
    prontuario?: string;
  };
  termoCienciaUrl: string;
  termoCienciaHash: string;
};

export type CreateFacialSignatureSessionArgs = {
  documentBase64: string;
  documentName: string;
  signerName: string;
  signerEmail: string;
  personalIdentifier: string;
  personalIdentifierType?: string;
  signaturePage: number;
};

export type CreateFacialSignatureSessionResult = {
  requestId: string;
  documentNonce: string;
  signatureLink: string;
  positioningModeUsed: 'CREATOR';
};

export type FacialSignatureStatusResult = {
  status: string;
  signerStatus: string;
  isComplete: boolean;
};

@Injectable()
export class FacialService {
  private readonly logger = new Logger(FacialService.name);
  private upngModule: typeof import('@pdf-lib/upng') | null = null;

  private readonly easysignUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly authUrl: string;
  private tokenCache:
    | {
        accessToken: string;
        expiresAt: number;
      }
    | null = null;

  constructor(private readonly configService: ConfigService) {
    this.easysignUrl = this.configService.get<string>('BRY_EASYSIGN_URL', '');
    this.clientId = this.configService.get<string>('BRY_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>('BRY_CLIENT_SECRET', '');
    this.authUrl = this.configService.get<string>('BRY_AUTH_URL', '');
  }

  private getUPNG() {
    if (!this.upngModule) {
      const mod = require('@pdf-lib/upng');
      this.upngModule = mod.default || mod;
    }

    return this.upngModule;
  }

  private async getAuthToken(): Promise<string> {
    const now = Date.now();

    if (this.tokenCache && this.tokenCache.expiresAt > now) {
      return this.tokenCache.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const response = await axios.post(
        this.authUrl,
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const expiresIn = Number(response.data?.expires_in || 3600);
      this.tokenCache = {
        accessToken: response.data?.access_token || '',
        expiresAt: now + Math.max(expiresIn - 300, 60) * 1000,
      };
      return this.tokenCache.accessToken;
    } catch (error) {
      this.logger.error(
        `[FACIAL] Erro ao obter token BRy: ${error.message}`,
        error,
      );
      throw new Error(`Falha ao obter token BRy: ${error.message}`);
    }
  }

  private async makeEasySignRequest<T>(
    endpoint: string,
    init: {
      method: 'GET' | 'POST';
      body?: unknown;
      responseType?: 'json' | 'arraybuffer';
    },
  ): Promise<T> {
    const token = await this.getAuthToken();
    const url = `${this.easysignUrl}${endpoint}`;

    try {
      const response = await axios.request<T>({
        url,
        method: init.method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
        data: init.body,
        responseType:
          init.responseType === 'arraybuffer' ? 'arraybuffer' : 'json',
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `[FACIAL] EasySign ${init.method} ${endpoint} falhou com status=${
            error.response?.status || 'UNKNOWN'
          } body=${this.safeSerialize(error.response?.data)}`,
        );
      }

      throw error;
    }
  }

  async createSignatureSession(
    args: CreateFacialSignatureSessionArgs,
  ): Promise<CreateFacialSignatureSessionResult> {
    const cleanPersonalIdentifier = String(args.personalIdentifier || '').replace(
      /\D/g,
      '',
    );

    const buildPayload = (
      positioningMode: 'CREATOR',
    ): EasySignRequest => {
      const imageNonce = 'signature-image-01';
      const creatorImageBase64 = this.buildCreatorSignatureImageBase64(
        args.signerName,
      );
      const position = this.getSignaturePosition(positioningMode);
      const signaturePositions = [
        {
          signerNonce: 'funcionario-01',
          imageNonce,
          page: Math.max(1, args.signaturePage || 1),
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height,
        },
      ];

      return {
        name: 'Assinatura Facial do Funcionario',
        clientName: 'CMSO360',
        signersData: [
          {
            signerNonce: 'funcionario-01',
            name: args.signerName.toUpperCase(),
            email: args.signerEmail.toLowerCase(),
            authenticationOptions: ['SELFIE', 'IP'],
            positioningMode,
            typeMessaging: ['LINK', 'EMAIL'],
            personal_identifier: cleanPersonalIdentifier,
            personal_identifier_type: args.personalIdentifierType || 'CPF',
            signatureConfig: {
              mode: 'SIMPLE',
            },
          },
        ],
        documents: [
          {
            documentNonce: 'doc-01',
            name: args.documentName,
            base64Document: args.documentBase64,
            signaturePositions,
          },
        ],
        images: [
          {
            imageNonce,
            image: creatorImageBase64,
          },
        ],
      };
    };

    const execute = async (payload: EasySignRequest) => {
      this.logPayloadSummary(payload);
      return this.makeEasySignRequest<EasySignResponse>(
        '/signatures',
        {
          method: 'POST',
          body: payload,
        },
      );
    };

    const positioningModeUsed: 'CREATOR' = 'CREATOR';
    const response = await execute(buildPayload('CREATOR'));

    const requestId = response.uuid;
    const documentNonce =
      response.documents?.[0]?.documentNonce ||
      response.documents?.[0]?.documentUuid ||
      '';
    const signatureLink =
      response.signers?.[0]?.iframe?.href ||
      response.signers?.[0]?.iframe?.url ||
      response.signers?.[0]?.link?.url ||
      '';

    if (!requestId || !documentNonce || !signatureLink) {
      throw new Error('Resposta do BRy EasySign incompleta para sessao facial.');
    }

    return {
      requestId,
      documentNonce,
      signatureLink,
      positioningModeUsed,
    };
  }

  private abbreviateName(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length <= 2) return name;

    const first = words[0];
    const last = words[words.length - 1];
    const middle = words.slice(1, -1).map((word) => {
      const cleanWord = word.replace(/\.$/, '');
      if (cleanWord.length > 3) {
        return `${cleanWord[0]}.`;
      }
      return word;
    });

    return [first, ...middle, last].join(' ');
  }

  private buildCreatorSignatureImageBase64(signerName: string): string {
    const fullNormalizedName = this.normalizeSignatureLabel(signerName || 'Assinante');
    const safeName = this.abbreviateName(fullNormalizedName);
    const width = 720;
    const height = 220;
    const pixels = new Uint8Array(width * height * 4);

    const blendPixel = (
      x: number,
      y: number,
      color: [number, number, number, number],
    ) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;

      const index = (y * width + x) * 4;
      const alpha = color[3] / 255;
      const inverseAlpha = 1 - alpha;

      pixels[index] = Math.round(color[0] * alpha + pixels[index] * inverseAlpha);
      pixels[index + 1] = Math.round(
        color[1] * alpha + pixels[index + 1] * inverseAlpha,
      );
      pixels[index + 2] = Math.round(
        color[2] * alpha + pixels[index + 2] * inverseAlpha,
      );
      pixels[index + 3] = Math.min(
        255,
        Math.round(color[3] + pixels[index + 3] * inverseAlpha),
      );
    };

    const fillRect = (
      x: number,
      y: number,
      rectWidth: number,
      rectHeight: number,
      color: [number, number, number, number],
    ) => {
      for (let offsetY = 0; offsetY < rectHeight; offsetY += 1) {
        for (let offsetX = 0; offsetX < rectWidth; offsetX += 1) {
          blendPixel(x + offsetX, y + offsetY, color);
        }
      }
    };

    const drawRectOutline = (
      x: number,
      y: number,
      rectWidth: number,
      rectHeight: number,
      thickness: number,
      color: [number, number, number, number],
    ) => {
      fillRect(x, y, rectWidth, thickness, color);
      fillRect(x, y + rectHeight - thickness, rectWidth, thickness, color);
      fillRect(x, y, thickness, rectHeight, color);
      fillRect(x + rectWidth - thickness, y, thickness, rectHeight, color);
    };

    const drawLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      thickness: number,
      color: [number, number, number, number],
    ) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));

      if (!steps) {
        fillRect(Math.round(x1), Math.round(y1), thickness, thickness, color);
        return;
      }

      const radius = Math.max(1, Math.floor(thickness / 2));

      for (let step = 0; step <= steps; step += 1) {
        const x = Math.round(x1 + (dx * step) / steps);
        const y = Math.round(y1 + (dy * step) / steps);

        for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
          for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
            if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
              blendPixel(x + offsetX, y + offsetY, color);
            }
          }
        }
      }
    };

    const drawGlyph = (
      glyph: string[],
      startX: number,
      startY: number,
      scale: number,
      color: [number, number, number, number],
      slant = 0,
    ) => {
      glyph.forEach((row, rowIndex) => {
        const rowOffset = Math.round(rowIndex * slant);
        [...row].forEach((pixel, columnIndex) => {
          if (pixel !== '1') return;
          fillRect(
            startX + columnIndex * scale + rowOffset,
            startY + rowIndex * scale,
            scale,
            scale,
            color,
          );
        });
      });
    };

    const drawText = (
      text: string,
      startX: number,
      startY: number,
      scale: number,
      color: [number, number, number, number],
      slant = 0,
    ) => {
      let cursorX = startX;
      for (const rawChar of text) {
        const char = rawChar.toUpperCase();
        const glyph = SIGNATURE_FONT[char] || SIGNATURE_FONT[' '];
        drawGlyph(glyph, cursorX, startY, scale, color, slant);
        const spacing = slant !== 0
          ? glyph[0].length * scale - Math.round(scale * 0.3)
          : glyph[0].length * scale + Math.max(2, Math.round(scale * 0.8));
        cursorX += spacing;
      }
    };

    const measureTextWidth = (text: string, scale: number, slant = 0) => {
      let widthPx = 0;
      for (const rawChar of text) {
        const char = rawChar.toUpperCase();
        const glyph = SIGNATURE_FONT[char] || SIGNATURE_FONT[' '];
        const spacing = slant !== 0
          ? glyph[0].length * scale - Math.round(scale * 0.3)
          : glyph[0].length * scale + Math.max(2, Math.round(scale * 0.8));
        widthPx += spacing;
      }
      return Math.max(0, widthPx);
    };

    const white: [number, number, number, number] = [255, 255, 255, 255];
    const panel: [number, number, number, number] = [248, 251, 249, 255];
    const panelStrong: [number, number, number, number] = [236, 244, 239, 255];
    const border: [number, number, number, number] = [203, 220, 210, 255];
    const darkGreen: [number, number, number, number] = [17, 78, 52, 255];
    const mediumGreen: [number, number, number, number] = [27, 107, 74, 255];
    const mutedText: [number, number, number, number] = [88, 104, 96, 255];

    fillRect(0, 0, width, height, white);
    fillRect(0, 0, width, 10, darkGreen);
    drawRectOutline(8, 16, width - 16, height - 32, 2, border);
    fillRect(24, 28, 142, 24, darkGreen);
    fillRect(24, 68, width - 48, 96, panel);
    drawRectOutline(24, 68, width - 48, 96, 2, border);
    fillRect(24, 170, width - 48, 26, panelStrong);

    drawText('CMSO360', 40, 34, 2, white, 0);
    drawText('ASSINATURA ELETRONICA VINCULADA', 188, 34, 2, darkGreen, 0);
    drawText('TITULAR DO REGISTRO', 40, 82, 2, mutedText, 0);

    const maxNameWidth = width - 96;
    const nameScaleOptions = [5, 4, 3, 2];
    const nameScale =
      nameScaleOptions.find((scale) => measureTextWidth(safeName, scale, 0) <= maxNameWidth) ||
      2;
    drawText(safeName, 40, 106, nameScale, darkGreen, 0);

    drawLine(40, 148, width - 40, 148, 2, [188, 203, 184, 255]);
    drawText('VALIDADA POR AUTENTICACAO FACIAL', 40, 176, 2, mediumGreen, 0);
    drawText('PROVEDOR BRY EASYSIGN', 420, 176, 2, mutedText, 0);

    const png = this.getUPNG().encode([pixels.buffer], width, height, 0);
    const base64 = Buffer.from(png).toString('base64');

    this.logger.log(
      `[FACIAL] Creator image generated locally source=png format=${this.guessBase64ImageFormat(
        base64,
      )} width=${width} height=${height} base64Length=${base64.length} signer=${safeName} layout=corporate-block`,
    );

    return base64;
  }

  private normalizeSignatureLabel(value: string): string {

    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[<&>"]/g, '')
      .replace(/[^A-Za-z0-9 .-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase()
      .slice(0, 32);
  }

  private logPayloadSummary(payload: EasySignRequest) {
    const firstDocument = payload.documents?.[0];
    const firstPosition = firstDocument?.signaturePositions?.[0];
    const firstImage = payload.images?.[0];

    this.logger.log(
      `[FACIAL] Payload EasySign summary positioningMode=${
        payload.signersData?.[0]?.positioningMode || 'UNKNOWN'
      } page=${firstPosition?.page ?? 'n/a'} x=${firstPosition?.x ?? 'n/a'} y=${
        firstPosition?.y ?? 'n/a'
      } width=${firstPosition?.width ?? 'n/a'} height=${
        firstPosition?.height ?? 'n/a'
      } imageNonce=${firstPosition?.imageNonce ?? 'n/a'}`,
    );

    if (firstImage) {
      this.logger.log(
        `[FACIAL] Creator image summary field=image format=${this.guessBase64ImageFormat(
          firstImage.image,
        )} base64Length=${firstImage.image?.length || 0} imageNonce=${
          firstImage.imageNonce
        } prefix=${String(firstImage.image || '').slice(0, 24)}`,
      );
    }
  }

  private getSignaturePosition(
    positioningMode: 'CREATOR' | 'PRESET',
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    if (positioningMode === 'PRESET') {
      return { x: 126, y: 10, width: 80, height: 24 };
    }

    return { x: 124, y: 24, width: 60, height: 18 };
  }

  private safeSerialize(value: unknown): string {
    if (value == null) return 'null';
    if (typeof value === 'string') return value;
    if (value instanceof ArrayBuffer) return '[arraybuffer]';
    if (Buffer.isBuffer(value)) return '[buffer]';

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (axios.isAxiosError(error)) {
      return (
        error.message ||
        this.safeSerialize(error.response?.data) ||
        'Erro Axios sem detalhes'
      );
    }

    return this.safeSerialize(error);
  }

  private guessBase64ImageFormat(base64: string): string {
    const value = String(base64 || '');
    if (value.startsWith('iVBOR')) return 'png';
    if (value.startsWith('/9j/')) return 'jpeg';
    if (value.startsWith('Qk')) return 'bmp';
    if (value.startsWith('PHN2Zy') || value.startsWith('PD94bW')) return 'svg';
    return 'unknown';
  }

  async getSignatureStatus(
    requestId: string,
  ): Promise<FacialSignatureStatusResult> {
    const data = await this.makeEasySignRequest<EasySignResponse>(
      `/signatures/${requestId}`,
      {
        method: 'GET',
      },
    );

    const status = data.status || 'UNKNOWN';
    const signerStatus = data.signers?.[0]?.status || 'UNKNOWN';
    const isComplete =
      status === 'FINISHED' &&
      (signerStatus === 'SIGNED' || signerStatus === 'CONCLUDED');

    return { status, signerStatus, isComplete };
  }

  async getSignedDocument(
    requestId: string,
    documentNonce: string,
  ): Promise<Buffer> {
    const data = await this.makeEasySignRequest<ArrayBuffer>(
      `/signatures/${requestId}/documents/${documentNonce}/signed?returnType=BINARY`,
      {
        method: 'GET',
        responseType: 'arraybuffer',
      },
    );

    return Buffer.from(data);
  }

  async getEvidenceReport(
    requestId: string,
    documentNonce: string,
  ): Promise<Buffer> {
    const data = await this.makeEasySignRequest<ArrayBuffer>(
      `/signatures/${requestId}/documents/${documentNonce}/report?returnType=BINARY`,
      {
        method: 'GET',
        responseType: 'arraybuffer',
      },
    );

    return Buffer.from(data);
  }

  async iniciarTransacao(args: IniciarTransacaoArgs): Promise<FacialTransaction> {
    const session = await this.createSignatureSession({
      documentBase64: args.termoCienciaUrl,
      documentName: `TERMO_FACIAL_${args.schedulingId}.pdf`,
      signerName: args.funcionario.nome,
      signerEmail: 'esocial@cmsocupacional.com.br',
      personalIdentifier: args.funcionario.cpf,
      personalIdentifierType: 'CPF',
      signaturePage: 1,
    });

    return {
      sessionId: session.requestId,
      transactionId: session.documentNonce,
      redirectUrl: session.signatureLink,
    };
  }

  async consultarStatus(transactionId: string): Promise<FacialStatusResponse> {
    const status = await this.getSignatureStatus(transactionId);

    return {
      transactionId,
      status: status.isComplete ? 'CONCLUIDO' : 'PENDENTE',
    };
  }

  async processarResultado(
    transactionId: string,
  ): Promise<FacialStatusResponse['resultado'] | null> {
    const statusResponse = await this.consultarStatus(transactionId);

    if (statusResponse.status !== 'CONCLUIDO') {
      this.logger.warn(
        `[FACIAL] Transacao nao concluida: transactionId=${transactionId} status=${statusResponse.status}`,
      );
      return null;
    }

    return statusResponse.resultado || null;
  }
}
