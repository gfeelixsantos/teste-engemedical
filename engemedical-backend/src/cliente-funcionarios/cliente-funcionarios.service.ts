import { Injectable } from '@nestjs/common';
import { MongoService } from 'src/mongo/mongo.service';
import { SocExportService } from 'src/soc/services/soc-export.service';
import { ClienteCompanyAccessService } from './cliente-company-access.service';
import { mapClienteFuncionario } from './cliente-funcionarios.mapper';
import { ClienteFuncionariosStatusService } from './cliente-funcionarios-status.service';
import {
  ClienteFuncionariosQuery,
  ClienteFuncionariosResponse,
  ClienteFuncionariosSchedulingReader,
  SchedulingSummary,
} from './cliente-funcionarios.types';

@Injectable()
export class MongoClienteFuncionariosSchedulingReader
  implements ClienteFuncionariosSchedulingReader
{
  constructor(private readonly mongoService: MongoService) {}

  private readonly projection = {
    _id: 1,
    ATENDIMENTOSTATUS: 1,
    DATAAGENDAMENTO: 1,
    DATAAGENDAMENTO_DATE: 1,
    TIPOEXAME: 1,
    TIPOEXAMENOME: 1,
    'EXAMES.dataExame': 1,
    'EXAMES.grupo': 1,
    'EXAMES.nomeExame': 1,
  } as const;

  async findLatestByEmployee(
    companyCode: string,
    employeeCode: string,
  ): Promise<SchedulingSummary | null> {
    const documents = await this.mongoService.schedulingsCollection
      .find<ClienteFuncionariosSchedulingDocument>(
        { CODIGOEMPRESA: companyCode, CODIGO: employeeCode },
        {
          projection: this.projection,
        },
      )
      .sort({ DATAAGENDAMENTO_DATE: -1, _id: -1 })
      .toArray();

    if (documents.length === 0) return null;

    const latest = documents[0];
    const examDates = documents.flatMap((document) =>
      (document.EXAMES ?? [])
        .map((exam) => exam.dataExame)
        .filter((value): value is string | Date => this.hasValue(value)),
    );
    const examTypeCode = this.toNullableText(latest.TIPOEXAME);
    const examTypeName = this.toNullableText(latest.TIPOEXAMENOME);

    return {
      id: String(latest._id),
      atendimentoStatus: this.toNullableText(latest.ATENDIMENTOSTATUS),
      schedulingDate: latest.DATAAGENDAMENTO ?? latest.DATAAGENDAMENTO_DATE ?? null,
      examDates,
      examType: examTypeName ?? examTypeCode,
      examTypeCode,
      examTypeName,
    };
  }

  private hasValue(value: unknown): value is string | Date {
    return (
      (typeof value === 'string' && value.trim().length > 0) || value instanceof Date
    );
  }

  private toNullableText(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text || null;
  }
}

type ClienteFuncionariosSchedulingDocument = {
  _id: unknown;
  ATENDIMENTOSTATUS?: unknown;
  DATAAGENDAMENTO?: string | null;
  DATAAGENDAMENTO_DATE?: Date | null;
  TIPOEXAME?: unknown;
  TIPOEXAMENOME?: unknown;
  EXAMES?: Array<{ dataExame?: string | Date | null }>;
};

@Injectable()
export class ClienteFuncionariosService {
  constructor(
    private readonly accessService: ClienteCompanyAccessService,
    private readonly socExportService: SocExportService,
    private readonly schedulingReader: MongoClienteFuncionariosSchedulingReader,
    private readonly statusService: ClienteFuncionariosStatusService,
  ) {}

  async list(
    query: ClienteFuncionariosQuery,
    registrationCode: string,
  ): Promise<ClienteFuncionariosResponse> {
    const companyCode = String(query.companyCode ?? '').trim();
    const page = this.toPage(query.page);
    const limit = this.toLimit(query.limit);
    const search = normalizeSearch(query.q);
    const requestedStatus = normalizeStatus(query.status);

    const company = await this.accessService.assertCanAccess(
      companyCode,
      registrationCode,
    );
    const employees = await this.socExportService.EdCadastroFuncionariosPorSituacao(
      companyCode,
      {
        ativo: 'Sim',
        inativo: 'Sim',
        afastado: 'Sim',
        pendente: 'Sim',
        ferias: 'Sim',
      },
    );

    const enriched = await Promise.all(
      employees.map(async (employee) => {
        const scheduling = await this.schedulingReader.findLatestByEmployee(
          companyCode,
          String(employee.CODIGO ?? '').trim(),
        );
        const resolved = this.statusService.resolve(employee, scheduling, new Date());
        return { employee, resolved, item: mapClienteFuncionario(employee, resolved) };
      }),
    );

    const filtered = enriched
      .filter(({ item }) => !search || this.matchesSearch(item, search))
      .filter(({ item }) => !requestedStatus || item.status === requestedStatus)
      .sort((left, right) => {
        const byName = normalizeSearch(left.item.nome).localeCompare(
          normalizeSearch(right.item.nome),
          'pt-BR',
        );
        return byName || normalizeSearch(left.item.codigo).localeCompare(
          normalizeSearch(right.item.codigo),
          'pt-BR',
        );
      });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit).map(({ item }) => item);

    return {
      empresa: {
        codigo: String(company.companyCode).trim(),
        nome: String(company.companyName ?? '').trim(),
      },
      items,
      page,
      limit,
      total,
      hasNextPage: start + items.length < total,
    };
  }

  private matchesSearch(
    item: { nome: string; codigo: string; matricula: string },
    search: string,
  ): boolean {
    return [item.nome, item.codigo, item.matricula].some((value) =>
      normalizeSearch(value).includes(search),
    );
  }

  private toPage(value: unknown): number {
    const page = Number(value ?? 1);
    return Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  }

  private toLimit(value: unknown): number {
    const limit = Number(value ?? 20);
    if (!Number.isFinite(limit)) return 20;
    return Math.min(100, Math.max(10, Math.floor(limit)));
  }
}

function normalizeSearch(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeStatus(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}
