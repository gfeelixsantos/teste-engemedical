import { TemplateGenerate } from './templateGenerate';
import { TemplateNames, type EmailType } from '../types/emailtype';

describe('TemplateGenerate position notification', () => {
  it('renders position creation notification template with cargo details', () => {
    const mail: EmailType = {
      to: 'solicitante@teste.com',
      cc: ['tecnologia@cmsocupacional.com.br'],
      subject: 'Novo cargo cadastrado - Empresa Teste',
      attachment: [],
      templatename: TemplateNames.POSITION_CREATION_NOTIFICATION,
      data: {
        positionInfo: {
          nomeEmpresa: 'Empresa Teste',
          cnpjEmpresa: '12.345.678/0001-99',
          nomeUnidade: 'Unidade Teste',
          nomeSetor: 'Setor Teste',
          codigoCargo: '321',
          nomeCargo: 'Analista de Testes',
          descricaoAtividades: 'Descricao do cargo',
          trabalhoAltura: true,
          espacoConfinado: false,
          operaEmpilhadeira: true,
          manipulacaoAlimentos: false,
          ponteRolante: true,
          conducaoVeiculos: false,
          atividadesComplementares: 'Opera Empilhadeira',
          informacoesAdicionais: 'Informacoes adicionais do cargo',
          autorizacaoLabel: 'Autorizada',
          solicitanteNome: 'Solicitante Teste',
          solicitanteEmail: 'solicitante@teste.com',
          solicitanteCpf: '12345678900',
          solicitanteTelefone: '(19) 99999-9999',
          dataSolicitacao: '20/05/2026 15:30',
          adendoFileName: 'ADENDO_20052026_ANALISTA_DE_TESTES.pdf',
        },
      },
    };

    const rendered = TemplateGenerate.render(mail);

    expect(rendered.template).toContain('Notificação de inclusão de cargo');
    expect(rendered.template).toContain('Empresa Teste');
    expect(rendered.template).toContain('Analista de Testes');
    expect(rendered.template).toContain('SOLICITAÇÃO CONCLUÍDA');
    expect(rendered.template).toContain(
      'ADENDO_20052026_ANALISTA_DE_TESTES.pdf',
    );
    expect(rendered.template).toContain('Trabalho em altura');
    expect(rendered.template).toContain('Opera Empilhadeira');
    expect(rendered.template).toContain('Ponte Rolante');
    expect(rendered.template).toContain('Informações adicionais');
    expect(rendered.template).toContain('Informacoes adicionais do cargo');
    expect(rendered.template).not.toContain('252105');
    expect(rendered.template).not.toContain('CBO:');
  });
});
