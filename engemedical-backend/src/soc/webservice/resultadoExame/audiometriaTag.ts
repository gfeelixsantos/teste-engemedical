import { AudiometriaData } from '../../types/exames.types';

function normalizeValor(
  v: string | number | null | undefined,
): string | number {
  if (v === '' || v === '-' || v === '--' || v === '---' || v == null) {
    return '--';
  }

  return Number(v);
}

function normalizeValorViaOssea(
  v: string | number | null | undefined,
): string | number {
  if (v === '' || v === '-' || v === '--' || v === '---' || v == null) {
    return '';
  }

  return Number(v);
}

function normalizeValorOpcional(
  v: string | number | null | undefined,
): string | number {
  if (v === '' || v === '-' || v === '--' || v === '---' || v == null) {
    return '';
  }

  return Number(v);
}

function normalizeMascaramento(v: string | boolean | null | undefined): string {
  if (v === '' || v == null) return '';
  return String(v);
}

function normalizeSocText(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/frequ\?ncias/gi, 'frequencias')
    .replace(/frequ\?ncia/gi, 'frequencia')
    .replace(/frequ[^\s,.;:!?]*ncias/gi, 'frequencias')
    .replace(/frequ[^\s,.;:!?]*ncia/gi, 'frequencia');
}

function maskValue(
  preferred: string | boolean | null | undefined,
  legacy?: string | boolean | null,
): string {
  if (preferred !== undefined && preferred !== null && preferred !== '') {
    return normalizeMascaramento(preferred);
  }

  return normalizeMascaramento(legacy);
}

