export async function EdPedidoExame(employee: any): Promise<string> {
  const parametro = JSON.stringify({
    empresa: employee.codigoempresa,
    codigo: '161440',
    chave: '3d0851191bdd7e498167',
    tipoSaida: 'json',
    paramSequencial: '',
    sequenciaFicha: '',
    funcionarioInicio: employee.codigo,
    funcionarioFim: employee.codigo,
    paramData: '1',
    dataInicio: employee.dataagendamento,
    dataFim: employee.dataagendamento,
    paramFunc: '',
    cpffuncionario: '',
    nomefuncionario: '',
    codpresta: '',
    nomepresta: '',
    paramPresta: '',
    codunidade: '',
    nomeunidade: '',
    paramUnidade: '',
  });

  const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro=${encodeURIComponent(parametro)}`;

  const response = await fetch(url);
  const responseBuff = await response.arrayBuffer();
  const examRequest = new TextDecoder('iso-8859-1').decode(responseBuff);
  const examRequestJson = JSON.parse(examRequest);

  if (examRequestJson.length > 0) {
    return examRequestJson[0]['SEQUENCIAFICHA'];
  }

  throw new Error('Erro ao executar exporta dados: Pedido de exame.');
}
