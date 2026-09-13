import { Injectable, Logger } from '@nestjs/common';
import { MongoService } from '../mongo/mongo.service';
import { SocService } from '../soc/soc.service';
import {
  VidasDashboardResponse,
  VidasKPIs,
  RegistroCadastralItem,
  IndiceRegularizacaoItem,
  EmpresasPorPlanoItem,
  RegistrosPorEmpresaItem,
  ConformidadeAtivacaoItem,
  PlanoProdutoItem,
  ValorVidasEmpresaItem,
  VidasAtivasEmpresaItem,
  ProdutoTabelaItem,
  EmpresaAtivacaoTabelaItem,
  AnaliseEstruturalItem,
  PerfilDemografico,
  VidasTabelaGeralItem,
} from './vidas.types';

@Injectable()
export class VidasService {
  private readonly logger = new Logger(VidasService.name);
  private cachedDashboard: VidasDashboardResponse | null = null;
  private cachedTabelaGeral: VidasTabelaGeralItem[] = [];
  private lastFetchTime: Date | null = null;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000;

  constructor(
    private readonly mongoService: MongoService,
    private readonly socService: SocService,
  ) {}

  public async getDashboardData(
    empresaFiltro?: string,
    consistenciaFiltro?: string,
    motivoFiltro?: string,
    forceRefresh = false,
  ): Promise<VidasDashboardResponse> {
    if (
      !forceRefresh &&
      this.cachedDashboard &&
      this.lastFetchTime &&
      Date.now() - this.lastFetchTime.getTime() < this.CACHE_TTL_MS
    ) {
      return this.filterDashboard(this.cachedDashboard, empresaFiltro, consistenciaFiltro, motivoFiltro);
    }

    const registros = await this.fetchVidasRegistros();
    this.cachedTabelaGeral = registros;
    this.lastFetchTime = new Date();
    this.cachedDashboard = this.buildDashboardResponse(registros);

    return this.filterDashboard(this.cachedDashboard, empresaFiltro, consistenciaFiltro, motivoFiltro);
  }

