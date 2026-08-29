import { ExamToogle, EXAMES_LIST as HARDCODED } from 'src/soc/exames';
import { TEMPLATE_MAP } from './exames.constant';

export type { ExamToogle };

let examesGrouped: Record<string, ExamToogle[]> | null = null;

export function setExamesData(data: Record<string, ExamToogle[]>): void {
  examesGrouped = data;
}

export function invalidateCache(): void {
  examesGrouped = null;
}

export function getExamesList(): Record<string, ExamToogle[]> {
  if (!examesGrouped) {
    return HARDCODED;
  }
  
  // Realiza um merge seguro: para cada grupo do catálogo local (HARDCODED),
  // se o catálogo remoto (examesGrouped) também tiver o grupo, mescla os exames
  // sem deletar os códigos que já estavam mapeados localmente.
  const merged = { ...HARDCODED };
  
  for (const [grupo, examesRemotos] of Object.entries(examesGrouped)) {
    if (merged[grupo]) {
      // Mescla os exames preservando os locais e adicionando os remotos novos
      const examesLocais = merged[grupo];
      const examesMesclados = [...examesLocais];
      
      for (const exRemoto of examesRemotos) {
        // Se já existe um exame local com códigos sobrepostos, atualiza ou ignora
        const existeLocal = examesLocais.some(exLoc => 
          exLoc.codigos.some(c => exRemoto.codigos.includes(c))
        );
        if (!existeLocal) {
          examesMesclados.push(exRemoto);
        }
      }
      merged[grupo] = examesMesclados;
    } else {
      merged[grupo] = examesRemotos;
    }
  }
  
  return merged;
}

export function getExameByCodigo(codigo: string): ExamToogle | null {
  const list = getExamesList();
  for (const exames of Object.values(list)) {
    const found = exames.find((e) => e.codigos.includes(codigo));
    if (found) return found;
  }
  return null;
}

export function getTemplate(key: string | null | undefined): ExamToogle['template'] {
  if (!key) return undefined;
  return TEMPLATE_MAP[key] as ExamToogle['template'];
}
