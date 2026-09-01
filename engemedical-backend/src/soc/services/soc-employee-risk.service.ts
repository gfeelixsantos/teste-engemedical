import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RiscoFuncionario } from '../types/RiscoFuncionario';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
} from '../utils/soc-export-data-url';

@Injectable()
export class SocEmployeeRiskService {
  private readonly logger = new Logger(SocEmployeeRiskService.name);

  constructor(private readonly configService: ConfigService) {}

  async getEmployeeRisks(
    empresaTrabalho: string,
    funcionario: string,
  ): Promise<RiscoFuncionario[]> {
    const credentials = getSocExportCredentials(
      'SOC_ED_RISCO_FUNCIONARIO',
      this.configService,
    );
    const url = buildSocExportDataUrl(
      {
        ...credentials,
        tipoSaida: 'json',
        empresaTrabalho,
        funcionario,
      },
      this.configService,
    );

    this.logger.log(
      `[SocEmployeeRiskService] Buscando riscos do funcionário ${funcionario} na empresa ${empresaTrabalho}`,
    );

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        this.logger.error(
          `[SocEmployeeRiskService] Falha HTTP ${response.status}: ${await response.text()}`,
        );
        return [];
      }

      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);

      if (!decoded.trim().startsWith('[') && !decoded.trim().startsWith('{')) {
        this.logger.warn(
          `[SocEmployeeRiskService] Resposta inesperada: ${decoded.slice(0, 200)}`,
        );
        return [];
      }

      const data: RiscoFuncionario[] = JSON.parse(decoded);

      if (!Array.isArray(data)) {
        this.logger.warn(
          '[SocEmployeeRiskService] Resposta não é um array',
          decoded.slice(0, 200),
        );
        return [];
      }

      this.logger.log(
        `[SocEmployeeRiskService] Retornados ${data.length} riscos para funcionário ${funcionario}`,
      );

      return data;
    } catch (error) {
      this.logger.error(
        `[SocEmployeeRiskService] Erro ao buscar riscos do funcionário ${funcionario}:`,
        error,
      );
      return [];
    }
  }
}
