import axios, { AxiosResponse } from 'axios';
import { Logger } from '@nestjs/common';

const logger = new Logger('EdPedidoExame');

export async function EdPedidoExamePeloSequencialFicha(
  employee: any,
  sequencialFicha: string,
): Promise<any> {
  const URL = process.env.SOC_ED_CRUD;
  const user = process.env.SOC_ED_USUARIO;
  const pass = process.env.SOC_ED_SENHA;

  const params = {
    codigoEmpresa: employee.codigoempresa,
    codigoFuncionario: employee.codigo,
    codigoFicha: sequencialFicha,
  };

  try {
    const response: AxiosResponse<any> = await axios.post(URL, params, {
      headers: {
        'Content-Type': 'application/json',
        usuario: user,
        senha: pass,
      },
      timeout: 30000,
    });

    logger.debug(response.data);
    return response.data;
  } catch (error) {
    throw error;
  }
}