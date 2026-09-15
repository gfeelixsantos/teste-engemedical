import { buildPrestadoresSocnetDashboard } from './prestadores-dashboard.service';

describe('buildPrestadoresSocnetDashboard', () => {
  it('agrega produção, margem e rede por prestador', () => {
    const result = buildPrestadoresSocnetDashboard(
      [{ PRESTADOR: 'Clinica A', EMPRESA: 'Alpha', EXAME: 'ASO', DATAEXAME: '01/09/2026', VALOR_COBRAR: '200,00', VALOR_PAGAR: '120,00' }],
      [{ nomePrestador: 'Clinica A', situacao: 'Ativo', cidade: 'Fortaleza', estado: 'CE', statusContrato: 'Ativo' }],
      [{ NOMEPRESTADOR: 'Clinica A', CODIGOEXAME: 'ASO', VALORCOBRAR: '200,00', VALORPAGAR: '120,00', ATENDE: 'Sim' }],
      [{ nomePrestador: 'Clinica A', dataInicial: '01/01/2026', dataFinal: '31/12/2026', valorPagarProdutosServicos: '120,00' }],
    );

    expect(result.kpis).toMatchObject({ prestadoresAtivos: 1, atendimentos: 1, valorCobrado: 200, valorAPagar: 120, margem: 80 });
    expect(result.porPrestador[0]).toMatchObject({ prestador: 'Clinica A', atendimentos: 1, margem: 80 });
  });

  it('sinaliza prestador sem preço ou sem tabela vigente', () => {
    const result = buildPrestadoresSocnetDashboard(
      [{ PRESTADOR: 'Clinica B', EXAME: 'ASO', VALOR_COBRAR: '0', VALOR_PAGAR: '0' }],
      [{ nomePrestador: 'Clinica B', situacao: 'Ativo' }], [], [],
    );
    expect(result.inconsistencias.some((item) => item.tipo === 'sem_preco')).toBe(true);
    expect(result.inconsistencias.some((item) => item.tipo === 'sem_tabela')).toBe(true);
  });

  it('não considera o texto Inativo como prestador ativo', () => {
    const result = buildPrestadoresSocnetDashboard([], [{ nomePrestador: 'Clinica C', situacao: 'Inativo' }], [], []);
    expect(result.kpis.prestadoresAtivos).toBe(0);
  });
});
