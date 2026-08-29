import { Injectable, Logger } from '@nestjs/common';
import { FuncionarioDeficiencia } from '../types/FuncionarioDeficiencia';

@Injectable()
export class SocPcdService {
  private readonly logger = new Logger(SocPcdService.name);

  /**
   * Verifica o status de PCD de um funcionário.
   */
  async verifyPcdStatus(
    codFuncionario: string,
    empresa: string,
  ): Promise<string | null> {
    const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro={"empresa":"${empresa}","codigo":"211978","chave":"ed766fc80c5ef04c59d6","tipoSaida":"json"}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error(
          'Falha na requisição no verificação de PCD STATUS',
          await response.text(),
        );
        return null;
      }
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const json: FuncionarioDeficiencia[] = JSON.parse(decoded);
      const funcionarioPcd = json.find(
        (f) => f.CODFUNCIONARIO === codFuncionario,
      );

      if (funcionarioPcd) {
        return `Tipo ${funcionarioPcd?.CLASSIFICACAO} - ${funcionarioPcd?.DEFICIENCIA} desde ${funcionarioPcd?.DATAINICIODEFICIENCIA}`;
      }
      return null;
    } catch (e) {
      this.logger.error('Erro ao processar verificação de PCD STATUS', e, url);
      return null;
    }
  }
}
