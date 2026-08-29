import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';

const ROUTE_ACTION_MAP: Record<string, string> = {
  'POST /schedulings/update': 'RECEPCAO_ATUALIZAR',
  'POST /schedulings/exame/update': 'EXAME_ATUALIZAR',
  'POST /schedulings/exame/reissue': 'EXAME_REEMITIR',
  'POST /schedulings/finish': 'PARECER_MEDICO',
  'POST /schedulings/update/resultadoexame': 'ANEXAR_RESULTADO',
  'POST /schedulings/upload-anexo': 'UPLOAD_ANEXO',
  'POST /schedulings/delete-attachment': 'REMOVER_ANEXO',
  'DELETE /schedulings/remove-anexo': 'REMOVER_ANEXO',
  'DELETE /schedulings/delete': 'EXCLUIR_ATENDIMENTO',
  'GET /schedulings/prontuario/:id': 'VISUALIZAR_PRONTUARIO',
  'GET /schedulings/aso/:id': 'ASO_VISUALIZAR',
  'POST /user-settings': 'CONFIGURACAO_ALTERAR',
  'POST /psc/auth/start': 'PSC_AUTENTICAR',
};

type AuditRequest = {
  method: string;
  url: string;
  path?: string;
  baseUrl?: string;
  route?: { path?: string };
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
  user?: { codigo?: string; nome?: string; perfil?: string; unidade?: string };
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  auditLogContext?: {
    recursoId?: string;
    recursoTipo?: string;
    pacienteCodigo?: string;
    pacienteNome?: string;
    unidade?: string;
    requestId?: string;
    detalhes?: Record<string, unknown>;
  };
};

type AuditHttpContext = {
  recursoId?: string;
  recursoTipo?: string;
  pacienteCodigo?: string;
  pacienteNome?: string;
  unidade?: string;
  requestId: string;
};

function normalizePath(path: string): string {
  return path.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/:id',
  ).replace(
    /\/[0-9a-f]{24}/gi,
    '/:id',
  ).replace(
    /\/\d+/g,
    '/:id',
  );
}

function getFirstString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

function getHeaderValue(
  headers: AuditRequest['headers'],
  key: string,
): string | undefined {
  const raw = headers[key];
  if (Array.isArray(raw)) {
    return getFirstString(raw[0]);
  }

  return getFirstString(raw);
}

function tryParseJsonRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function getNestedString(source: unknown, path: string[]): string | undefined {
  let current = source;

  for (const segment of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return getFirstString(current);
}

function createRequestId(): string {
  return `cmso360_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getRequestPaths(req: AuditRequest): string[] {
  const routePath = getFirstString(req.route?.path);
  const baseUrl = getFirstString(req.baseUrl) ?? '';
  const routeWithBase = routePath
    ? `${baseUrl}${routePath.startsWith('/') ? routePath : `/${routePath}`}`
    : undefined;
  const urlPath = getFirstString(req.url?.split('?')[0]);
  const path = getFirstString(req.path);

  return [routeWithBase, path, urlPath, routePath]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.startsWith('/') ? value : `/${value}`)
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

function resolveAction(method: string, paths: string[]): string | undefined {
  for (const currentPath of paths) {
    const exactKey = `${method.toUpperCase()} ${currentPath.toLowerCase()}`;
    if (ROUTE_ACTION_MAP[exactKey] !== undefined) {
      return ROUTE_ACTION_MAP[exactKey];
    }

    const normalizedKey = `${method.toUpperCase()} ${normalizePath(currentPath.toLowerCase())}`;
    if (ROUTE_ACTION_MAP[normalizedKey] !== undefined) {
      return ROUTE_ACTION_MAP[normalizedKey];
    }
  }

  return undefined;
}

function inferResourceType(paths: string[]): string | undefined {
  const joined = paths.join(' ').toLowerCase();

  if (joined.includes('/prontuario/')) return 'prontuario';
  if (joined.includes('/aso/')) return 'aso';
  if (joined.includes('/exame/')) return 'exame';
  if (joined.includes('anexo') || joined.includes('attachment')) return 'anexo';
  if (joined.includes('/psc/')) return 'psc';
  if (joined.includes('/user-settings')) return 'configuracao';
  if (joined.includes('/schedulings/')) return 'atendimento';

  return undefined;
}

function buildAuditHttpContext(req: AuditRequest, paths: string[]): AuditHttpContext {
  const parsedScheduling = tryParseJsonRecord(req.body?.scheduling);
  const parsedFuncionario = tryParseJsonRecord(req.body?.funcionario);
  const bodySources = [req.body, parsedScheduling, parsedFuncionario]
    .filter((value): value is Record<string, unknown> => Boolean(value));
  const params = req.params ?? {};
  const query = req.query ?? {};

  const requestId =
    getHeaderValue(req.headers, 'x-request-id') ??
    getHeaderValue(req.headers, 'x-correlation-id') ??
    getHeaderValue(req.headers, 'x-trace-id') ??
    getNestedString(params, ['requestId']) ??
    getNestedString(query, ['requestId']) ??
    bodySources.map((source) => getNestedString(source, ['requestId'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['request_id'])).find(Boolean) ??
    createRequestId();

  const recursoId =
    getNestedString(params, ['id']) ??
    getNestedString(params, ['schedulingId']) ??
    getNestedString(query, ['id']) ??
    bodySources.map((source) => getNestedString(source, ['recursoId'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['recurso_id'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['schedulingId'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['funcionarioId'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['atendimentoId'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['codigoExame'])).find(Boolean);

  const pacienteCodigo =
    bodySources.map((source) => getNestedString(source, ['pacienteCodigo'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['paciente_codigo'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['CODIGO'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['codigo'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['prontuario'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['funcionario', 'id'])).find(Boolean);

  const pacienteNome =
    bodySources.map((source) => getNestedString(source, ['pacienteNome'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['paciente_nome'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['NOME'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['nome'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['funcionario', 'nome'])).find(Boolean);

  const unidade =
    bodySources.map((source) => getNestedString(source, ['unidade'])).find(Boolean) ??
    bodySources.map((source) => getNestedString(source, ['UNIDADE'])).find(Boolean) ??
    getHeaderValue(req.headers, 'x-unidade') ??
    getFirstString(req.user?.unidade);

  return {
    recursoId: getFirstString(req.auditLogContext?.recursoId) ?? recursoId,
    recursoTipo:
      getFirstString(req.auditLogContext?.recursoTipo) ??
      bodySources.map((source) => getNestedString(source, ['recursoTipo'])).find(Boolean) ??
      bodySources.map((source) => getNestedString(source, ['recurso_tipo'])).find(Boolean) ??
      inferResourceType(paths),
    pacienteCodigo:
      getFirstString(req.auditLogContext?.pacienteCodigo) ?? pacienteCodigo,
    pacienteNome:
      getFirstString(req.auditLogContext?.pacienteNome) ?? pacienteNome,
    unidade: getFirstString(req.auditLogContext?.unidade) ?? unidade,
    requestId: getFirstString(req.auditLogContext?.requestId) ?? requestId,
  };
}

function sanitizeErrorCode(error: unknown): string | undefined {
  if (error instanceof HttpException) {
    return 'HTTP_EXCEPTION';
  }

  const candidate =
    getFirstString((error as { code?: unknown } | undefined)?.code) ??
    getFirstString((error as { name?: unknown } | undefined)?.name);

  if (!candidate) {
    return undefined;
  }

  return candidate
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || undefined;
}

function getStatusCode(error: unknown, fallback?: number): number | undefined {
  if (error instanceof HttpException) {
    return error.getStatus();
  }

  const rawStatus =
    (error as { status?: unknown } | undefined)?.status ??
    (error as { statusCode?: unknown } | undefined)?.statusCode;
  const parsed = Number(rawStatus);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<AuditRequest>();
    const res = http.getResponse<{ statusCode?: number }>();

    const method = req.method ?? '';
    const paths = getRequestPaths(req);
    const acao = resolveAction(method, paths);

    if (!acao) {
      return next.handle();
    }

    const ip =
      getHeaderValue(req.headers, 'x-forwarded-for')?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress ??
      null;
    const userAgent = getHeaderValue(req.headers, 'user-agent') ?? null;
    const auditContext = buildAuditHttpContext(req, paths);

    const safeLog = (details: Record<string, unknown>) => {
      try {
        const ctx = req.auditLogContext ?? {};
        this.auditLogService.logUserAction({
          user: {
            codigo: req.user?.codigo,
            nome: req.user?.nome,
            perfil: req.user?.perfil,
          },
          acao,
          recursoId: getFirstString(ctx.recursoId) ?? auditContext.recursoId,
          recursoTipo:
            getFirstString(ctx.recursoTipo) ?? auditContext.recursoTipo,
          pacienteCodigo:
            getFirstString(ctx.pacienteCodigo) ?? auditContext.pacienteCodigo,
          pacienteNome:
            getFirstString(ctx.pacienteNome) ?? auditContext.pacienteNome,
          unidade: getFirstString(ctx.unidade) ?? auditContext.unidade,
          requestId: getFirstString(ctx.requestId) ?? auditContext.requestId,
          ip: ip ?? undefined,
          userAgent: userAgent ?? undefined,
          detalhes: details,
        });
      } catch {
        // Auditoria não pode alterar a resposta original.
      }
    };

    return next.handle().pipe(
      tap({
        next: () => {
          const details: Record<string, unknown> = {
            ...(req.auditLogContext?.detalhes ?? {}),
            resultado: 'SUCESSO',
          };

          if (acao === 'PARECER_MEDICO') {
            details.opinionType =
              (req.body as { options?: { opinionType?: unknown } } | undefined)
                ?.options?.opinionType ?? null;
          }

          safeLog(details);
        },
        error: (error) => {
          safeLog({
            ...(req.auditLogContext?.detalhes ?? {}),
            resultado: 'ERRO',
            statusCode: getStatusCode(error, res?.statusCode),
            codigoErroSanitizado: sanitizeErrorCode(error),
          });
        },
      }),
    );
  }
}
