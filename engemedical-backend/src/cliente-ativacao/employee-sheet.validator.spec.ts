import { validateEmployeeSheet } from './employee-sheet.validator';

describe('validateEmployeeSheet', () => {
  it('accepts the onboarding template header', () => {
    const csv = Buffer.from(
      'Nome Completo,CPF,RG,Data Nascimento,Cargo/Função,Setor,Data Admissão,Salário,E-mail,Telefone,Endereço,CEP,Cidade,Estado,Sexo,Estado Civil,Escolaridade,PCD,Observações\n',
    );

    expect(validateEmployeeSheet('funcionarios.csv', csv)).toEqual({
      valid: true,
      rowCount: 0,
      missingHeaders: [],
    });
  });

  it('rejects a spreadsheet without the required identity headers', () => {
    const csv = Buffer.from('Nome,Cargo\nMaria,Analista\n');

    expect(validateEmployeeSheet('funcionarios.csv', csv)).toEqual({
      valid: false,
      rowCount: 1,
      missingHeaders: ['Nome Completo', 'CPF'],
    });
  });
});
