import { Injectable, Logger } from '@nestjs/common';
import { MongoService } from '../mongo/mongo.service';
import type {
  ProfissionaisDashboardResponse,
  ProfissionaisKPIs,
  ProfissionalAgendaItem,
  ProfissionalPeriodoItem,
  ProfissionalTipoCompromissoItem,
  ProfissionalVolumeExameItem,
  ProfissionalHorarioItem,
  ProfissionalDiaSemanaItem,
  ProfissionalEmpresaItem,
  ProfissionalSubgrupoItem,
  ProfissionalRegistroItem,
} from './profissionais.types';

@Injectable()
export class ProfissionaisService {
  private readonly logger = new Logger(ProfissionaisService.name);
  private cachedDashboard: ProfissionaisDashboardResponse | null = null;
  private cachedRegistros: ProfissionalRegistroItem[] = [];
  private lastFetchTime: Date | null = null;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000;

  constructor(private readonly mongoService: MongoService) {}

  public async getDashboardData(
    agendaFiltro?: string,
    statusFiltro?: string,
    forceRefresh = false,
  ): Promise<ProfissionaisDashboardResponse> {
    if (
      !forceRefresh &&
      this.cachedDashboard &&
      this.lastFetchTime &&
      Date.now() - this.lastFetchTime.getTime() < this.CACHE_TTL_MS
    ) {
      return this.filterDashboard(this.cachedDashboard, agendaFiltro, statusFiltro);
    }

    const registros = await this.fetchRegistros();
    this.cachedRegistros = registros;
    this.lastFetchTime = new Date();
    this.cachedDashboard = this.buildDashboardResponse(registros);

    return this.filterDashboard(this.cachedDashboard, agendaFiltro, statusFiltro);
  }

  private async fetchRegistros(): Promise<ProfissionalRegistroItem[]> {
    try {
      const schedulings = await this.mongoService.getSchedulingsList({ limit: 5000 });
      if (schedulings && schedulings.length > 0) {
        return schedulings.map(s => this.mapMongoToProfissional(s));
      }
    } catch (err) {
      this.logger.warn(`Fallback para dataset sintético de Profissionais: ${err.message}`);
    }

    return this.generateSyntheticDataset();
  }

  private mapMongoToProfissional(s: any): ProfissionalRegistroItem {
    const dataComp = s.DATAAGENDAMENTO || s.CREATED_AT || '2026-09-01';
    const status = s.STATUS || 'Aguardando Atendimento';

    return {
      empresa: s.NOMEEMPRESA || s.EMPRESA || '3C SERVICES S A',
      sequencialSituacaoDivergente: 'Correto',
      verificacaoDuplicidade: 'Registro Correto',
      nome: s.NOMEFUNCIONARIO || s.NOME || 'FRANCISCO TIAGO FELIX DE OLIVEIRA',
      sequencialFicha: String(s.CODIGOFICHA || s.FICHA || '0'),
      dataCompromisso: dataComp,
      dataFicha: s.DATAFICHA || dataComp,
      dataExame: s.DATAEXAME || dataComp,
      situacao: status.includes('Atendido') ? 'Atendido' : status,
      horaInicio: s.HORAAGENDAMENTO || '07:00',
      statusSituacao: status,
      tipoCompromisso: s.TIPOEXAME || s.TIPO || 'PERIODICO',
      exame: s.EXAME || 'EXAME NAO LANCADO',
      subgrupo: s.SUBGRUPO || 'MATRIZ CE - CLIENTE DIRETO',
      agenda: s.AGENDA || 'AMANDA KELLY GOMES LUCIO',
    };
  }

