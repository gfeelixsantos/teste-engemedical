import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadSocged } from 'src/azure/types/azure.types';

const WSSecurity = require('wssecurity-soap');

type UploadMode = 'ASO' | 'PRONTUARIO';

type UploadConfig = {
  mode: UploadMode;
  classificacao: string;
  codigoTipoGed: string;
  codigoGed: string;
};

@Injectable()
export class SocUploadService {
  private readonly logger = new Logger(SocUploadService.name);

  constructor(private readonly configService: ConfigService) {}

  private normalizeToken(value?: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toUpperCase();
  }

  private resolveUploadConfig(payload: UploadSocged): UploadConfig {
    const explicitClassificacao = this.normalizeToken(payload.classificacao);
    const nomeGed = this.normalizeToken(payload.nomeGed);
    const nomeArquivo = this.normalizeToken(payload.nomeArquivo);

    const isAso =
      explicitClassificacao === 'ASO' ||
      nomeGed === 'ASO' ||
      nomeGed.startsWith('ASO_') ||
      nomeArquivo.startsWith('ASO_');

    if (isAso) {
      return {
        mode: 'ASO',
        classificacao: payload.classificacao || 'ASO',
        codigoTipoGed:
          payload.tipoGed ||
          this.configService.get<string>('CODSOCGED_ASO') ||
          '41',
        codigoGed: '',
      };
    }

    return {
      mode: 'PRONTUARIO',
      classificacao: payload.classificacao || 'RESULTADO_EXAME',
      codigoTipoGed: payload.tipoGed || '16',
      codigoGed: payload.codigoGed || '3',
    };
  }

  /**
   * Realiza o upload de arquivo no SOCGED via SOAP/XOP.
   */
  async uploadFile(
    payload: UploadSocged,
    options?: { maxAttempts?: number; delayMs?: number },
  ): Promise<void> {
    const MAX_ATTEMPTS = options?.maxAttempts ?? 3;
    const DELAY_MS = options?.delayMs ?? 8000;

    if (!payload.arquivo || payload.arquivo.length === 0) {
      throw new Error(
        `[SOC_UPLOAD] Arquivo ausente para ${payload.nomeArquivo || 'nome-nao-informado'}`,
      );
    }

    const user =
      this.configService.get<string>('SOC_WEBSERVICE_USER') ||
      this.configService.get<string>('SOCWS_USUARIO') ||
      '';
    const pass =
      this.configService.get<string>('SOC_WEBSERVICE_PASS') ||
      this.configService.get<string>('SOCWS_PASS') ||
      '';
    const codPrincipal =
      this.configService.get<string>('SOC_WEBSERVICE_EMPRESA_PRINCIPAL') ||
      this.configService.get<string>('SOCWS_EMPRESA_PRINCIPAL') ||
      '';
    const codResponsavel =
      this.configService.get<string>('SOC_WEBSERVICE_CODIGO_RESPONSAVEL') ||
      this.configService.get<string>('SOCWS_RESPONSAVEL') ||
      '';
    const codUsuario =
      this.configService.get<string>('SOC_WEBSERVICE_CODIGO_USUARIO') ||
      this.configService.get<string>('SOCWS_CODUSUARIO') ||
      '';

    const URL = 'https://ws1.soc.com.br/WSSoc/services/UploadArquivosWs';
    const SOBREESCREVER = true;
    const OBSERVACAOGED = `Upload via CMSO 360 Backend em ${new Date().toLocaleString('pt-BR')}`;

    const uploadConfig = this.resolveUploadConfig(payload);

    this.logger.log(
      `[SOC_UPLOAD] Preparando envio ${uploadConfig.mode} | classificacao=${uploadConfig.classificacao} | tipoGed=${uploadConfig.codigoTipoGed} | codEmpresa=${payload.codEmpresa} | codFuncionario=${payload.codFuncionario} | ficha=${payload.sequencialFicha}`,
    );

    const header = new WSSecurity(user, pass, 'PasswordDigest');
    let lastError: any;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const contentId = `attachment_${Date.now()}@soc.com.br`;

        const soapEnvelope = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.soc.age.com/" xmlns:xop="http://www.w3.org/2004/08/xop/include">
    <soapenv:Header>
        ${header.toXML()}
    </soapenv:Header>
    <soapenv:Body>
        <ser:uploadArquivo>
            <arg0>
                <arquivo>
                    <xop:Include href="cid:${contentId}"/>
                </arquivo>
                <classificacao>${uploadConfig.classificacao}</classificacao>
                <codigoEmpresa>${payload.codEmpresa}</codigoEmpresa>
                <codigoFuncionario>${payload.codFuncionario}</codigoFuncionario>
                <codigoGed>${uploadConfig.codigoGed}</codigoGed>
                <codigoSequencialFicha>${payload.sequencialFicha}</codigoSequencialFicha>
                <codigoTipoGed>${uploadConfig.codigoTipoGed}</codigoTipoGed>
                <extensaoArquivo>PDF</extensaoArquivo>
                <identificacaoVo>
                    <chaveAcesso>${pass}</chaveAcesso>
                    <codigoEmpresaPrincipal>${codPrincipal}</codigoEmpresaPrincipal>
                    <codigoResponsavel>${codResponsavel}</codigoResponsavel>
                    <codigoUsuario>${codUsuario}</codigoUsuario>
                </identificacaoVo>
                <nomeArquivo>${payload.nomeArquivo}</nomeArquivo>
                <nomeGed>${payload.nomeGed}</nomeGed>
                <nomeTipoGed></nomeTipoGed>
                <sobreescreveArquivo>${SOBREESCREVER}</sobreescreveArquivo>
                <codigoUnidadeGed></codigoUnidadeGed>
                <dataValidadeGed></dataValidadeGed>
                <revisaoGed></revisaoGed>
                <observacao>${OBSERVACAOGED}</observacao>
            </arg0>
        </ser:uploadArquivo>
    </soapenv:Body>
</soapenv:Envelope>`;

        const parts: Buffer[] = [];
        parts.push(
          Buffer.from(
            `--${boundary}\r\nContent-Type: application/xop+xml; charset=UTF-8; type="text/xml"\r\nContent-Transfer-Encoding: 8bit\r\nContent-ID: <root.message@soc.com.br>\r\n\r\n${soapEnvelope}\r\n`,
          ),
        );
        parts.push(
          Buffer.from(
            `--${boundary}\r\nContent-Type: application/pdf\r\nContent-Transfer-Encoding: binary\r\nContent-ID: <${contentId}>\r\n\r\n`,
          ),
        );
        parts.push(payload.arquivo);
        parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

        const body = Buffer.concat(parts);

        const response = await fetch(URL, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/related; type="application/xop+xml"; boundary="${boundary}"; start="<root.message@soc.com.br>"; start-info="text/xml"`,
          },
          body,
        });

        const textResponse = await response.text();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - ${textResponse}`);
        }

        if (
          textResponse.includes('soap:Fault') ||
          textResponse.includes('faultstring')
        ) {
          throw new Error(textResponse);
        }

        this.logger.log(
          `[SOC_UPLOAD] Sucesso no upload ${uploadConfig.mode} | arquivo=${payload.nomeArquivo} | tentativa=${attempt}`,
        );
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `[SOC_UPLOAD] Falha no upload (tentativa ${attempt}/${MAX_ATTEMPTS}): ${error.message}`,
        );
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }
    }

    throw new Error(
      `Falha definitiva no upload SOCGED apos ${MAX_ATTEMPTS} tentativas: ${lastError?.message || lastError}`,
    );
  }
}
