import { ExamsScheduled } from 'src/mongo/types/scheduling';
import { ExamStatus } from 'src/mongo/enum/scheduling.enum';
import { Logger } from '@nestjs/common';

function normalizeCodigoExame(codigo?: string | null): string {
  return String(codigo || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export type MergeResult = {
  finais: ExamsScheduled[];
  resumo: { preservados: number; adicionados: number; removidos: number };
};

export function executeMergeInteligente(
  examesBanco: ExamsScheduled[] = [],
  examesNovosSoc: ExamsScheduled[] = [],
  examesHerdados: ExamsScheduled[] = [],
): MergeResult {
  const logger = new Logger('MergeEngine');
  let preservados = 0;
  let adicionados = 0;
  let removidos = 0;

  // 1. Monta baseMap por codigoExame (herdados + banco)
  const baseMap = new Map<string, ExamsScheduled>();

  examesHerdados.forEach((exH) => {
    const chave = normalizeCodigoExame(exH.codigoExame);
    if (chave && !baseMap.has(chave)) {
      baseMap.set(chave, exH);
    }
  });

  examesBanco.forEach((exB) => {
    const chave = normalizeCodigoExame(exB.codigoExame);
    if (chave) {
      baseMap.set(chave, { ...exB });
    }
  });

  const finais: ExamsScheduled[] = [];

  // 2. Processa cada exame do SOC (fonte da verdade)
  for (const exSoc of examesNovosSoc) {
    const chave = normalizeCodigoExame(exSoc.codigoExame);
    if (!chave) continue;

    const dbExam = baseMap.get(chave);

    if (dbExam) {
      // REGRA: EXISTE NO SOC E EXISTE NO DB → PRESERVAR DB
      finais.push({
        ...dbExam,
        grupo: dbExam.grupo || exSoc.grupo || '',
        nomeExame: exSoc.nomeExame,
      });
      preservados++;
      baseMap.delete(chave);
    } else {
      // REGRA: EXISTE NO SOC MAS N\u00C3O EXISTE NO DB \u2192 NOVO PENDENTE
      const novoExame: ExamsScheduled = {
        ...exSoc,
        status: ExamStatus.PENDENTE,
      };

      logger.log(
        `Adicionando NOVO exame PENDENTE (Faltante/Novo): ${exSoc.nomeExame}`,
      );
      finais.push(novoExame);
      adicionados++;
    }
  }

  // 3. Examina o que sobrou no baseMap (exames que sumiram do SOC)
  for (const [, exBanco] of baseMap) {
    if (exBanco.status === ExamStatus.PENDENTE) {
      logger.warn(
        `Exame Removido (Não consta mais no SOC): [${exBanco.nomeExame}]`,
      );
      removidos++;
    } else {
      logger.log(
        `Exame Preservado (Não consta SOC porem iniciado): [${exBanco.nomeExame}] Status: ${exBanco.status}`,
      );
      finais.push(exBanco);
      preservados++;
    }
  }

  return {
    finais: finais.sort((a, b) =>
      a.nomeExame.localeCompare(b.nomeExame, 'pt-BR'),
    ),
    resumo: { preservados, adicionados, removidos },
  };
}
