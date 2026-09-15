import { buildFinanceiroDashboard } from './financeiro.service';

describe('buildFinanceiroDashboard', () => {
  it('separa títulos de recebimentos e calcula margem dos atendimentos', () => {
    const result = buildFinanceiroDashboard(
      [
        { CODIGOEMPRESA: '1', EMPRESA: 'Alpha', DATACOBRANCA: '01/09/2026', VALOR: '1.000,50', QTDVIDAS: '10' },
      ],
      [
        { EMPRESA: 'Alpha', PRESTADOR: 'Clinica A', DATAEXAME: '02/09/2026', VALOR_COBRAR: '300,00', VALOR_PAGAR: '180,00' },
      ],
    );

    expect(result.kpis).toMatchObject({
      totalTitulos: 1,
      valorTitulos: 1000.5,
      valorCobradoExames: 300,
      valorAPagarExames: 180,
      margemExames: 120,
    });
    expect(result.porMes[0]).toMatchObject({ mes: '2026-09', valorTitulos: 1000.5, valorCobradoExames: 300 });
  });

  it('não transforma título em pagamento recebido', () => {
    const result = buildFinanceiroDashboard([{ VALOR: '100,00' }], []);
    expect(result.kpis.pagamentosRecebidos).toBeNull();
  });

  it('prefere a contagem de vidas dedicada sem duplicar QTDVIDAS dos títulos', () => {
    const result = buildFinanceiroDashboard([{ VALOR: '100,00', QTDVIDAS: '10' }], [], [{ NUMERO_VIDAS: '12' }]);
    expect(result.kpis.vidas).toBe(12);
  });
});
