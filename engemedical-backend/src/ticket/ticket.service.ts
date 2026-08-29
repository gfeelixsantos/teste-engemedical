import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import {
  Ticket,
  TicketEmitedDto,
  PreparationRequest,
} from './interfaces/ticket';
import {
  PreferentialTypes,
  TicketActionType,
  TicketStatus,
  TicketGroups,
} from './enum/ticket.enum';
import { WebsocketType } from 'src/websocket/enum/websocket.enum';
import { ActionRequest } from 'src/websocket/interfaces/actions';
import { TtsService } from 'src/aws/tts.service';
import { PainelCall } from 'src/painel/painel.interface';
import { WebsocketGateway } from 'src/websocket/websocket-connection';
import { EventType } from 'src/websocket/events/events';
import { MongoService } from 'src/mongo/mongo.service';

@Injectable()
export class TicketService implements OnModuleInit {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly ttsService: TtsService,
    private readonly wsGateway: WebsocketGateway,
    private readonly mongoService: MongoService,
  ) {}

  onModuleInit() {
    this.logger.log(
      'TicketService inicializado com Supabase (Soft Delete Ativo)',
    );
  }

  private db() {
    return this.supabase['supabaseClient'];
  }

  handleTicketEmited(ticket: Ticket) {
    try {
      this.wsGateway.server
        .to(ticket.unidade)
        .emit(EventType.TICKET_EMITED, ticket);
    } catch (err) {
      this.logger.error('Erro ao emitir ticket via WS', err);
    }
  }

  // ----------------------------------------------------
  // CREATE TICKET (Garante sequencial contínuo)
  // ----------------------------------------------------
  async create(ticket: TicketEmitedDto): Promise<Ticket> {
    const db = this.db();
    const unidade = ticket.unidade?.trim().toUpperCase();
    const prefixo = ticket.prefixo?.trim().toUpperCase();

    this.logger.log(
      `[create] Iniciando criação de ticket: unidade=${unidade}, prefixo=${prefixo}`,
    );

    // 1) Buscar último número (Independente de estar ativo ou deletado)
    const { data: lastTicket, error: lastErr } = await db
      .from('tickets')
      .select('numero')
      .eq('unidade', unidade)
      .eq('prefixo', prefixo)
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastErr) {
      this.logger.error('[create] Erro ao buscar último ticket:', lastErr);
      throw lastErr;
    }

    const nextNumber = lastTicket ? lastTicket.numero + 1 : 1;
    this.logger.log(`[create] Próximo número: ${nextNumber}`);

    // 2) Criar com as novas propriedades de controle
    const insertData = {
      emissao: ticket.emissao || new Date(),
      numero: nextNumber,
      prefixo,
      preferencial: ticket.preferencial ?? false,
      preferencialTipo: ticket?.preferencialTipo || null,
      status: TicketStatus.AGUARDANDO,
      type: WebsocketType.TICKET,
      unidade,
      grupo: ticket.grupo,
      ativo: true,
      deleted: null,
    };
    this.logger.log(`[create] Dados para inserção:`, insertData);

    const { data, error } = await db
      .from('tickets')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      this.logger.error('[create] Erro ao inserir ticket:', error);
      throw error;
    }
    this.logger.log(`[create] Ticket criado com sucesso:`, data);
    return data as Ticket;
  }

  async update(id: number, data: Partial<any>) {
    const { data: updated, error } = await this.db()
      .from('tickets')
      .update({ ...data, updatedAt: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  // ----------------------------------------------------
  // DELETE TICKET (Agora como Soft Delete)
  // ----------------------------------------------------
  async deleteById(id: number) {
    const { data, error } = await this.db()
      .from('tickets')
      .update({
        ativo: false,
        deleted: new Date(),
      })
      .eq('id', id)
      .select();

    if (error) {
      throw new BadRequestException(
        `Erro ao desativar ticket: ${error.message}`,
      );
    }
    return data;
  }

  async getTicketById(id: number) {
    const { data, error } = await this.db()
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // ----------------------------------------------------
  // FIND BY UNIDADE (Filtra apenas os ATIVOS)
  // ----------------------------------------------------
  async findByUnidade(unidade: string) {
    const db = this.db();
    const unit = unidade.trim().toUpperCase();

    // Busca apenas tickets que não foram "deletados"
    const { data: tickets, error: ticketErr } = await db
      .from('tickets')
      .select('*')
      .eq('unidade', unit)
      .eq('ativo', true) // Filtro essencial para o painel
      .order('numero', { ascending: true });

    if (ticketErr) throw ticketErr;

    // Conta todos os tickets da unidade (ativos + inativos) para o total emitido
    const { count: totalTickets, error: countErr } = await db
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('unidade', unit);

    if (countErr) throw countErr;

    // Na preparação, filtramos tickets internos que também estejam ativos
    const { data: prep, error: prepErr } = await db
      .from('preparacao')
      .select('*, tickets(*)')
      .eq('unidade', unit)
      .eq('tickets.ativo', true); // Garante integridade na relação

    if (prepErr) throw prepErr;

    return { tickets, preparationRequests: prep, totalTickets: totalTickets ?? 0 };
  }

  // ----------------------------------------------------
  // FIND ALL TICKETS (Para o monitor de acompanhamento)
  // ----------------------------------------------------
  async findAllTickets(unidade?: string) {
    const db = this.db();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let query = db
      .from('tickets')
      .select('*')
      .gte('emissao', startOfDay.toISOString())
      .lte('emissao', endOfDay.toISOString());

    if (unidade && unidade.trim().toUpperCase() !== 'ALL') {
      query = query.eq('unidade', unidade.trim().toUpperCase());
    }

    const { data: tickets, error } = await query.order('emissao', {
      ascending: false,
    });

    if (error) {
      this.logger.error('[findAllTickets] Erro ao buscar todos os tickets:', error);
      throw error;
    }

    return tickets;
  }

  // ----------------------------------------------------
  // DELETE OLD TICKETS
  // ----------------------------------------------------
  async deleteOldTickets() {
    const { data, error } = await this.db()
      .from('tickets')
      .delete()
      .eq('type', WebsocketType.TICKET);

    if (error) throw error;
    return data;
  }


  async deletePreparationRequest(request: PreparationRequest) {
    // Se a preparação também tiver soft delete, mude para update aqui.
    const { data, error } = await this.db()
      .from('preparacao')
      .delete()
      .eq('ticketId', request.ticketId);

    if (error) throw error;
    return data;
  }

  async audioGenerate(
    ticket,
    funcionario = '',
    exame = '',
    unidade,
  ): Promise<PainelCall> {
    const chamada: PainelCall = {
      id: ticket.id,
      sala: ticket.sala ?? '',
      exame: exame || ticket.exame,
      ticket: `${ticket.prefixo}${ticket.numero}`,
      name: funcionario,
      unidade,
    };
    chamada.audio = await this.ttsService.synthesize(chamada);
    return chamada;
  }

  async executeAction(request: ActionRequest) {
    const db = this.db();
    const { ticketId, action, user } = request;

    const { data: ticket, error: findErr } = await db
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (findErr || !ticket)
      throw new Error(`Ticket ${ticketId} não encontrado.`);

    this.logger.log(
      `[TICKET_ACTION][IN] ticketId=${ticketId} action=${action} unidade=${request.unidade || ticket.unidade || 'n/a'} sala=${request.sala || ticket.sala || 'n/a'} currentStatus=${ticket.status || 'n/a'} currentGroup=${ticket.grupo || 'n/a'} user=${user || 'n/a'}`,
    );

    let nextStatus;
    let nextGroup = ticket.grupo;

    switch (action) {
      case TicketActionType.CHAMAR:
        nextStatus = TicketStatus.EM_CHAMADA;
        break;
      case TicketActionType.RETORNAR:
        nextStatus = TicketStatus.AGUARDANDO;
        break;
      case TicketActionType.ATENDER:
        nextStatus = TicketStatus.EM_ATENDIMENTO;
        break;
      case TicketActionType.AGUARDAR:
        nextStatus = TicketStatus.AGUARDANDO;
        break;
      case TicketActionType.EM_PREPRACAO:
        nextStatus = TicketStatus.EM_PREPRACAO;
        break;
      case TicketActionType.PREPARO_OK:
        nextStatus = TicketStatus.PREPARO_OK;
        break;
      case TicketActionType.ENCAMINHADO_RX:
        nextStatus = TicketStatus.ENCAMINHADO_RX;
        break;
      case TicketActionType.FINALIZAR:
        nextStatus = TicketStatus.FINALIZADO;
        break;
      case TicketActionType.EXAME:
        nextStatus = TicketStatus.AGUARDANDO;
        nextGroup = TicketGroups.EXAME;
        if (!request.funcionario)
          throw new BadRequestException('Funcionário não informado.');

        const updatedTicketMongo: Ticket = {
          ...ticket,
          atendente: user,
          status: nextStatus,
          grupo: nextGroup,
          updatedAt: new Date(),
        };

        await this.mongoService.updateTicketScheduling(
          request.funcionario,
          updatedTicketMongo,
        );
        break;
      default:
        throw new Error(`Ação inválida: ${action}`);
    }

    // Para EXAME, mesmo com status igual, ainda precisamos sincronizar Supabase
    // para evitar estado parcial entre tickets (Supabase) e schedulings (Mongo).
    if (action !== TicketActionType.EXAME && ticket.status === nextStatus)
      return ticket;

    // Limpeza de preparação se mudar de status
    if (
      ticket.status === TicketStatus.EM_PREPRACAO &&
      action !== TicketActionType.EM_PREPRACAO
    ) {
      await db.from('preparacao').delete().eq('ticketId', ticketId);
    }

    const { data: updatedTicket, error: updErr } = await db
      .from('tickets')
      .update({
        status: nextStatus,
        sala: request.sala ?? ticket.sala,
        atendente: request.user ?? ticket.atendente,
        unidade: request.unidade ?? ticket.unidade,
        grupo: nextGroup,
        ativo: action === TicketActionType.EXAME ? false : ticket.ativo,
        updatedAt: new Date(),
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (updErr) throw updErr;

    this.logger.log(
      `[TICKET_ACTION][OUT] ticketId=${ticketId} action=${action} nextStatus=${updatedTicket?.status || nextStatus || 'n/a'} nextGroup=${updatedTicket?.grupo || nextGroup || 'n/a'} ativo=${updatedTicket?.ativo ?? (action === TicketActionType.EXAME ? false : ticket.ativo)} unidade=${updatedTicket?.unidade || request.unidade || ticket.unidade || 'n/a'}`,
    );

    return updatedTicket;
  }

  async createPreparation(req: PreparationRequest) {
    const db = this.db();
    req.unidade = req.unidade?.trim().toUpperCase();

    const { data: existing } = await db
      .from('preparacao')
      .select('id')
      .eq('ticketId', req.ticketId)
      .maybeSingle();

    let createdOrUpdated: any;
    const payload = {
      empresa: req.empresa,
      nome: req.nome,
      dataNascimento: req.dataNascimento,
      cpf: req.cpf,
      tipoExame: req.tipoExame,
      informacoes: req.informacoes,
      unidade: req.unidade,
      sala: req.sala,
      atendente: req.atendente,
    };

    if (existing) {
      const { data, error } = await db
        .from('preparacao')
        .update(payload)
        .eq('ticketId', req.ticketId)
        .select()
        .single();
      if (error) throw error;
      createdOrUpdated = data;
    } else {
      const { data, error } = await db
        .from('preparacao')
        .insert({ ...payload, ticketId: req.ticketId })
        .select()
        .single();
      if (error) throw error;
      createdOrUpdated = data;
    }

    await this.executeAction({
      action: TicketActionType.EM_PREPRACAO,
      sala: req.sala,
      ticketId: req.ticketId,
      unidade: req.unidade,
      user: req.atendente,
    });

    const { data: merged, error } = await db
      .from('preparacao')
      .select('*, tickets(*)')
      .eq('id', createdOrUpdated.id)
      .single();
    if (error) throw error;
    return merged;
  }

  // ----------------------------------------------------
  // CHECK SCHEDULING BY BIRTH YEAR (Identificação no Totem)
  // ----------------------------------------------------
  /**
   * Resultado de uma consulta de agendamento por ano de nascimento no totem.
   */
  // Tipo auxiliar para cada entrada de colisão
  private toSchedulingEntry(r: Record<string, unknown>) {
    return {
      nome: String(r['NOME'] || '').trim(),
      cpf: String(r['CPFFUNCIONARIO'] || '').trim(),
      dataNascimento: String(r['DATANASCIMENTO'] || '').trim(),
    };
  }

  async checkSchedulingByBirthYear(
    unidade: string,
    mesAnoNascimento: string,
  ): Promise<{
    found: boolean;
    multiple: boolean;
    results?: { nome: string; cpf: string; dataNascimento: string }[];
    nome?: string;
    cpf?: string;
    dataNascimento?: string;
  }> {
    try {
      const todayBR = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      }).format(new Date());

      const unidadeNorm = unidade.trim().toUpperCase();
      let inputVal = mesAnoNascimento.trim();
      let queryDataNascimento: any;

      if (inputVal.length === 8 && /^\d+$/.test(inputVal)) {
        queryDataNascimento = `${inputVal.slice(0, 2)}/${inputVal.slice(2, 4)}/${inputVal.slice(4)}`;
      } else if (inputVal.includes('/') && inputVal.length === 10) {
        queryDataNascimento = inputVal;
      } else {
        if (inputVal.length === 6 && /^\d+$/.test(inputVal)) {
          inputVal = `${inputVal.slice(0, 2)}/${inputVal.slice(2)}`;
        }
        queryDataNascimento = { $regex: `/${inputVal}$` };
      }

      // DATANASCIMENTO é armazenado como string "DD/MM/YYYY"
      console.log('[checkSchedulingByBirthYear] Diagnóstico local:', {
        unidadeOriginal: unidade,
        unidadeNorm,
        inputRaw: mesAnoNascimento,
        inputVal,
        queryDataNascimento,
        todayBR,
      });

      const docs = await this.mongoService.schedulingsCollection.find(
        {
          DATAAGENDAMENTO: todayBR,
          DATANASCIMENTO: queryDataNascimento,
          $or: [
            { UNIDADEATENDIMENTO: new RegExp(`^${unidadeNorm}$`, 'i') },
            { UNIDADEATENDIMENTO: '' },
            { UNIDADEATENDIMENTO: null },
          ],
        },
        {
          projection: { NOME: 1, CPFFUNCIONARIO: 1, DATANASCIMENTO: 1 },
        },
      ).toArray();

      console.log(`[checkSchedulingByBirthYear] Documentos encontrados: ${docs?.length || 0}`);

      if (!docs || docs.length === 0) {
        return { found: false, multiple: false };
      }

      // Mapear para entradas limpas e remover nomes duplicados (por CPF)
      const seen = new Set<string>();
      const entries: { nome: string; cpf: string; dataNascimento: string }[] = [];
      for (const doc of docs) {
        const entry = this.toSchedulingEntry(doc as Record<string, unknown>);
        if (!entry.nome) continue;
        const key = entry.cpf || entry.nome;
        if (!seen.has(key)) {
          seen.add(key);
          entries.push(entry);
        }
      }

      if (entries.length === 0) {
        return { found: false, multiple: false };
      }

      if (entries.length === 1) {
        return {
          found: true,
          multiple: false,
          nome: entries[0].nome,
          cpf: entries[0].cpf,
          dataNascimento: entries[0].dataNascimento,
        };
      }

      return { found: true, multiple: true, results: entries };
    } catch (err) {
      this.logger.error('[checkSchedulingByBirthYear] Erro na consulta:', err);
      return { found: false, multiple: false };
    }
  }

  /**
   * Converte um Ticket para PainelCall
   */
  public convertToPainelCall(
    ticket: Ticket,
    funcionarioNome?: string,
  ): PainelCall {
    return {
      id: Number(ticket.id),
      name: funcionarioNome || '',
      ticket: `${ticket.prefixo || ''}${ticket.numero}`,
      sala: ticket.sala || '',
      exame: ticket.exame || 'ATENDIMENTO',
      unidade: ticket.unidade,
    };
  }
}
