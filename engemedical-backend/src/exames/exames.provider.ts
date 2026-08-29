import { ExamToogle } from './exames.service';
import { EXAMES_LIST as HARDCODED } from 'src/soc/exames';
import { TEMPLATE_MAP } from './exames.constant';

export type { ExamToogle };

let examesGrouped: Record<string, ExamToogle[]> | null = null;
let supabaseFallbackClient: any = null;

export function setExamesData(data: Record<string, ExamToogle[]>): void {
  examesGrouped = data;
}

export function setSupabaseClient(client: any): void {
  supabaseFallbackClient = client;
}

export function invalidateCache(): void {
  examesGrouped = null;
}

export function getExamesList(): Record<string, ExamToogle[]> {
  return examesGrouped ?? HARDCODED;
}

export function getExameByCodigo(codigo: string): ExamToogle | null {
  const list = getExamesList();
  for (const exames of Object.values(list)) {
    const found = exames.find((e) => e.codigos.includes(codigo));
    if (found) return found;
  }
  return null;
}

export async function lookupGrupoByCodigoFromSupabase(codigo: string): Promise<{ grupo: string; exame: ExamToogle } | null> {
  if (!supabaseFallbackClient) return null;

  try {
    const { data, error } = await supabaseFallbackClient
      .from('exames')
      .select('grupo, codigos, nome')
      .eq('ativo', true);

    if (error || !data) return null;

    const codigoNormalizado = codigo.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const ex of data) {
      const codes = Array.isArray(ex.codigos) ? ex.codigos : [];
      const match = codes.some((c: string) => c.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === codigoNormalizado);
      if (match) {
        return {
          grupo: ex.grupo,
          exame: {
            codigos: codes,
            nome: ex.nome,
            statusFinalizacao: 'AGUARDANDO_RESULTADO' as any,
            enviarParaAzure: false,
            requerAssinaturaDigital: false,
          },
        };
      }
    }
  } catch {
    // silent fail
  }
  return null;
}

export function getTemplate(key: string | null | undefined): ExamToogle['template'] {
  if (!key) return undefined;
  return TEMPLATE_MAP[key] as ExamToogle['template'];
}

export function getTemplates(): Record<string, Function> {
  return TEMPLATE_MAP;
}
