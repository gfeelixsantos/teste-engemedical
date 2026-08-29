import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import UPNG from '@pdf-lib/upng';
import { FacialService } from './facial.service';

jest.mock('axios');

describe('FacialService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  function createService() {
    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const values: Record<string, string> = {
          BRY_EASYSIGN_URL: 'https://bry.test/fw/v1',
          BRY_CLIENT_ID: 'client-id',
          BRY_CLIENT_SECRET: 'client-secret',
          BRY_AUTH_URL: 'https://bry.test/oauth/token',
        };

        return values[key] ?? defaultValue ?? '';
      }),
    } as unknown as ConfigService;

    return new FacialService(configService);
  }

  function createServiceWithOverrides(overrides: Record<string, string>) {
    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const values: Record<string, string> = {
          BRY_EASYSIGN_URL: 'https://bry.test/fw/v1',
          BRY_CLIENT_ID: 'client-id',
          BRY_CLIENT_SECRET: 'client-secret',
          BRY_AUTH_URL: 'https://bry.test/oauth/token',
          ...overrides,
        };

        return values[key] ?? defaultValue ?? '';
      }),
    } as unknown as ConfigService;

    return new FacialService(configService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar sessao EasySign em CREATOR sem enviar LIVENESS', async () => {
    const service = createService();

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'token-1',
        expires_in: 3600,
      },
    } as any);
    mockedAxios.request.mockResolvedValueOnce({
      data: {
        uuid: 'req-1',
        documents: [{ documentNonce: 'doc-1' }],
        signers: [{ iframe: { href: 'https://bry.test/iframe' } }],
      },
    } as any);

    const result = await service.createSignatureSession({
      documentBase64: Buffer.from('pdf').toString('base64'),
      documentName: 'termo.pdf',
      signerName: 'Paciente Teste',
      signerEmail: 'teste@cmso.com',
      personalIdentifier: '123.456.789-09',
      personalIdentifierType: 'CPF',
      signaturePage: 2,
    });

    expect(result).toEqual({
      requestId: 'req-1',
      documentNonce: 'doc-1',
      signatureLink: 'https://bry.test/iframe',
      positioningModeUsed: 'CREATOR',
    });

    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://bry.test/fw/v1/signatures',
        method: 'POST',
        data: expect.objectContaining({
          signersData: [
            expect.objectContaining({
              authenticationOptions: ['SELFIE', 'IP'],
              positioningMode: 'CREATOR',
            }),
          ],
          images: [
            expect.objectContaining({
              imageNonce: 'signature-image-01',
              image: expect.stringMatching(/^iVBOR/),
            }),
          ],
        }),
      }),
    );

    const requestPayload = mockedAxios.request.mock.calls[0][0]?.data as any;
    const pngBase64 = requestPayload.images?.[0]?.image || '';
    const decodedImage = UPNG.decode(Buffer.from(pngBase64, 'base64'));

    expect(decodedImage.width).toBe(720);
    expect(decodedImage.height).toBe(220);
  });

  it('deve falhar a sessao quando o BRy rejeita o envelope CREATOR', async () => {
    const service = createService();

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'token-1',
        expires_in: 3600,
      },
    } as any);

    mockedAxios.request
      .mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'creator invalido' },
        },
        message: 'Request failed with status code 400',
      } as any)

    await expect(
      service.createSignatureSession({
        documentBase64: Buffer.from('pdf').toString('base64'),
        documentName: 'termo.pdf',
        signerName: 'Paciente Teste',
        signerEmail: 'teste@cmso.com',
        personalIdentifier: '123.456.789-09',
        personalIdentifierType: 'CPF',
        signaturePage: 2,
      }),
    ).rejects.toMatchObject({
      message: 'Request failed with status code 400',
    });

    expect(mockedAxios.request).toHaveBeenCalledTimes(1);
    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          signersData: [
            expect.objectContaining({
              positioningMode: 'CREATOR',
            }),
          ],
          images: [
            expect.objectContaining({
              imageNonce: 'signature-image-01',
              image: expect.stringMatching(/^iVBOR/),
            }),
          ],
        }),
      }),
    );
  });

  it('deve ignorar width e height invalidos vindos de configuracao', async () => {
    const service = createServiceWithOverrides({
      BRY_FACIAL_SIGNATURE_WIDTH: '0',
      BRY_FACIAL_SIGNATURE_HEIGHT: '-5',
    });

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'token-1',
        expires_in: 3600,
      },
    } as any);
    mockedAxios.request.mockResolvedValueOnce({
      data: {
        uuid: 'req-3',
        documents: [{ documentNonce: 'doc-3' }],
        signers: [{ iframe: { href: 'https://bry.test/iframe-3' } }],
      },
    } as any);

    await service.createSignatureSession({
      documentBase64: Buffer.from('pdf').toString('base64'),
      documentName: 'termo.pdf',
      signerName: 'Paciente Teste',
      signerEmail: 'teste@cmso.com',
      personalIdentifier: '123.456.789-09',
      personalIdentifierType: 'CPF',
      signaturePage: 2,
    });

    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documents: [
            expect.objectContaining({
              signaturePositions: [
                expect.objectContaining({
                  width: 60,
                  height: 18,
                }),
              ],
            }),
          ],
        }),
      }),
    );
  });

  it('deve usar fallback numerico quando configuracao estiver vazia', async () => {
    const service = createServiceWithOverrides({
      BRY_FACIAL_SIGNATURE_X: '',
      BRY_FACIAL_SIGNATURE_Y: '',
      BRY_FACIAL_SIGNATURE_WIDTH: '',
      BRY_FACIAL_SIGNATURE_HEIGHT: '',
    });

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'token-1',
        expires_in: 3600,
      },
    } as any);
    mockedAxios.request.mockResolvedValueOnce({
      data: {
        uuid: 'req-4',
        documents: [{ documentNonce: 'doc-4' }],
        signers: [{ iframe: { href: 'https://bry.test/iframe-4' } }],
      },
    } as any);

    await service.createSignatureSession({
      documentBase64: Buffer.from('pdf').toString('base64'),
      documentName: 'termo.pdf',
      signerName: 'Paciente Teste',
      signerEmail: 'teste@cmso.com',
      personalIdentifier: '123.456.789-09',
      personalIdentifierType: 'CPF',
      signaturePage: 2,
    });

    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documents: [
            expect.objectContaining({
              signaturePositions: [
                expect.objectContaining({
                  x: 124,
                  y: 24,
                  width: 60,
                  height: 18,
                }),
              ],
            }),
          ],
        }),
      }),
    );
  });
});
