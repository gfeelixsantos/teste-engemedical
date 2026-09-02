import { parseFuncionarioModelo2Response } from './funcionario-modelo2-response.parser';

describe('parseFuncionarioModelo2Response', () => {
  it('marks HTTP 200 FuncionarioRetorno with encontrouErro as functional failure', () => {
    const response = `
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <ns2:importacaoFuncionarioResponse xmlns:ns2="http://services.soc.age.com/">
            <FuncionarioRetorno>
              <encontrouErro>true</encontrouErro>
              <descricaoErro>Funcionario nao cadastrado</descricaoErro>
              <atualizouFuncionario>false</atualizouFuncionario>
              <incluiuFuncionario>false</incluiuFuncionario>
            </FuncionarioRetorno>
          </ns2:importacaoFuncionarioResponse>
        </soap:Body>
      </soap:Envelope>
    `;

    expect(parseFuncionarioModelo2Response(response)).toMatchObject({
      encontrouErro: true,
      descricaoErro: 'Funcionario nao cadastrado',
      atualizouFuncionario: false,
      incluiuFuncionario: false,
      success: false,
    });
  });

  it('extracts success flags and employee code from FuncionarioRetorno', () => {
    const response = `
      <FuncionarioRetorno>
        <encontrouErro>false</encontrouErro>
        <atualizouFuncionario>true</atualizouFuncionario>
        <incluiuFuncionario>false</incluiuFuncionario>
        <codigoFuncionario>12345</codigoFuncionario>
        <observacao>Atualizado com sucesso</observacao>
      </FuncionarioRetorno>
    `;

    expect(parseFuncionarioModelo2Response(response)).toMatchObject({
      encontrouErro: false,
      atualizouFuncionario: true,
      incluiuFuncionario: false,
      codigoFuncionario: '12345',
      observacao: 'Atualizado com sucesso',
      success: true,
    });
  });

  it('extracts SOAP fault as functional error', () => {
    const response = `
      <soap:Fault>
        <faultstring>FailedAuthentication</faultstring>
      </soap:Fault>
    `;

    expect(parseFuncionarioModelo2Response(response)).toMatchObject({
      encontrouErro: true,
      descricaoErro: 'FailedAuthentication',
      error: 'FailedAuthentication',
      success: false,
    });
  });
});
