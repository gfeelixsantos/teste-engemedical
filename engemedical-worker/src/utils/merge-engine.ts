import { ExamsScheduled } from 'src/mongo/types/scheduling';
import { ExamStatus } from 'src/mongo/enum/scheduling.enum';
import { Logger } from '@nestjs/common';

/**
 * Normaliza a string de data garantindo formato DD/MM/YYYY consistentes para chaves
 * Portado do cmso360-backend-estavel
 */
export function normalizeDataExame(dataExame?: string | Date | null): string {
  if (!dataExame || dataExame === '') return 'sem-data';

  if (typeof dataExame === 'string') {
    if (dataExame.includes('/')) return dataExame.substring(0, 10);
    if (dataExame.includes('T')) {
      const parts = dataExame.split('T')[0].split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  try {
    const data = new Date(dataExame);
    if (!isNaN(data.getTime())) {
      const dia = data.getDate().toString().padStart(2, '0');
      const mes = (data.getMonth() + 1).toString().padStart(2, '0');
      const ano = data.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }
  } catch (e) {}

  return 'sem-data';
}

function normalizeCodigoExame(codigo?: string | null): string {
  return String(codigo || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeSequencial(sequencial?: string | null): string {
  return String(sequencial || '').trim();
}

function isSemData(exame: ExamsScheduled): boolean {
  return normalizeDataExame(exame.dataExame as any) === 'sem-data';
}

function getFallbackByCodigo(params: {
  baseMap: Map<string, ExamsScheduled>;
  exSoc: ExamsScheduled;
}): { chave: string; exame: ExamsScheduled } | null {
  const { baseMap, exSoc } = params;
  const codigoSoc = normalizeCodigoExame(exSoc.codigoExame);
  const sequencialSoc = normalizeSequencial(exSoc.sequencialResultadoExame);

  if (!codigoSoc) return null;

  let melhor: { chave: string; exame: ExamsScheduled; score: number } | null =
    null;

  for (const [chave, exameBase] of baseMap.entries()) {
    if (normalizeCodigoExame(exameBase.codigoExame) !== codigoSoc) {
      continue;
    }

    const sequencialBase = normalizeSequencial(
      exameBase.sequencialResultadoExame,
    );

    let score = 0;

    if (sequencialSoc && sequencialBase && sequencialSoc === sequencialBase) {
      score += 6;
    } else if (
      sequencialSoc &&
      sequencialBase &&
      sequencialSoc !== sequencialBase
    ) {
      score -= 6;
    }

    if (exameBase.status !== ExamStatus.PENDENTE) {
      score += 3;
    }

    if (!isSemData(exameBase)) {
      score += 1;
    }

    if (!melhor || score > melhor.score) {
      melhor = { chave, exame: exameBase, score };
    }
  }

  if (!melhor || melhor.score < 0) return null;

  return {
    chave: melhor.chave,
    exame: melhor.exame,
  };
}

/**
 * Gera a chave composta primária do cruzamento: codigoExame + dataNormalizada
 */
export function gerarChaveComposta(exame: ExamsScheduled): string {
  const codigo = normalizeCodigoExame(exame.codigoExame);
  const dataStr = normalizeDataExame(exame.dataExame as any);
  return `${codigo}_${dataStr}`;
}

/**
 * Motor de Merge Inteligente 2.0
 * Portado de cmso360-backend-estavel/src/utils/merge-engine.ts
 *
 * Regras:
 * - Exame existe no SOC e existe no banco → PRESERVA o banco (grupo, url, formulário, status)
 * - Exame existe no SOC mas não no banco → ADICIONA como PENDENTE
 * - Exame saiu do SOC mas está FINALIZADO/AGUARDANDO no banco → PRESERVA
 * - Exame saiu do SOC e está PENDENTE no banco → REMOVE (cancelado pelo SOC)
 */
export function executeMergeInteligente(
  examesBanco: ExamsScheduled[] = [],
  examesNovosSoc: ExamsScheduled[] = [],
  examesHerdados: ExamsScheduled[] = [],
): {
  finais: ExamsScheduled[];
  resumo: { preservados: number; adicionados: number; removidos: number };
} {
  const logger = new Logger('MergeEngine');
  let preservados = 0;
  let adicionados = 0;
  let removidos = 0;

  // 1. Unificar Banco + Herança (Prioridade para Banco)
  const baseMap = new Map<string, ExamsScheduled>();

  examesHerdados.forEach((exH) => {
    baseMap.set(gerarChaveComposta(exH), exH);
  });

  examesBanco.forEach((exB) => {
    const obj = { ...exB };
    baseMap.set(gerarChaveComposta(obj), obj);
  });

  const arrayCandidatosFinais: ExamsScheduled[] = [];
  const chavesDoSoc = new Set<string>();

  // 2. Processar a fonte da verdade (SOC)
  examesNovosSoc.forEach((exSoc) => {
    const chave = gerarChaveComposta(exSoc);
    chavesDoSoc.add(chave);

    const matchBanco = baseMap.get(chave);

    if (matchBanco) {
      // REGRA: EXISTE NO SOC E EXISTE NA BASE → PRESERVAR A BASE
      // Preserva grupo, url, formulário, assinaturas, status, profissional, sala
      arrayCandidatosFinais.push({
        ...matchBanco,
        nomeExame: exSoc.nomeExame, // Pequena atualização caso o nome tenha mudado
        // Garante que grupo nunca fique vazio se o SOC tem mapeamento
        grupo: matchBanco.grupo || exSoc.grupo,
      });
      preservados++;
      baseMap.delete(chave);
    } else {
      // REGRA: EXISTE NO SOC MAS NÃO EXISTE NA BASE → NOVO
      if (isSemData(exSoc)) {
        const fallback = getFallbackByCodigo({ baseMap, exSoc });

        if (fallback) {
          arrayCandidatosFinais.push({
            ...fallback.exame,
            nomeExame: exSoc.nomeExame,
            grupo: fallback.exame.grupo || exSoc.grupo,
          });
          preservados++;
          baseMap.delete(fallback.chave);
          return;
        }
      }

      const novoExame: ExamsScheduled = {
        ...exSoc,
        status: ExamStatus.PENDENTE,
      };

      logger.log(
        `Adicionando NOVO exame PENDENTE (Faltante/Novo): ${exSoc.nomeExame} - Data: ${normalizeDataExame(exSoc.dataExame as any)}`,
      );
      arrayCandidatosFinais.push(novoExame);
      adicionados++;
    }
  });

  // 3. Limpeza Final (Avaliar Exames que desapareceram do SOC)
  baseMap.forEach((exBanco, chave) => {
    if (exBanco.status === ExamStatus.PENDENTE) {
      // REGRA: Cancela (Deleta fisicamente) pendentes que sumiram do SOC
      logger.warn(
        `🗑️ Exame Removido (Não consta mais no SOC): [${exBanco.nomeExame}] Chave: ${chave}`,
      );
      removidos++;
    } else {
      // REGRA: Preserva se já Finalizado/Aguardando
      logger.log(
        `🛡️ Exame Preservado (Não consta SOC porem iniciado): [${exBanco.nomeExame}] Status: ${exBanco.status}`,
      );
      arrayCandidatosFinais.push(exBanco);
      preservados++;
    }
  });

  return {
    finais: arrayCandidatosFinais.sort((a, b) =>
      a.nomeExame.localeCompare(b.nomeExame, 'pt-BR'),
    ),
    resumo: { preservados, adicionados, removidos },
  };
}