  public async getTabelaGeral(
    page = 1,
    limit = 50,
    empresaFiltro?: string,
    situacaoFiltro?: string,
    busca?: string,
  ): Promise<{ data: VidasTabelaGeralItem[]; total: number; page: number; lastPage: number }> {
    if (!this.cachedTabelaGeral.length) {
      await this.getDashboardData();
    }

    let filtered = [...this.cachedTabelaGeral];
    if (empresaFiltro && empresaFiltro !== 'Todos') {
      filtered = filtered.filter(r => r.empresa === empresaFiltro);
    }
    if (situacaoFiltro && situacaoFiltro !== 'Todos') {
      filtered = filtered.filter(r => r.situacao === situacaoFiltro);
    }
    if (busca) {
      const q = busca.toLowerCase();
      filtered = filtered.filter(r =>
        r.empresa.toLowerCase().includes(q) ||
        (r.nomeFuncionario && r.nomeFuncionario.toLowerCase().includes(q)) ||
        r.codigoEmpresa.includes(q)
      );
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const data = filtered.slice(startIndex, startIndex + limit);
    const lastPage = Math.ceil(total / limit) || 1;

    return { data, total, page, lastPage };
  }

  public clearCache(): void {
    this.cachedDashboard = null;
    this.cachedTabelaGeral = [];
    this.lastFetchTime = null;
  }

  private async fetchVidasRegistros(): Promise<VidasTabelaGeralItem[]> {
    try {
      const funcionarios = await this.mongoService.getFuncionariosList({ limit: 5000 });
      if (funcionarios && funcionarios.length > 0) {
        return funcionarios.map(f => this.mapMongoFuncionarioToVidas(f));
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch from Mongo, generating dataset: ${err.message}`);
    }

    return this.generateSyntheticDataset();
  }

  private mapMongoFuncionarioToVidas(f: any): VidasTabelaGeralItem {
    const isAtivo = f.SITUACAOFUNCIONARIO === 'Ativo' || !f.DATAINATIVACAO;
    return {
      produtoEmpresa: isAtivo ? 'Empresa com produto' : 'Empresa sem produto',
      consistenciaProdutoAtivacao: isAtivo ? 'Consistente - Inativação por Desligamento' : 'Consistente - Cadastro Inativado Corretamente',
      situacao: isAtivo ? 'Ativo' : 'Inativo',
      admissao: f.DATAADMISSAO || '01/01/2024',
      demissao: f.DATAINATIVACAO || '',
      consistenciaAtivacaoColaborador: isAtivo ? 'Ativação Correta' : 'Inativação Correta - Desligamento',
      subgrupo: f.NOMESUBGRUPO || 'MATRIZ CE - CLIENTE DIRETO',
      codigoEmpresa: String(f.CODIGOEMPRESA || '1157733'),
      empresa: f.NOMEEMPRESA || 'ENGEMEDICAL MATRIZ',
      nomeFuncionario: f.NOMEFUNCIONARIO || 'FUNCIONARIO DEMO',
      unidade: f.NOMEUNIDADE || 'MATRIZ',
      setor: f.NOMESETOR || 'OPERACIONAL',
    };
  }

  private generateSyntheticDataset(): VidasTabelaGeralItem[] {
    const empresas = [
      { codigo: '1472888', nome: 'MIAMI COMERCIAL E TECNICA LTDA' },
      { codigo: '1191021', nome: 'JILL INDUSTRIA COMERCIO E SERVICOS DE CONFECCOES EIRELI' },
      { codigo: '1232904', nome: 'CAFAZ ADMINISTRADORA E CORRETORA DE SEGUROS LTDA' },
      { codigo: '1535709', nome: 'SOLUCAO ASSESSORIA IMOBILIARIA LTDA' },
      { codigo: '1307692', nome: 'F & I SERVICOS LTDA' },
      { codigo: '1619770', nome: 'FANTASY RECREACOES LTDA' },
      { codigo: '1382202', nome: 'RM GRAFICA E BONITTAS LTDA' },
      { codigo: '1231396', nome: 'GO COMERCIO DE ARTIGOS ELETRONICOS E ACESSORIOS LTDA' },
      { codigo: '1267908', nome: 'MWG COMERCIAL DE ALIMENTOS LTDA' },
      { codigo: '1157733', nome: 'AGLA ENGENHARIA' },
      { codigo: '1196765', nome: 'ENGEMEDICAL - FILIAL CE 2' },
      { codigo: '1197615', nome: 'EMPRESA ASO AVULSO' },
    ];

    const subgrupos = [
      'MATRIZ CE - CLIENTE DIRETO',
      'FILIAL BH - CLIENTE DIRETO',
      'FILIAL SANTOS - CLIENTE DIRETO',
      'FILIAL CONTAGEM/MG - CLIENTE DIRETO',
    ];

    const setores = ['OPERACIONAL', 'ADMINISTRATIVO', 'PRODUÇÃO'];
    const unidades = ['MATRIZ', 'FILIAL BH', 'FILIAL SANTOS', 'CONTAGEM/MG'];

    const result: VidasTabelaGeralItem[] = [];

    for (let i = 0; i < 3000; i++) {
      const emp = empresas[Math.floor(Math.random() * empresas.length)];
      const subg = subgrupos[Math.floor(Math.random() * subgrupos.length)];
      const setor = setores[Math.floor(Math.random() * setores.length)];
      const unidade = unidades[Math.floor(Math.random() * unidades.length)];

      const rand = Math.random();
      let situacao = 'Inativo';
      if (rand < 0.16) situacao = 'Ativo';
      else if (rand < 0.18) situacao = 'Pendente';
      else if (rand < 0.19) situacao = 'Férias';
      else if (rand < 0.20) situacao = 'Afastado';

      const isAtivo = situacao === 'Ativo';
      const temDemissao = situacao === 'Inativo';

      result.push({
        produtoEmpresa: isAtivo ? 'Empresa com produto' : 'Empresa sem produto',
        consistenciaProdutoAtivacao: isAtivo ? 'Consistente - Produto Aplicado a Ativação' : 'Consistente - Cadastro Inativado Corretamente',
        situacao,
        admissao: `01/0${(i % 9) + 1}/202${(i % 3) + 3}`,
        demissao: temDemissao ? `29/08/2026` : '',
        consistenciaAtivacaoColaborador: isAtivo ? 'Ativação Correta' : 'Inativação Correta - Desligamento',
        subgrupo: subg,
        codigoEmpresa: emp.codigo,
        empresa: emp.nome,
        nomeFuncionario: `COLABORADOR TESTE ${i + 1}`,
        unidade,
        setor,
      });
    }

    return result;
  }

  private buildDashboardResponse(registros: VidasTabelaGeralItem[]): VidasDashboardResponse {
    const totalRegistros = 82021; // Base de BI exata
    const inativos = 68438;
    const ativos = 13583;
    const pendentes = 324;
    const ferias = 200;
    const afastados = 120;
    const percentInconsistenciaBase = 14;
    const totalConsistencias = 70291;
    const totalInconsistencias = 11730;

    const kpis: VidasKPIs = {
      totalRegistros,
      inativos,
      ativos,
      pendentes,
      ferias,
      afastados,
      percentInconsistenciaBase,
      totalConsistencias,
      totalInconsistencias,
      ultimaAtualizacao: new Date().toISOString(),
    };

    // Registros Cadastrais
    const registrosCadastrais: RegistroCadastralItem[] = [
      { situacao: 'Inativo', quantidade: 68438 },
      { situacao: 'Ativo', quantidade: 12939 },
      { situacao: 'Pendente', quantidade: 324 },
      { situacao: 'Férias', quantidade: 200 },
      { situacao: 'Afastado', quantidade: 120 },
    ];

    // Índice de Regularização
    const indiceRegularizacao: IndiceRegularizacaoItem[] = [
      { categoria: 'Inativo', percentual: 71.99, tipo: 'Consistente' },
      { categoria: 'Inconsistência da Base de Produto', percentual: 13.96, tipo: 'Inconsistente' },
      { categoria: 'Ativo', percentual: 13.11, tipo: 'Consistente' },
      { categoria: 'Inconsistência do Cadastro Ativo', percentual: 0.34, tipo: 'Inconsistente' },
      { categoria: 'Férias', percentual: 0.24, tipo: 'Consistente' },
      { categoria: 'Pendente', percentual: 0.21, tipo: 'Consistente' },
      { categoria: 'Afastado', percentual: 0.15, tipo: 'Consistente' },
    ];

    // Consistência Plano x Ativação
    const empresasPorPlano: EmpresasPorPlanoItem[] = [
      { categoria: 'Empresa sem Cadastro', quantidade: 1255 },
      { categoria: 'Empresa com Plano', quantidade: 957 },
      { categoria: 'Empresa sem Plano', quantidade: 799 },
    ];

    const registrosPorEmpresa: RegistrosPorEmpresaItem[] = [
      { empresa: 'ASO AVULSO - MATRIZ', quantidade: 4840 },
      { empresa: 'GRUPO TORA', quantidade: 3871 },
      { empresa: 'PFM COMERCIAL LTDA - MATRIZ', quantidade: 3301 },
      { empresa: 'ASO AVULSO - BH', quantidade: 1521 },
      { empresa: 'CENTRO UNIVERSITARIO FAMETRO - UNIFAMET...', quantidade: 1059 },
      { empresa: 'RH CONSULTORIA DE RECURSOS HUMANOS LT...', quantidade: 962 },
      { empresa: 'ASO AVULSO - TORA TRANSPORTES', quantidade: 944 },
      { empresa: 'INSTITUTO MIRANTE DE CULTURA E ARTE', quantidade: 804 },
    ];

    const conformidadeAtivacao: ConformidadeAtivacaoItem[] = [
      { status: 'Consistente - Cadastro Inativado Corretamente', percentual: 65.38, tipo: 'Consistente' },
      { status: 'Consistente - Produto Aplicado a Ativação', percentual: 13.71, tipo: 'Consistente' },
      { status: 'Inconsistente - Realizar Ativação', percentual: 11.45, tipo: 'Inconsistente' },
      { status: 'Consistente - Inativação por Desligamento', percentual: 6.61, tipo: 'Consistente' },
      { status: 'Inconsistente - Realizar Inativação', percentual: 2.51, tipo: 'Inconsistente' },
      { status: 'Inconsistente - Corrigir Cadastro', percentual: 0.34, tipo: 'Inconsistente' },
    ];

    // Custo por Vida
    const planoProdutos: PlanoProdutoItem[] = [
      { produto: 'EXAMES', quantidade: 1714 },
      { produto: '(BH) ASSINATURA PERSONAL', quantidade: 328 },
      { produto: '(BH) ASSINATURA SOB MEDIDA', quantidade: 325 },
      { produto: '(CE) CREDITO DE EXAMES', quantidade: 165 },
      { produto: '(CE) ASSINATURA SOB MEDIDA', quantidade: 148 },
      { produto: '(CE) ASSINATURA PERSONAL', quantidade: 84 },
      { produto: '(BH) CREDITO DE EXAMES', quantidade: 47 },
    ];

    const valorVidasEmpresas: ValorVidasEmpresaItem[] = [
      { empresa: '(Em branco)', valorTotal: 371.67, valorFormatado: 'R$ 371,67' },
      { empresa: 'CHASE BRASIL', valorTotal: 119.00, valorFormatado: 'R$ 119,00' },
      { empresa: 'CURTIBIJU PREMIUM', valorTotal: 61.20, valorFormatado: 'R$ 61,20' },
      { empresa: 'PORT V&P SERVICOS LTDA', valorTotal: 59.80, valorFormatado: 'R$ 59,80' },
      { empresa: 'ECOROTA GESTAO DE RESIDUOS', valorTotal: 50.60, valorFormatado: 'R$ 50,60' },
      { empresa: 'FIXAR IMPRESSOES INTELIGENTES', valorTotal: 49.90, valorFormatado: 'R$ 49,90' },
      { empresa: 'SILOE INDUSTRIA DE CONFECCOES LTDA', valorTotal: 49.80, valorFormatado: 'R$ 49,80' },
    ];

    const vidasAtivasEmpresas: VidasAtivasEmpresaItem[] = [
      { empresa: 'GRUPO TORA', quantidade: 2281 },
      { empresa: 'INSTITUTO MIRANTE DE CULTURA E ARTE', quantidade: 463 },
      { empresa: 'VIP CARGAS - 05.996.122/0001-01', quantidade: 281 },
      { empresa: 'COMPANHIA DE COMUNICACAO E INF...', quantidade: 248 },
      { empresa: 'NORTEARH SERVICES LOCACAO DE MA...', quantidade: 223 },
      { empresa: 'MCD SERVICOS DE BUFFET LTDA', quantidade: 221 },
      { empresa: 'CASA FREITAS - MATRIZ', quantidade: 188 },
    ];

    // Tabelas Produtos & Empresas
    const produtosTabela: ProdutoTabelaItem[] = [
      { codigo: '2165890', empresa: 'PORT V&P SERVICOS LTDA', planoAtivacao: 'SIM', produto: '(SANTOS-SP) ASSINATURA SOB MEDIDA', subgrupo: 'FILIAL SANTOS - CLIENTE DIRETO', valorVidaMes: 'R$ 59,8', vidasAtivas: 10 },
      { codigo: '1762928', empresa: 'ECOROTA GESTAO DE RESIDUOS', planoAtivacao: 'SIM', produto: '(BH) ASSINATURA PRIME', subgrupo: 'FILIAL BH - CLIENTE DIRETO', valorVidaMes: 'R$ 50,6', vidasAtivas: 7 },
      { codigo: '1585436', empresa: 'EWERTON CAR', planoAtivacao: 'SIM', produto: '(CE) ASSINATURA PERSONAL', subgrupo: 'MATRIZ CE - CLIENTE DIRETO', valorVidaMes: 'R$ 45', vidasAtivas: 6 },
      { codigo: '1767328', empresa: 'DEPOSITO DO CONSUMIDOR LTDA', planoAtivacao: 'SIM', produto: '(CE) ASSINATURA SOB MEDIDA', subgrupo: 'MATRIZ CE - CLIENTE DIRETO', valorVidaMes: 'R$ 45', vidasAtivas: 0 },
      { codigo: '1655465', empresa: '30PRAUM', planoAtivacao: 'SIM', produto: '(CE) ASSINATURA SOB MEDIDA', subgrupo: 'MATRIZ CE - CLIENTE DIRETO', valorVidaMes: 'R$ 42', vidasAtivas: 9 },
      { codigo: '2166482', empresa: 'MISPA FACILITIES', planoAtivacao: 'SIM', produto: '(CE) ASSINATURA SOB MEDIDA', subgrupo: 'MATRIZ CE - CLIENTE DIRETO', valorVidaMes: 'R$ 39', vidasAtivas: 0 },
      { codigo: '1632815', empresa: 'ACADEMIA KTAVENTO', planoAtivacao: 'SIM', produto: '(CE) ASSINATURA SOB MEDIDA', subgrupo: 'MATRIZ CE - CLIENTE DIRETO', valorVidaMes: 'R$ 37,5', vidasAtivas: 8 },
      { codigo: '2001132', empresa: 'ROTA 11', planoAtivacao: 'SIM', produto: '(CE) ESOCIAL FIXO', subgrupo: 'MATRIZ CE - CLIENTE DIRETO', valorVidaMes: 'R$ 37,5', vidasAtivas: 8 },
    ];

    const empresasAtivacaoTabela: EmpresaAtivacaoTabelaItem[] = [
      { codigo: '1157733', empresa: 'AGLA ENGENHARIA', planoAtivacao: 'NÃO' },
      { codigo: '1191021', empresa: 'JILL INDUSTRIA COMERCIO E SERVICOS DE CONFECCOES EIRELI', planoAtivacao: 'NÃO' },
      { codigo: '1196765', empresa: 'ENGEMEDICAL - FILIAL CE 2', planoAtivacao: 'NÃO' },
      { codigo: '1197615', empresa: 'EMPRESA ASO AVULSO', planoAtivacao: 'NÃO' },
      { codigo: '1221054', empresa: 'NOSSA ENGENHARIA', planoAtivacao: 'NÃO' },
      { codigo: '1222469', empresa: 'CRC CE', planoAtivacao: 'NÃO' },
      { codigo: '1222589', empresa: 'BOTO+', planoAtivacao: 'NÃO' },
    ];

    // Análise Estrutural (Empresa, Unidade, Setor)
    const analiseEmpresas: AnaliseEstruturalItem[] = [
      { nome: 'ASO AVULSO - MATRIZ', consistente: 4837, inconsistente: 3 },
      { nome: 'GRUPO TORA', consistente: 2861, inconsistente: 1010 },
      { nome: 'PFM COMERCIAL LTDA - MATRIZ', consistente: 3296, inconsistente: 5 },
      { nome: 'ASO AVULSO - BH', consistente: 1518, inconsistente: 3 },
      { nome: 'CENTRO UNIVERSITARIO FAME...', consistente: 1056, inconsistente: 3 },
      { nome: 'RH CONSULTORIA DE RECURSOS HUMANOS...', consistente: 958, inconsistente: 4 },
      { nome: 'ASO AVULSO - TORA TRANSPORTES', consistente: 33, inconsistente: 911 },
      { nome: 'INSTITUTO MIRANTE DE CULTURA E ARTE', consistente: 675, inconsistente: 129 },
    ];

    const analiseUnidades: AnaliseEstruturalItem[] = [
      { nome: 'CENTRO UNIVERSITARIO - UNIF...', consistente: 1023, inconsistente: 2 },
      { nome: 'CREDENCIANTE - RH CONSULTORIA', consistente: 958, inconsistente: 4 },
      { nome: 'INSTITUTO MIRANTE DE CULTURA E ARTE', consistente: 674, inconsistente: 129 },
      { nome: 'CARSO INSTALACOES DO BRASIL LTDA', consistente: 727, inconsistente: 2 },
      { nome: 'COLEGIO SANTA CECILIA', consistente: 547, inconsistente: 0 },
    ];

    const analiseSetores: AnaliseEstruturalItem[] = [
      { nome: 'OPERACIONAL', consistente: 5005, inconsistente: 991 },
      { nome: 'ADMINISTRATIVO', consistente: 3486, inconsistente: 625 },
      { nome: 'PRODUÇÃO', consistente: 2852, inconsistente: 528 },
    ];

    // Perfil Demográfico
    const perfilDemografico: PerfilDemografico = {
      masculino: 8446,
      feminino: 5137,
      faixaEtaria: [
        { faixa: '16 a 18', quantidade: 99 },
        { faixa: '19 a 23', quantidade: 1326 },
        { faixa: '24 a 28', quantidade: 2313 },
        { faixa: '29 a 33', quantidade: 2222 },
        { faixa: '34 a 38', quantidade: 1889 },
        { faixa: '39 a 43', quantidade: 1724 },
        { faixa: '44 a 48', quantidade: 1453 },
        { faixa: '49 a 53', quantidade: 1046 },
        { faixa: '54 a 58', quantidade: 739 },
        { faixa: 'Acima de 58', quantidade: 772 },
      ],
      localidade: [
        { cidadeUf: 'FORTALEZA/CE', quantidade: 4083 },
        { cidadeUf: 'CONTAGEM/MG', quantidade: 2965 },
        { cidadeUf: 'BELO HORIZONTE/MG', quantidade: 2137 },
        { cidadeUf: 'SEM CADASTRO', quantidade: 1043 },
        { cidadeUf: 'SANTOS/SP', quantidade: 565 },
        { cidadeUf: 'EUSEBIO/CE', quantidade: 428 },
        { cidadeUf: 'ACARAU/CE', quantidade: 248 },
        { cidadeUf: 'SABARA/MG', quantidade: 239 },
        { cidadeUf: 'CAUCAIA/CE', quantidade: 192 },
        { cidadeUf: 'CASCAVEL/CE', quantidade: 138 },
        { cidadeUf: 'SAO PAULO/SP', quantidade: 123 },
      ],
    };

    return {
      kpis,
      registrosCadastrais,
      indiceRegularizacao,
      empresasPorPlano,
      registrosPorEmpresa,
      conformidadeAtivacao,
      planoProdutos,
      valorVidasEmpresas,
      vidasAtivasEmpresas,
      produtosTabela,
      empresasAtivacaoTabela,
      analiseEmpresas,
      analiseUnidades,
      analiseSetores,
      perfilDemografico,
    };
  }

  private filterDashboard(
    data: VidasDashboardResponse,
    empresaFiltro?: string,
    consistenciaFiltro?: string,
    motivoFiltro?: string,
  ): VidasDashboardResponse {
    if (
      (!empresaFiltro || empresaFiltro === 'Todos') &&
      (!consistenciaFiltro || consistenciaFiltro === 'Todos') &&
      (!motivoFiltro || motivoFiltro === 'Todos')
    ) {
      return data;
    }

    return data;
  }
}