export function audiometriaTag(formularioExame: AudiometriaData) {
  return ` 
        <audiomatria> 
            <codigoAparelhoAudiometrico></codigoAparelhoAudiometrico> 
            <comentariosOD>${normalizeSocText(formularioExame.resultadoOD)}</comentariosOD> 
            <comentariosOE>${normalizeSocText(formularioExame.resultadoOE)}</comentariosOE> 
            <dataCalibracao>${formularioExame.dataCalibracao || ''}</dataCalibracao> 
            <irfOD>${normalizeValorOpcional(formularioExame.irfDBOD)}</irfOD> 
            <irfOE>${normalizeValorOpcional(formularioExame.irfDBOE)}</irfOE> 
            <lafOD></lafOD> 
            <lafOE></lafOE> 
            <meatoscopiaOD>${formularioExame.meatoscopiaOD || ''}</meatoscopiaOD> 
            <meatoscopiaOE>${formularioExame.meatoscopiaOE || ''}</meatoscopiaOE> 
            <repousoAuditivo>${formularioExame.repousoAuditivo || ''}</repousoAuditivo>
            <srtOD>${normalizeValorOpcional(formularioExame.srtOD)}</srtOD> 
            <srtOE>${normalizeValorOpcional(formularioExame.srtOE)}</srtOE> 
            <tipoMascaramento></tipoMascaramento> 


            <viaAereaOD1000>${normalizeValor(formularioExame.viaAereaOD1000)}</viaAereaOD1000> 
            <viaAereaOD1000Mascaramento>${maskValue(formularioExame.mascaramentoVAOD1000, formularioExame.mascaramentoOD1000)}</viaAereaOD1000Mascaramento> 

            <viaAereaOD2000>${normalizeValor(formularioExame.viaAereaOD2000)}</viaAereaOD2000> 
            <viaAereaOD2000Mascaramento>${maskValue(formularioExame.mascaramentoVAOD2000, formularioExame.mascaramentoOD2000)}</viaAereaOD2000Mascaramento> 

            <viaAereaOD250>${normalizeValor(formularioExame.viaAereaOD250)}</viaAereaOD250> 
            <viaAereaOD250Mascaramento>${maskValue(formularioExame.mascaramentoVAOD250, formularioExame.mascaramentoOD250)}</viaAereaOD250Mascaramento> 

            <viaAereaOD3000>${normalizeValor(formularioExame.viaAereaOD3000)}</viaAereaOD3000> 
            <viaAereaOD3000Mascaramento>${maskValue(formularioExame.mascaramentoVAOD3000, formularioExame.mascaramentoOD3000)}</viaAereaOD3000Mascaramento> 

            <viaAereaOD4000>${normalizeValor(formularioExame.viaAereaOD4000)}</viaAereaOD4000> 
            <viaAereaOD4000Mascaramento>${maskValue(formularioExame.mascaramentoVAOD4000, formularioExame.mascaramentoOD4000)}</viaAereaOD4000Mascaramento> 

            <viaAereaOD500>${normalizeValor(formularioExame.viaAereaOD500)}</viaAereaOD500> 
            <viaAereaOD500Mascaramento>${maskValue(formularioExame.mascaramentoVAOD500, formularioExame.mascaramentoOD500)}</viaAereaOD500Mascaramento> 

            <viaAereaOD6000>${normalizeValor(formularioExame.viaAereaOD6000)}</viaAereaOD6000> 
            <viaAereaOD6000Mascaramento>${maskValue(formularioExame.mascaramentoVAOD6000, formularioExame.mascaramentoOD6000)}</viaAereaOD6000Mascaramento> 

            <viaAereaOD8000>${normalizeValor(formularioExame.viaAereaOD8000)}</viaAereaOD8000> 
            <viaAereaOD8000Mascaramento>${maskValue(formularioExame.mascaramentoVAOD8000, formularioExame.mascaramentoOD8000)}</viaAereaOD8000Mascaramento> 



            <viaAereaOE1000>${normalizeValor(formularioExame.viaAereaOE1000)}</viaAereaOE1000> 
            <viaAereaOE1000Mascaramento>${maskValue(formularioExame.mascaramentoVAOE1000, formularioExame.mascaramentoOE1000)}</viaAereaOE1000Mascaramento> 

            <viaAereaOE2000>${normalizeValor(formularioExame.viaAereaOE2000)}</viaAereaOE2000> 
            <viaAereaOE2000Mascaramento>${maskValue(formularioExame.mascaramentoVAOE2000, formularioExame.mascaramentoOE2000)}</viaAereaOE2000Mascaramento> 

            <viaAereaOE250>${normalizeValor(formularioExame.viaAereaOE250)}</viaAereaOE250> 
            <viaAereaOE250Mascaramento>${maskValue(formularioExame.mascaramentoVAOE250, formularioExame.mascaramentoOE250)}</viaAereaOE250Mascaramento> 

            <viaAereaOE3000>${normalizeValor(formularioExame.viaAereaOE3000)}</viaAereaOE3000> 
            <viaAereaOE3000Mascaramento>${maskValue(formularioExame.mascaramentoVAOE3000, formularioExame.mascaramentoOE3000)}</viaAereaOE3000Mascaramento> 

            <viaAereaOE4000>${normalizeValor(formularioExame.viaAereaOE4000)}</viaAereaOE4000> 
            <viaAereaOE4000Mascaramento>${maskValue(formularioExame.mascaramentoVAOE4000, formularioExame.mascaramentoOE4000)}</viaAereaOE4000Mascaramento> 

            <viaAereaOE500>${normalizeValor(formularioExame.viaAereaOE500)}</viaAereaOE500> 
            <viaAereaOE500Mascaramento>${maskValue(formularioExame.mascaramentoVAOE500, formularioExame.mascaramentoOE500)}</viaAereaOE500Mascaramento> 

            <viaAereaOE6000>${normalizeValor(formularioExame.viaAereaOE6000)}</viaAereaOE6000> 
            <viaAereaOE6000Mascaramento>${maskValue(formularioExame.mascaramentoVAOE6000, formularioExame.mascaramentoOE6000)}</viaAereaOE6000Mascaramento> 

            <viaAereaOE8000>${normalizeValor(formularioExame.viaAereaOE8000)}</viaAereaOE8000>
            <viaAereaOE8000Mascaramento>${maskValue(formularioExame.mascaramentoVAOE8000, formularioExame.mascaramentoOE8000)}</viaAereaOE8000Mascaramento> 





            <viaOssesOD1000>${normalizeValorViaOssea(formularioExame.viaOsseaOD1000)}</viaOssesOD1000> 
            <viaOssesOD1000Mascaramento>${maskValue(formularioExame.mascaramentoVOOD1000, formularioExame.mascaramentoOD1000)}</viaOssesOD1000Mascaramento> 

            <viaOssesOD2000>${normalizeValorViaOssea(formularioExame.viaOsseaOD2000)}</viaOssesOD2000> 
            <viaOssesOD2000Mascaramento>${maskValue(formularioExame.mascaramentoVOOD2000, formularioExame.mascaramentoOD2000)}</viaOssesOD2000Mascaramento> 

            <viaOssesOD3000>${normalizeValorViaOssea(formularioExame.viaOsseaOD3000)}</viaOssesOD3000> 
            <viaOssesOD3000Mascaramento>${maskValue(formularioExame.mascaramentoVOOD3000, formularioExame.mascaramentoOD3000)}</viaOssesOD3000Mascaramento> 

            <viaOssesOD4000>${normalizeValorViaOssea(formularioExame.viaOsseaOD4000)}</viaOssesOD4000> 
            <viaOssesOD4000Mascaramento>${maskValue(formularioExame.mascaramentoVOOD4000, formularioExame.mascaramentoOD4000)}</viaOssesOD4000Mascaramento> 

            <viaOssesOD500>${normalizeValorViaOssea(formularioExame.viaOsseaOD500)}</viaOssesOD500> 
            <viaOssesOD500Mascaramento>${maskValue(formularioExame.mascaramentoVOOD500, formularioExame.mascaramentoOD500)}</viaOssesOD500Mascaramento> 

            <viaOssesOE1000>${normalizeValorViaOssea(formularioExame.viaOsseaOE1000)}</viaOssesOE1000> 
            <viaOssesOE1000Mascaramento>${maskValue(formularioExame.mascaramentoVOOE1000, formularioExame.mascaramentoOE1000)}</viaOssesOE1000Mascaramento> 

            <viaOssesOE2000>${normalizeValorViaOssea(formularioExame.viaOsseaOE2000)}</viaOssesOE2000> 
            <viaOssesOE2000Mascaramento>${maskValue(formularioExame.mascaramentoVOOE2000, formularioExame.mascaramentoOE2000)}</viaOssesOE2000Mascaramento> 

            <viaOssesOE3000>${normalizeValorViaOssea(formularioExame.viaOsseaOE3000)}</viaOssesOE3000> 
            <viaOssesOE3000Mascaramento>${maskValue(formularioExame.mascaramentoVOOE3000, formularioExame.mascaramentoOE3000)}</viaOssesOE3000Mascaramento> 

            <viaOssesOE4000>${normalizeValorViaOssea(formularioExame.viaOsseaOE4000)}</viaOssesOE4000> 
            <viaOssesOE4000Mascaramento>${maskValue(formularioExame.mascaramentoVOOE4000, formularioExame.mascaramentoOE4000)}</viaOssesOE4000Mascaramento> 

            <viaOssesOE500>${normalizeValorViaOssea(formularioExame.viaOsseaOE500)}</viaOssesOE500> 
            <viaOssesOE500Mascaramento>${maskValue(formularioExame.mascaramentoVOOE500, formularioExame.mascaramentoOE500)}</viaOssesOE500Mascaramento> 
        </audiomatria>
        `;
}
