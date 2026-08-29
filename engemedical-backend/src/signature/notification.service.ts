import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { AzureService } from 'src/azure/azure.service';
import { MongoService } from 'src/mongo/mongo.service';
import { SocService } from 'src/soc/soc.service';
import { TemplateNames, EmailType } from 'src/azure/types/azure.types';
import {
  SchedulingDocument,
  PendingDocument,
} from 'src/mongo/types/scheduling';
import { formatDocumentFileName } from 'src/utils/util';
import { ObjectId } from 'mongodb';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly EMAIL_LINK_SAS_EXPIRATION_MINUTES = 5 * 24 * 60;
  private readonly BRAZIL_TIMEZONE = 'America/Sao_Paulo';

  constructor(
    @Inject(forwardRef(() => AzureService))
    private readonly azureService: AzureService,
    @Inject(forwardRef(() => MongoService))
    private readonly mongoService: MongoService,
    @Inject(forwardRef(() => SocService))
    private readonly socService: SocService,
  ) {}

  /**
   * Processa a notificacao de um ASO assinado.
   * Aplica regras de filtragem (Parecer APTO) e busca contatos.
   */
  async handleAsoSigned(
    doc: PendingDocument,
    _pdfBuffer: Buffer,
  ): Promise<void> {
    const schedulingIdFilter =
      doc.schedulingId && String(doc.schedulingId).length === 24
        ? new ObjectId(doc.schedulingId)
        : (doc.schedulingId as any);

    const scheduling = (await this.mongoService.schedulingsCollection.findOne({
      _id: schedulingIdFilter,
    })) as any as SchedulingDocument;

    if (!scheduling) {
      this.logger.error(
        `[NOTIFY_ASO] Agendamento ${doc.schedulingId} nao encontrado.`,
      );
      return;
    }

    // Regra: Somente envia se parecer for APTO
    const parecer = (scheduling.PARECERMEDICO || '').trim().toUpperCase();
    if (parecer !== 'APTO') {
      this.logger.log(
        `[NOTIFY_ASO] Pulando e-mail para ${scheduling.NOME} (Parecer: ${parecer}).`,
      );
      return;
    }

    // Regra: Inaptidao altura/confinado suprime ASO_RELEASE (PARECER_MEDICO ja enviado em finishScheduling)
    const alturaParecer = String((scheduling as any).ALTURA_PARECER || '');
    const confinadoParecer = String((scheduling as any).CONFINADO_PARECER || '');
    if (alturaParecer === 'INAPTO PARA TRABALHO EM ALTURA' || confinadoParecer === 'INAPTO PARA ESPAÇO CONFINADO') {
      this.logger.log(
        `[NOTIFY_ASO] ASO liberado com parecer APTO e inaptidao altura/confinado — email suprimido para ${scheduling.NOME}.`,
      );
      return;
    }

    // Regra: Idempotencia (nao enviar duplicado)
    if (scheduling.ASOINFO?.emailSent) {
      this.logger.warn(
        `[NOTIFY_ASO] E-mail ja enviado anteriormente para ${scheduling.NOME}.`,
      );
      return;
    }

    // Buscar contatos da empresa
    const codEmpresa = scheduling.CODIGOEMPRESA || '';
    const emails = await this.socService.getCompanyContacts(codEmpresa);

    const documentName = formatDocumentFileName({
      prefix: 'ASO',
      nome: scheduling.NOME,
      empresa: scheduling.NOMEEMPRESA,
      tipo: scheduling.TIPOEXAMENOME || 'ASO',
      data: scheduling.DATAAGENDAMENTO,
    });

    const asoRawUrl = String(scheduling.ASOINFO?.url || doc.url || '').trim();
    if (!asoRawUrl) {
      throw new Error(
        `[NOTIFY_ASO] URL do ASO ausente para schedulingId=${doc.schedulingId}. E-mail nao enviado para evitar exposicao insegura.`,
      );
    }
    let asoFileUrl: string;
    try {
      asoFileUrl = this.azureService.generateSasUrlFromUrl(
        asoRawUrl,
        this.EMAIL_LINK_SAS_EXPIRATION_MINUTES,
      );
    } catch (error) {
      throw new Error(
        `[NOTIFY_ASO] Falha ao gerar SAS URL somente leitura (5 dias) para schedulingId=${doc.schedulingId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const hasCompanyContacts = !!(emails && emails.length > 0);
    const forcedReleaseRecipient = String(
      process.env.ASO_RELEASE_FORCE_TO || '',
    ).trim();
    const asoFallbackTo = String(process.env.ASO_RELEASE_EMAIL_FALLBACK_TO || 'liberacao@cmsocupacional.com.br,tecnologia@cmsocupacional.com.br,esocial@cmsocupacional.com.br,apoio.esocial@cmsocupacional.com.br').trim();
    const targetTo = hasCompanyContacts
      ? emails.join(',')
      : asoFallbackTo;

    const finalTargetTo = forcedReleaseRecipient || targetTo;
    const template = forcedReleaseRecipient
      ? TemplateNames.ASO_RELEASE
      : hasCompanyContacts
        ? TemplateNames.ASO_RELEASE
        : TemplateNames.ASO_NO_CONTACTS;

    const formatDuration = (dataExame?: string | Date | null): string => {
      if (!dataExame) return '-';
      const ticketTime = scheduling.TICKET?.updatedAt || scheduling.TICKET?.emissao;
      if (!ticketTime) return '-';

      const start = new Date(ticketTime);
      const end = new Date(dataExame);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return '-';
      }

      const diffMinutes = Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60),
      );
      if (diffMinutes <= 0) return '-';
      return `${diffMinutes} min`;
    };

    const email: EmailType = {
      to: finalTargetTo,
      bcc: String(process.env.ASO_RELEASE_EMAIL_BCC || 'tecnologia@cmsocupacional.com.br,draandrea@cmsocupacional.com.br,ricardo@cmsocupacional.com.br').trim(),
      subject: `CMSO - Atestado de Saude Ocupacional (ASO) - ${scheduling.NOME} - ${scheduling.NOMEEMPRESA}`,
      templatename: template,
      attachment: [],
      data: {
        asoInfo: {
          nomeFuncionario: scheduling.NOME,
          nomeEmpresa: scheduling.NOMEEMPRESA,
          tipoExame: scheduling.TIPOEXAMENOME,
          data: scheduling.DATAAGENDAMENTO,
          chegada: this.buildArrivalLabel(scheduling),
          cpf: scheduling.CPFFUNCIONARIO,
          parecer: scheduling.PARECERMEDICO || undefined,
          asoFileName: documentName,
          asoFileUrl,
          anotacoes: scheduling.ANOTACOES || undefined,
          observacoesParecer: scheduling.ASOINFO?.observacoesParecer || [],
          examesRealizados: (scheduling.EXAMES || []).map((ex) => ({
            nomeExame: ex.nomeExame,
            status: ex.status,
            dataExame: ex.dataExame ?? undefined,
            sala: ex.sala,
            profissional: ex.profissional,
            duracao: formatDuration(ex.dataExame),
            url: ex.url,
          })),
        },
      },
    };

    await this.azureService.filaEnvioDeEmail(email);

    // Marcar como enviado
    await this.mongoService.schedulingsCollection.updateOne(
      { _id: schedulingIdFilter },
      { $set: { 'ASOINFO.emailSent': true } },
    );

    this.logger.log(`[NOTIFY_ASO] E-mail enfileirado para ${finalTargetTo}`);
  }

  private buildArrivalLabel(
    scheduling: SchedulingDocument,
  ): string | undefined {
    const emittedAt = scheduling.TICKET?.emissao;
    const unidade = String(
      scheduling.TICKET?.unidade ||
        scheduling.UNIDADEATENDIMENTO ||
        scheduling.NOMEUNIDADE ||
        '',
    ).trim();

    let emittedAtLabel = '';
    if (emittedAt) {
      const date = emittedAt instanceof Date ? emittedAt : new Date(emittedAt);
      if (!Number.isNaN(date.getTime())) {
        emittedAtLabel = new Intl.DateTimeFormat('pt-BR', {
          timeZone: this.BRAZIL_TIMEZONE,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date);
      }
    }

    if (emittedAtLabel && unidade) {
      return `${emittedAtLabel} - ${unidade}`;
    }

    return emittedAtLabel || unidade || undefined;
  }
}
