import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RiscoFuncionario } from '../types/RiscoFuncionario';

@Injectable()
export class SocEmployeeRiskService {
  private readonly logger = new Logger(SocEmployeeRiskService.name);

  constructor(private readonly configService: ConfigService) {}

  async getEmployeeRisks(
    empresaTrabalho: string,
    funcionario: string,
  ): Promise<RiscoFuncionario[]> {
    const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro=${encodeURIComponent(
      JSON.stringify({
        empresa: '16459',
        codigo: '193602',
        chave: '8355c87bb9157db187cb',
        tipoSaida: 'json',
        empresaTrabalho,
        funcionario,
      }),
    )}`;

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