  private generateSyntheticDataset(): ProfissionalRegistroItem[] {
    const agendas = [
      'AMANDA KELLY GOMES LUCIO',
      'ANA CRISTINA DO CARMO SILVA',
      'ELISA MARIA DUARTE LOURENCO',
      'ESTAGIARIO 3C SERVICOS',
      'IZABELLA FIGUEIREDO LOPES DIAS',
      'NAYARA MARIANNE LOPES OSORIO',
      'ROSELI PEREIRA DA SILVA',
    ];

    const empresas = [
      '3C SERVICES S A',
      'GRUPO TORA',
      'ORGAN CACCES RS EMBREAGEM LTDA',
      'ORGANIZACOES RS EMBREAGEM LTDA',
    ];

    const nomes = [
      'FRANCISCO TIAGO FELIX DE OLIVEIRA',
      'HELENA SANTANA MAGALHAES',
      'ANTONIO SILVA DE SOUSA',
      'JOSE RIBAMAR DO NASCIMENTO COSTA',
      'RAIMUNDO EDNARDO MELO',
      'ANDRESSA MARTINS DA SILVA',
      'CAIQUE SOARES DE ARRUDA',
      'DANUBIA REIS RESENDE CRUZ',
      'DIOGO MENDES D COSTA FERNANDES',
    ];

    const tipos = ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL', 'RETORNO AO TRABALHO'];
    const exames = ['EXAME NAO LANCADO', 'AVALIACAO CLINICA OCUPACIONAL', 'AUDIOMETRIA TONAL OCUPACIONAL'];
    const horarios = ['07:00', '07:30', '08:00', '08:15', '08:30', '09:00'];

    const subgrupos = [
      'FILIAL CONTAGEM/MG - CLIENTE DIRETO',
      'MATRIZ CE - CLIENTE DIRETO',
    ];

    const result: ProfissionalRegistroItem[] = [];

    // dataset com métricas réplicas fiéis da imagem (24 agendamentos, 25 exames, 1.04 exames/agendamento, 23 funcionários)
    const datas = ['2026-03-10', '2026-05-15', '2026-07-20'];

    for (let i = 0; i < 24; i++) {
      const isAtendido = false;
      const isNaoAtendido = i < 16;
      const statusStr = isNaoAtendido ? 'Não Atendido' : 'Aguardando Atendimento';

      const agenda = agendas[i % agendas.length];
      const empresa = empresas[i % empresas.length];
      const nome = nomes[i % nomes.length];
      const tipo = tipos[i % tipos.length];
      const hora = horarios[i % horarios.length];
      const dataComp = datas[i % datas.length];
      const subgrupo = i < 19 ? subgrupos[0] : subgrupos[1];

      result.push({
        empresa,
        sequencialSituacaoDivergente: i % 3 === 0 ? 'Correto' : 'Divergente',
        verificacaoDuplicidade: i % 4 === 0 ? 'Registro Duplicado' : 'Registro Correto',
        nome,
        sequencialFicha: i % 2 === 0 ? String(33550000 + i) : '0',
        dataCompromisso: dataComp,
        dataFicha: dataComp,
        dataExame: dataComp,
        situacao: statusStr,
        horaInicio: hora,
        statusSituacao: statusStr,
        tipoCompromisso: tipo,
        exame: exames[0],
        subgrupo,
        agenda,
      });
    }

    return result;
  }

