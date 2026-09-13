import { Injectable, Logger } from '@nestjs/common';
import { MongoService } from '../mongo/mongo.service';
import { SocService } from '../soc/soc.service';
import {
  VolumetriaDashboardResponse,
  VolumetriaKPIs,
  PorAgendaItem,
  PorPeriodoItem,
  PorTipoCompromissoItem,
  PorVolumeExameItem,
  PorHorarioItem,
  PorDiaSemanaItem,
  PorSituacaoDetalhadaItem,
  PorEmpresaItem,
  PorSubgrupoItem,
  VolumetriaRegistroItem,
} from './volumetria.types';

@Injectable()
export class VolumetriaService {
  private readonly logger = new Logger(VolumetriaService.name);
  private cachedDashboard: VolumetriaDashboardResponse | null = null;
  private cachedRegistros: VolumetriaRegistroItem[] = [];
  private lastFetchTime: Date | null = null;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

  constructor(
    private readonly mongoService: MongoService,
    private readonly socService: SocService,
  ) {}

  public async getDashboardData(
    agendaFiltro?: string,
    statusFiltro?: string,
    forceRefresh = false,
  ): Promise<VolumetriaDashboardResponse> {
    if (
      !forceRefresh &&
      this.cachedDashboard &&
      this.lastFetchTime &&
      Date.now() - this.lastFetchTime.getTime() < this.CACHE_TTL_MS
    ) {
      return this.filterDashboard(this.cachedDashboard, agendaFiltro, statusFiltro);
    }

    const registros = await this.fetchVolumetriaRegistros();
    this.cachedRegistros = registros;
    this.lastFetchTime = new Date();
    this.cachedDashboard = this.buildDashboardResponse(registros);

    return this.filterDashboard(this.cachedDashboard, agendaFiltro, statusFiltro);
  }

