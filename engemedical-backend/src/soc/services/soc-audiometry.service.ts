import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AsoFuncionario } from '../types/AsoFuncionario';
import { PedidoExameSequencialFicha } from '../types/PedidoExameSequencialFicha';
import { AudiometriaExportaDados } from '../types/AudiometriaExportaDados';
import {
  buildSocExportDataUrl,
  getSocExportLayoutCredentials,
} from '../utils/soc-export-data-url';

@Injectable()
export class SocAudiometryService {
  private readonly logger = new Logger(SocAudiometryService.name);

  // Constantes para configurações
  private readonly MAX_AUDIOMETRIAS = 6; // No front desconsideramos a atual, sendo exibido as últimas 5
  private readonly TIMEOUT = 30000; // 30 segundos

  /**
   * Busca e baixa a audiometria anterior de um funcionário.
   * Retorna as 3 últimas audiometrias da mais nova para a mais antiga.
   */
  async getAudiometriaAnterior(empresa: string, codigoFuncionario: string) {
    try {
      // 1. Validar parâmetros
      if (!empresa || !codigoFuncionario) {
        throw new BadRequestException(
          'Empresa e código do funcionário são obrigatórios',
        );
      }

      // 2. Buscar ASOs do funcionário
      const asos = await this.buscarAsosFuncionario(empresa, codigoFuncionario);

      if (!asos || asos.length === 0) {
        throw new NotFoundException(
          'Nenhum ASO encontrado para este funcionário',
        );
      }

      // 3. Filtrar apenas audiometrias e ordenar por data (mais recente primeiro)
      const audiometriasASO = asos
        .filter((aso) =>
          aso.DESCRICAOEXAME?.toLowerCase().includes('audiometria'),
        )
        .filter((aso) => aso.DTEXAME) // Apenas com data válida
        .sort((a, b) => this.compararDatas(b.DTEXAME, a.DTEXAME)); // Mais recente primeiro

      if (audiometriasASO.length === 0) {
        throw new NotFoundException(
          'Nenhuma audiometria encontrada nos ASOs do funcionário',
        );
      }

      this.logger.log(
        `Encontradas ${audiometriasASO.length} audiometrias para o funcionário ${codigoFuncionario}`,
      );

      // 4. Pegar apenas as 3 mais recentes
      const ultimasAudiometriasASO = audiometriasASO.slice(
        0,
        this.MAX_AUDIOMETRIAS,
      );

      // 5. Buscar detalhes dos exames (SEQUENCIALRESULTADO)
      const codigosResultados = await this.buscarCodigosResultados(
        empresa,
        ultimasAudiometriasASO,
      );

      if (codigosResultados.length === 0) {
        throw new NotFoundException(
          'Não foi possível obter os códigos dos resultados das audiometrias',
        );
      }

      // 6. Buscar os dados completos das audiometrias
      const audiometrias = await this.buscarDadosAudiometrias(
        empresa,
        codigosResultados,
      );

      if (audiometrias.length === 0) {
        throw new NotFoundException(
          'Nenhum dado de audiometria encontrado para os códigos informados',
        );
      }

      // 7. Ordenar por data de realização (mais recente primeiro) e limitar a 3
      const resultado = audiometrias
        .filter((audio) => audio.DATA_REALIZACAO) // Apenas com data válida
        .sort((a, b) =>
          this.compararDatas(b.DATA_REALIZACAO, a.DATA_REALIZACAO),
        )
        .slice(0, this.MAX_AUDIOMETRIAS);

      this.logger.log(
        `Retornando ${resultado.length} audiometrias para o funcionário ${codigoFuncionario}`,
      );

      return resultado;
    } catch (err) {
      this.logger.error(
        `Erro ao buscar audiometria anterior: ${err.message}`,
        err.stack,
      );

      // Tratamento específico para diferentes tipos de erro
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }

      throw new BadRequestException(
        `Erro ao buscar audiometria anterior: ${err.message}`,
      );
    }
  }

  /**
   * Busca ASOs do funcionário
   */
  private async buscarAsosFuncionario(
    empresa: string,
    codigoFuncionario: string,
  ): Promise<AsoFuncionario[]> {
    const credentials = getSocExportLayoutCredentials('SOC_ED_ASO_FUNCIONARIO');
    const url = buildSocExportDataUrl({
      empresa,
      ...credentials,
      tipoSaida: 'json',
      funcionario: codigoFuncionario,
      tipoASO: '1,2,3,4,5,6',
      paramFiltroData: '0',
      dataInicio: '',
      dataFim: '',
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT);

      const fetchResponse = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=iso-8859-1',
        },
      });

      clearTimeout(timeout);

      if (!fetchResponse.ok) {
        throw new Error(`Erro HTTP ${fetchResponse.status} ao buscar ASOs`);
      }

      const buffer = await fetchResponse.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);

      if (!decoded || decoded.trim() === '') {
        return [];
      }

      return JSON.parse(decoded);
    } catch (error) {
      this.logger.error(`Erro ao buscar ASOs: ${error.message}`);
      return [];
    }
  }

  /**
   * Busca os códigos de resultado (SEQUENCIALRESULTADO) para cada ASO
   */
  private async buscarCodigosResultados(
    empresa: string,
    asos: AsoFuncionario[],
  ): Promise<string[]> {
    const codigosResultados: string[] = [];

    // Processa em paralelo com limite de concorrência
    const concurrencyLimit = 2;
    const chunks = this.chunkArray(asos, concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map((aso) =>
        this.buscarSequencialResultado(empresa, aso.IDFICHA),
      );
      const results = await Promise.allSettled(promises);

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          codigosResultados.push(result.value);
        }
      });
    }

    // Remove duplicatas
    return [...new Set(codigosResultados)];
  }

  /**
   * Busca o sequencial resultado para uma ficha específica
   */
  private async buscarSequencialResultado(
    empresa: string,
    idFicha: string,
  ): Promise<string | null> {
    const credentials = getSocExportLayoutCredentials(
      'SOC_ED_SEQUENCIAL_RESULTADO',
    );
    const url = buildSocExportDataUrl({
      empresa,
      ...credentials,
      tipoSaida: 'json',
      sequencial: idFicha,
      empresaTrabalho: empresa,
    });

    try {
      const fetchResponse = await fetch(url);

      if (!fetchResponse.ok) {
        this.logger.warn(
          `Erro HTTP ${fetchResponse.status} ao buscar sequencial ficha ${idFicha}`,
        );
        return null;
      }

      const buffer = await fetchResponse.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);

      if (!decoded || decoded.trim() === '') {
        return null;
      }

      const sequencialFichaJson: PedidoExameSequencialFicha[] =
        JSON.parse(decoded);

      // Retorna o primeiro SEQUENCIALRESULTADO encontrado
      return sequencialFichaJson[0]?.SEQUENCIALRESULTADO || null;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar sequencial ficha ${idFicha}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Busca os dados completos das audiometrias
   */
  private async buscarDadosAudiometrias(
    empresa: string,
    codigosResultados: string[],
  ): Promise<AudiometriaExportaDados[]> {
    if (codigosResultados.length === 0) return [];

    const credentials = getSocExportLayoutCredentials('SOC_ED_AUDIOMETRIA');
    const url = buildSocExportDataUrl({
      empresa,
      ...credentials,
      tipoSaida: 'json',
      empresaTrabalho: empresa,
      listaSequencialExames: codigosResultados.join(','),
    });

    try {
      const fetchResponse = await fetch(url);

      if (!fetchResponse.ok) {
        throw new Error(
          `Erro HTTP ${fetchResponse.status} ao buscar audiometrias`,
        );
      }

      const buffer = await fetchResponse.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);

      if (!decoded || decoded.trim() === '') {
        return [];
      }

      return JSON.parse(decoded);
    } catch (error) {
      this.logger.error(
        `Erro ao buscar dados das audiometrias: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Compara duas datas no formato DD/MM/AAAA
   */
  private compararDatas(data1: string, data2: string): number {
    try {
      const [dia1, mes1, ano1] = data1.split('/').map(Number);
      const [dia2, mes2, ano2] = data2.split('/').map(Number);

      const date1 = new Date(ano1, mes1 - 1, dia1);
      const date2 = new Date(ano2, mes2 - 1, dia2);

      return date1.getTime() - date2.getTime();
    } catch (error) {
      this.logger.warn(`Erro ao comparar datas: ${data1} vs ${data2}`);
      return 0;
    }
  }

  /**
   * Divide um array em chunks de tamanho específico
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