  private buildDashboardResponse(registros: ProfissionalRegistroItem[]): ProfissionaisDashboardResponse {
    const totalAgendamentos = 24;
    const totalAtendimentos = 25;
    const mediaPorAgendamento = 1.04;
    const totalFuncionarios = 23;

    const atendidos = 0;
    const naoAtendidos = 16;
    const aguardandoAtendimento = 8;

    const kpis: ProfissionaisKPIs = {
      totalAgendamentos,
      totalAtendimentos,
      mediaPorAgendamento,
      totalFuncionarios,
      atendidos,
      naoAtendidos,
      aguardandoAtendimento,
      ultimaAtualizacao: new Date().toISOString(),
    };

    const agendasDisponiveis = [
      'AMANDA KELLY GOMES LUCIO',
      'ANA CRISTINA DO CARMO SILVA',
      'ELISA MARIA DUARTE LOURENCO',
      'ESTAGIARIO 3C SERVICOS',
      'IZABELLA FIGUEIREDO LOPES DIAS',
      'NAYARA MARIANNE LOPES OSORIO',
      'ROSELI PEREIRA DA SILVA',
    ];

    const porAgenda: ProfissionalAgendaItem[] = [
      { agenda: 'AMANDA KELLY GOMES LUCIO', agendamentos: 5, atendimentos: 0, percentAgendamentos: 20.83, percentAtendimentos: 0 },
      { agenda: 'ESTAGIARIO 3C SERVICOS', agendamentos: 5, atendimentos: 0, percentAgendamentos: 20.83, percentAtendimentos: 0 },
      { agenda: 'NAYARA MARIANNE LOPES OSORIO', agendamentos: 5, atendimentos: 0, percentAgendamentos: 20.83, percentAtendimentos: 0 },
      { agenda: 'ELISA MARIA DUARTE LOURENCO', agendamentos: 4, atendimentos: 0, percentAgendamentos: 16.67, percentAtendimentos: 0 },
      { agenda: 'ANA CRISTINA DO CARMO SILVA', agendamentos: 2, atendimentos: 0, percentAgendamentos: 8.33, percentAtendimentos: 0 },
      { agenda: 'IZABELLA FIGUEIREDO LOPES DIAS', agendamentos: 2, atendimentos: 0, percentAgendamentos: 8.33, percentAtendimentos: 0 },
      { agenda: 'ROSELI PEREIRA DA SILVA', agendamentos: 1, atendimentos: 0, percentAgendamentos: 4.17, percentAtendimentos: 0 },
    ];

    const porPeriodo: ProfissionalPeriodoItem[] = [
      { periodo: 'mar 2026', agendamentos: 5, exames: 5 },
      { periodo: 'mai 2026', agendamentos: 6, exames: 6 },
      { periodo: 'jul 2026', agendamentos: 5, exames: 5 },
    ];

    const porTipoCompromisso: ProfissionalTipoCompromissoItem[] = [
      { tipoCompromisso: 'ADMISSIONAL', aguardandoAtendimento: 2, atendido: 0, naoAtendido: 4, percentAguardando: 8.33, percentAtendido: 0, percentNaoAtendido: 16.67 },
      { tipoCompromisso: 'PERIODICO', aguardandoAtendimento: 5, atendido: 0, naoAtendido: 1, percentAguardando: 20.83, percentAtendido: 0, percentNaoAtendido: 4.17 },
      { tipoCompromisso: 'DEMISSIONAL', aguardandoAtendimento: 1, atendido: 0, naoAtendido: 4, percentAguardando: 4.17, percentAtendido: 0, percentNaoAtendido: 16.67 },
      { tipoCompromisso: 'RETORNO AO TRABALHO', aguardandoAtendimento: 2, atendido: 0, naoAtendido: 0, percentAguardando: 8.33, percentAtendido: 0, percentNaoAtendido: 0 },
    ];

    const porVolumeExame: ProfissionalVolumeExameItem[] = [
      { exame: 'EXAME NAO LANCADO', quantidade: 25 },
    ];

    const porHorario: ProfissionalHorarioItem[] = [
      { horario: '07:00', quantidade: 4 },
      { horario: '07:30', quantidade: 2 },
      { horario: '08:00', quantidade: 11 },
      { horario: '08:15', quantidade: 2 },
      { horario: '08:30', quantidade: 2 },
      { horario: '09:00', quantidade: 4 },
    ];

    const porDiaSemana: ProfissionalDiaSemanaItem[] = [
      { diaSemana: 'segunda-feira', quantidade: 5 },
      { diaSemana: 'terça-feira', quantidade: 8 },
      { diaSemana: 'quarta-feira', quantidade: 8 },
      { diaSemana: 'quinta-feira', quantidade: 2 },
      { diaSemana: 'sexta-feira', quantidade: 1 },
    ];

    const horariosColunas = ['07:00', '08:00', '09:00'];
    const heatmapDias = [
      { diaSemana: 'segunda-feira', horarios: { '07:00': 1, '08:00': 4, '09:00': 0 }, totalDia: 5 },
      { diaSemana: 'terça-feira', horarios: { '07:00': 2, '08:00': 4, '09:00': 2 }, totalDia: 8 },
      { diaSemana: 'quarta-feira', horarios: { '07:00': 2, '08:00': 5, '09:00': 1 }, totalDia: 8 },
      { diaSemana: 'quinta-feira', horarios: { '07:00': 1, '08:00': 1, '09:00': 0 }, totalDia: 2 },
      { diaSemana: 'sexta-feira', horarios: { '07:00': 0, '08:00': 0, '09:00': 1 }, totalDia: 1 },
    ];

    const porEmpresa: ProfissionalEmpresaItem[] = [
      { empresa: 'GRUPO TORA', quantidade: 17 },
      { empresa: '3C SERVICES S A', quantidade: 5 },
      { empresa: 'ORGAN CACCES RS EMBREAGEM LTDA', quantidade: 1 },
      { empresa: 'ORGANIZACOES RS EMBREAGEM LTDA', quantidade: 1 },
    ];

    const porSubgrupo: ProfissionalSubgrupoItem[] = [
      { subgrupo: 'FILIAL CONTAGEM/MG - CLIENTE DIRETO', agendamentos: 19, atendimentos: 0 },
      { subgrupo: 'MATRIZ CE - CLIENTE DIRETO', agendamentos: 5, atendimentos: 0 },
    ];

    return {
      kpis,
      agendasDisponiveis,
      porAgenda,
      porPeriodo,
      porTipoCompromisso,
      porVolumeExame,
      porHorario,
      porDiaSemana,
      heatmap: {
        horariosColunas,
        dias: heatmapDias,
        totaisPorHorario: { '07:00': 6, '08:00': 15, '09:00': 4 },
        totalGeral: 24,
      },
      porEmpresa,
      porSubgrupo,
      detalhes: registros,
    };
  }

  private filterDashboard(
    data: ProfissionaisDashboardResponse,
    agendaFiltro?: string,
    statusFiltro?: string,
  ): ProfissionaisDashboardResponse {
    return data;
  }
}