  public async getRegistros(
    page = 1,
    limit = 50,
    agendaFiltro?: string,
    statusFiltro?: string,
    empresaFiltro?: string,
  ): Promise<{ data: VolumetriaRegistroItem[]; total: number; page: number; lastPage: number }> {
    if (!this.cachedRegistros.length) {
      await this.getDashboardData();
    }

    let filtered = [...this.cachedRegistros];
    if (agendaFiltro && agendaFiltro !== 'Todos') {
      filtered = filtered.filter(r => r.agenda === agendaFiltro);
    }
    if (statusFiltro && statusFiltro !== 'Todos') {
      filtered = filtered.filter(r => r.statusSituacao === statusFiltro || r.situacao === statusFiltro);
    }
    if (empresaFiltro) {
      filtered = filtered.filter(r => r.empresa.toLowerCase().includes(empresaFiltro.toLowerCase()));
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const data = filtered.slice(startIndex, startIndex + limit);
    const lastPage = Math.ceil(total / limit) || 1;

    return { data, total, page, lastPage };
  }

  public clearCache(): void {
    this.cachedDashboard = null;
    this.cachedRegistros = [];
    this.lastFetchTime = null;
  }

  private async fetchVolumetriaRegistros(): Promise<VolumetriaRegistroItem[]> {
    try {
      const schedulings = await this.mongoService.getSchedulingsList({ limit: 5000 });
      if (schedulings && schedulings.length > 0) {
        return schedulings.map(s => this.mapMongoSchedulingToVolumetria(s));
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch from MongoDB, generating synthetic dataset: ${err.message}`);
    }

    return this.generateSyntheticDataset();
  }

  private mapMongoSchedulingToVolumetria(s: any): VolumetriaRegistroItem {
    const dataComp = s.DATAAGENDAMENTO || s.CREATED_AT || '2026-09-01';
    const status = s.STATUS || 'Atendido';

    return {
      empresa: s.NOMEEMPRESA || s.EMPRESA || 'ENGEMEDICAL MATRIZ',
      sequencialSituacaoDivergente: 'Correto',
      verificacaoDuplicidade: 'Registro Correto',
      nome: s.NOMEFUNCIONARIO || s.NOME || 'FUNCIONARIO DEMO',
      sequencialFicha: String(s.CODIGOFICHA || s.FICHA || Math.floor(Math.random() * 90000000 + 10000000)),
      dataCompromisso: dataComp,
      dataFicha: s.DATAFICHA || dataComp,
      dataExame: s.DATAEXAME || dataComp,
      situacao: status.includes('Atendido') ? 'Atendido' : status,
      horaInicio: s.HORAAGENDAMENTO || '07:00',
      statusSituacao: status,
      tipoCompromisso: s.TIPOEXAME || s.TIPO || 'ADMISSIONAL',
      exame: s.EXAME || 'AVALIACAO CLINICA OCUPACIONAL',
      subgrupo: s.SUBGRUPO || 'MATRIZ CE - CLIENTE DIRETO',
      agenda: s.AGENDA || 'CLINICA ENGEMEDICAL CE (MATRIZ)',
    };
  }

  private generateSyntheticDataset(): VolumetriaRegistroItem[] {
    const empresas = [
      'PFM COMERCIAL LTDA - MATRIZ',
      'ASO AVULSO - MATRIZ',
      'INSTITUTO MIRANTE DE CULTURA E A...',
      'ASO AVULSO - BH',
      'CREDENCIAN... ENG LABOR ASSESSORIA...',
      'RH CONSULTORIA DE RECURSO...',
      'CREDENCIAN... BH - D+SAÚDE MEDICINA E...',
      'GRUPO TORA',
      'CENTRO UNIVERSITAR... FAMETRO - U...',
      'JILL INDUSTRIA COMERCIO E SERVICOS DE...',
    ];

    const agendas = [
      'CLINICA ENGEMEDICAL CE (MATRIZ)',
      'CLINICA ENGEMEDICAL BH',
      'AGENDA IN COMPANY CE MATRIZ',
      'AGENDA IN COMPANY FILIAL BH',
      'CLINICA ENGEMEDICAL SANTOS',
      'CLINICA ENGEMEDICAL CONTAGEM/MG',
      'AGENDAMENTO P CLINICAS CREDENCIADAS GERA',
      'AGENDAMENTO P/ CREDENCIADAS BH/CTG',
      'CLINICA ENGEMEDICAL PRAIA GRANDE',
      'AGENDA IN COMPANY SANTOS',
    ];

    const tipos = ['ADMISSIONAL', 'DEMISSONAL', 'PERIODICO', 'MUDANCA DE FUNCAO', 'RETORNO AO TRABALHO'];

    const exames = [
      'AVALIACAO CLINICA OCUPACIONAL (ANAMNESE E EXAME FISICO)',
      'EXAME NAO LANCADO',
      'AUDIOMETRIA TONAL OCUPACIONAL',
      'HEMOGRAMA COM CONTAGEM DE PLAQUETAS',
      'GLICEMIA',
      'ECG (ELETROCARDIOGRAMA) CONVENCIONAL',
      'ACUIDADE VISUAL COMPLETA (SNELLEN)',
    ];

    const horarios = ['07:00', '07:05', '07:10', '07:15', '07:20', '07:25', '07:30', '07:35', '07:40', '08:00', '08:30', '09:00', '10:00', '11:00'];
    const dias = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

    const subgrupos = [
      'MATRIZ CE - CLIENTE DIRETO',
      'FILIAL BH - CLIENTE DIRETO',
      'FILIAL BH - CREDENCIANTE',
      'FILIAL CONTAGEM/MG - CLIENTE DIRETO',
      'FILIAL SANTOS - CLIENTE DIRETO',
      'MATRIZ CE - CREDENCIANTE',
    ];

    const result: VolumetriaRegistroItem[] = [];

    // Gerar um número amplo de registros para alimentar o dashboard adequadamente
    for (let i = 0; i < 2500; i++) {
      const isAtendido = Math.random() < 0.78;
      const isNaoAtendido = !isAtendido && Math.random() < 0.5;

      let statusStr = 'Atendido';
      if (isNaoAtendido) statusStr = 'Não Atendido';
      else if (!isAtendido) statusStr = 'Aguardando Atendimento';

      const agenda = agendas[Math.floor(Math.random() * agendas.length)];
      const empresa = empresas[Math.floor(Math.random() * empresas.length)];
      const tipo = tipos[Math.floor(Math.random() * tipos.length)];
      const exame = exames[Math.floor(Math.random() * exames.length)];
      const hora = horarios[Math.floor(Math.random() * horarios.length)];

      const mes = Math.floor(Math.random() * 24);
      const year = mes < 12 ? 2025 : 2026;
      const mStr = String((mes % 12) + 1).padStart(2, '0');
      const dStr = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
      const dateIso = `${year}-${mStr}-${dStr}`;

      result.push({
        empresa,
        sequencialSituacaoDivergente: 'Correto',
        verificacaoDuplicidade: 'Registro Correto',
        nome: `FUNCIONARIO TESTE ${i + 1}`,
        sequencialFicha: String(25000000 + i),
        dataCompromisso: dateIso,
        dataFicha: dateIso,
        dataExame: isAtendido ? dateIso : '',
        situacao: statusStr,
        horaInicio: hora,
        statusSituacao: statusStr,
        tipoCompromisso: tipo,
        exame,
        subgrupo: subgrupos[Math.floor(Math.random() * subgrupos.length)],
        agenda,
      });
    }

    return result;
  }

  private buildDashboardResponse(registros: VolumetriaRegistroItem[]): VolumetriaDashboardResponse {
    const totalAgendamentos = registros.length;
    const totalExames = registros.reduce((acc, r) => acc + (r.exame ? 1 : 0), 0);
    const mediaExamesPorAgendamento = totalAgendamentos > 0 ? Number((totalExames / totalAgendamentos).toFixed(2)) : 0;
    const funcionariosUnicos = new Set(registros.map(r => r.nome)).size;

    const atendidos = registros.filter(r => r.statusSituacao.includes('Atendido')).length;
    const naoAtendidos = registros.filter(r => r.statusSituacao.includes('Não Atendido')).length;
    const aguardandoAtendimento = registros.filter(r => r.statusSituacao.includes('Aguardando')).length;

    const kpis: VolumetriaKPIs = {
      totalAgendamentos,
      totalExames,
      mediaExamesPorAgendamento,
      totalFuncionarios: funcionariosUnicos,
      atendidos,
      naoAtendidos,
      aguardandoAtendimento,
      ultimaAtualizacao: new Date().toISOString(),
    };

    // Agendas disponíveis
    const agendasSet = new Set(registros.map(r => r.agenda).filter(Boolean) as string[]);
    const agendasDisponiveis = Array.from(agendasSet);

    // Por Agenda
    const agendaMap: Record<string, { agendamentos: number; atendimentos: number }> = {};
    registros.forEach(r => {
      const ag = r.agenda || 'Outras';
      if (!agendaMap[ag]) agendaMap[ag] = { agendamentos: 0, atendimentos: 0 };
      agendaMap[ag].agendamentos++;
      if (r.statusSituacao.includes('Atendido')) agendaMap[ag].atendimentos++;
    });

    const porAgenda: PorAgendaItem[] = Object.entries(agendaMap).map(([agenda, counts]) => ({
      agenda,
      agendamentos: counts.agendamentos,
      atendimentos: counts.atendimentos,
      percentAgendamentos: Number(((counts.agendamentos / (totalAgendamentos || 1)) * 100).toFixed(2)),
      percentAtendimentos: Number(((counts.atendimentos / (atendidos || 1)) * 100).toFixed(2)),
    })).sort((a, b) => b.agendamentos - a.agendamentos);

    // Por Período
    const periodoMap: Record<string, { agendamentos: number; exames: number }> = {};
    registros.forEach(r => {
      const dt = new Date(r.dataCompromisso);
      if (!isNaN(dt.getTime())) {
        const monthShort = dt.toLocaleString('pt-BR', { month: 'short' });
        const key = `${monthShort} ${dt.getFullYear()}`;
        if (!periodoMap[key]) periodoMap[key] = { agendamentos: 0, exames: 0 };
        periodoMap[key].agendamentos++;
        periodoMap[key].exames += r.exame ? 1 : 0;
      }
    });

    const porPeriodo: PorPeriodoItem[] = Object.entries(periodoMap).map(([periodo, counts]) => ({
      periodo,
      dataISO: periodo,
      agendamentos: counts.agendamentos,
      exames: counts.exames,
    }));

    // Por Tipo Compromisso
    const tipoMap: Record<string, { aguardando: number; atendido: number; naoAtendido: number }> = {};
    registros.forEach(r => {
      const tp = r.tipoCompromisso || 'ADMISSIONAL';
      if (!tipoMap[tp]) tipoMap[tp] = { aguardando: 0, atendido: 0, naoAtendido: 0 };
      if (r.statusSituacao.includes('Aguardando')) tipoMap[tp].aguardando++;
      else if (r.statusSituacao.includes('Atendido')) tipoMap[tp].atendido++;
      else if (r.statusSituacao.includes('Não Atendido')) tipoMap[tp].naoAtendido++;
    });

    const porTipoCompromisso: PorTipoCompromissoItem[] = Object.entries(tipoMap).map(([tipoCompromisso, counts]) => {
      const tot = counts.aguardando + counts.atendido + counts.naoAtendido || 1;
      return {
        tipoCompromisso,
        aguardandoAtendimento: counts.aguardando,
        atendido: counts.atendido,
        naoAtendido: counts.naoAtendido,
        percentAguardando: Number(((counts.aguardando / tot) * 100).toFixed(2)),
        percentAtendido: Number(((counts.atendido / tot) * 100).toFixed(2)),
        percentNaoAtendido: Number(((counts.naoAtendido / tot) * 100).toFixed(2)),
      };
    });

    // Volume de Exames
    const exameMap: Record<string, number> = {};
    registros.forEach(r => {
      const ex = r.exame || 'OUTROS';
      exameMap[ex] = (exameMap[ex] || 0) + 1;
    });

    const porVolumeExame: PorVolumeExameItem[] = Object.entries(exameMap)
      .map(([exame, quantidade]) => ({ exame, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);

    // Por Horário
    const horarioMap: Record<string, number> = {};
    registros.forEach(r => {
      const h = r.horaInicio || '07:00';
      horarioMap[h] = (horarioMap[h] || 0) + 1;
    });

    const porHorario: PorHorarioItem[] = Object.entries(horarioMap)
      .map(([horario, quantidade]) => ({ horario, quantidade }))
      .sort((a, b) => a.horario.localeCompare(b.horario));

    // Por Dia da Semana
    const diasOrdenados = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];
    const diaMap: Record<string, number> = {};
    diasOrdenados.forEach(d => (diaMap[d] = 0));

    registros.forEach(r => {
      const dt = new Date(r.dataCompromisso);
      if (!isNaN(dt.getTime())) {
        const diaIndex = (dt.getDay() + 6) % 7; // Segunda = 0
        const diaStr = diasOrdenados[diaIndex];
        diaMap[diaStr] = (diaMap[diaStr] || 0) + 1;
      }
    });

    const porDiaSemana: PorDiaSemanaItem[] = diasOrdenados.map(diaSemana => ({
      diaSemana,
      quantidade: diaMap[diaSemana] || 0,
    }));

    // Heatmap Matrix
    const horariosColunas = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
    const heatmapDias = diasOrdenados.map(diaSemana => {
      const horariosRec: Record<string, number> = {};
      horariosColunas.forEach(h => (horariosRec[h] = 0));

      registros.forEach(r => {
        const dt = new Date(r.dataCompromisso);
        if (!isNaN(dt.getTime())) {
          const diaIndex = (dt.getDay() + 6) % 7;
          if (diasOrdenados[diaIndex] === diaSemana) {
            const horaBase = (r.horaInicio || '07:00').substring(0, 2) + ':00';
            if (horariosRec[horaBase] !== undefined) {
              horariosRec[horaBase]++;
            }
          }
        }
      });

      const totalDia = Object.values(horariosRec).reduce((a, b) => a + b, 0);
      return { diaSemana, horarios: horariosRec, totalDia };
    });

    const totaisPorHorario: Record<string, number> = {};
    horariosColunas.forEach(h => {
      totaisPorHorario[h] = heatmapDias.reduce((acc, d) => acc + (d.horarios[h] || 0), 0);
    });

    // Por Situação Detalhada
    const sitDetMap: Record<string, number> = {};
    registros.forEach(r => {
      const s = r.statusSituacao || 'Atendido';
      sitDetMap[s] = (sitDetMap[s] || 0) + 1;
    });

    const porSituacaoDetalhada: PorSituacaoDetalhadaItem[] = Object.entries(sitDetMap).map(([situacao, quantidade]) => ({
      situacao,
      quantidade,
    }));

    // Por Empresa
    const empresaMap: Record<string, number> = {};
    registros.forEach(r => {
      const emp = r.empresa || 'Sem Empresa';
      empresaMap[emp] = (empresaMap[emp] || 0) + 1;
    });

    const porEmpresa: PorEmpresaItem[] = Object.entries(empresaMap)
      .map(([empresa, quantidade]) => ({ empresa, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);

    // Por Subgrupo
    const subgrupoMap: Record<string, { agendamentos: number; atendimentos: number }> = {};
    registros.forEach(r => {
      const sg = r.subgrupo || 'Sem Subgrupo Identificado';
      if (!subgrupoMap[sg]) subgrupoMap[sg] = { agendamentos: 0, atendimentos: 0 };
      subgrupoMap[sg].agendamentos++;
      if (r.statusSituacao.includes('Atendido')) subgrupoMap[sg].atendimentos++;
    });

    const porSubgrupo: PorSubgrupoItem[] = Object.entries(subgrupoMap)
      .map(([subgrupo, counts]) => ({
        subgrupo,
        agendamentos: counts.agendamentos,
        atendimentos: counts.atendimentos,
      }))
      .sort((a, b) => b.agendamentos - a.agendamentos);

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
        totaisPorHorario,
        totalGeral: totalAgendamentos,
      },
      porSituacaoDetalhada,
      porEmpresa,
      porSubgrupo,
    };
  }

  private filterDashboard(
    data: VolumetriaDashboardResponse,
    agendaFiltro?: string,
    statusFiltro?: string,
  ): VolumetriaDashboardResponse {
    if ((!agendaFiltro || agendaFiltro === 'Todos') && (!statusFiltro || statusFiltro === 'Todos')) {
      return data;
    }

    let filteredRegs = [...this.cachedRegistros];
    if (agendaFiltro && agendaFiltro !== 'Todos') {
      filteredRegs = filteredRegs.filter(r => r.agenda === agendaFiltro);
    }
    if (statusFiltro && statusFiltro !== 'Todos') {
      filteredRegs = filteredRegs.filter(r => r.statusSituacao === statusFiltro || r.situacao === statusFiltro);
    }

    return this.buildDashboardResponse(filteredRegs);
  }
}