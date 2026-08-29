import { SchedulingDocument } from 'src/mongo/types/scheduling';
import { audiometriaTag } from './audiometriaTag';

const WSSecurity = require('wssecurity-soap');

const AUDIOMETRIA_FREQUENCIAS = [
  250, 500, 1000, 2000, 3000, 4000, 6000, 8000,
] as const;

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function parseAudiometriaValor(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  const raw = String(value).trim();
  if (
    raw === '' ||
    raw === '-' ||
    raw === '--' ||
    raw === '---' ||
    raw === 'SR'
  ) {
    return null;
  }

  const parsed = Number(raw.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function includesAlteracao(value: unknown): boolean {
  const raw = normalizeText(value);
  return raw.includes('alterad') || raw.includes('perda auditiva');
}

function isResultadoAlteradoAudiometria(formulario: any): boolean {
  if (!formulario) {
    return false;
  }

  if (
    includesAlteracao(formulario.classificacaoOD) ||
    includesAlteracao(formulario.classificacaoOE) ||
    includesAlteracao(formulario.resultadoOD) ||
    includesAlteracao(formulario.resultadoOE) ||
    includesAlteracao(formulario.conclusao)
  ) {
    return true;
  }

  return AUDIOMETRIA_FREQUENCIAS.some((freq) => {
    const od = parseAudiometriaValor(formulario[`viaAereaOD${freq}`]);
    const oe = parseAudiometriaValor(formulario[`viaAereaOE${freq}`]);
    return (od !== null && od > 25) || (oe !== null && oe > 25);
  });
}

function isResultadoAlteradoOcupacionalAudiometria(formulario: any): boolean {
  if (!formulario) {
    return false;
  }

  const classificacaoNR7OD = normalizeText(formulario.classificacaoNR7OD);
  const classificacaoNR7OE = normalizeText(formulario.classificacaoNR7OE);

  if (
    classificacaoNR7OD.includes('altera') ||
    classificacaoNR7OE.includes('altera')
  ) {
    return true;
  }

  return [3000, 4000, 6000].some((freq) => {
    const od = parseAudiometriaValor(formulario[`viaAereaOD${freq}`]);
    const oe = parseAudiometriaValor(formulario[`viaAereaOE${freq}`]);
    return (od !== null && od > 25) || (oe !== null && oe > 25);
  });
}

function isResultadoAlteradoEmAnaliseAudiometria(formulario: any): boolean {
  if (!formulario) {
    return false;
  }

  const classificacoes = [
    normalizeText(formulario.classificacaoNR7OD),
    normalizeText(formulario.classificacaoNR7OE),
  ];

  return classificacoes.some(
    (value) =>
      value.includes('compar') ||
      value.includes('refer') ||
      value.includes('anal'),
  );
}

function formatSoapBoolean(value: boolean): string {
  return value ? 'true' : 'false';
}

function formatDinamometriaResultado(formulario: any): string {
  if (!formulario) return '';
  const parts: string[] = [];
  if (formulario.palmarDireitaMedia || formulario.palmarEsquerdaMedia) {
    const palmar: string[] = [];
    if (formulario.palmarDireitaMedia) palmar.push(`Direita: ${formulario.palmarDireitaMedia} kgf`);
    if (formulario.palmarEsquerdaMedia) palmar.push(`Esquerda: ${formulario.palmarEsquerdaMedia} kgf`);
    if (formulario.classificacaoPalmar) palmar.push(`Classificacao: ${formulario.classificacaoPalmar}`);
    parts.push(`Dinamometria Palmar [${palmar.join(', ')}]`);
  }
  if (formulario.escapularMedia) {
    const escapular: string[] = [`Media: ${formulario.escapularMedia} kgf`];
    if (formulario.classificacaoEscapular) escapular.push(`Classificacao: ${formulario.classificacaoEscapular}`);
    parts.push(`Dinamometria Escapular [${escapular.join(', ')}]`);
  }
  if (formulario.dorsalMedia) {
    const dorsal: string[] = [`Media: ${formulario.dorsalMedia} kgf`];
    if (formulario.classificacaoDorsal) dorsal.push(`Classificacao: ${formulario.classificacaoDorsal}`);
    parts.push(`Dinamometria Dorsal [${dorsal.join(', ')}]`);
  }
  if (formulario.resultado) {
    parts.push(`Resultado Geral: ${formulario.resultado}`);
  }
  return parts.join(' | ');
}

function parseSnellen(val: string): number {
  if (!val || !val.includes('/')) return 1.0;
  const parts = val.split('/').map(Number);
  if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1]) && parts[1] !== 0) {
    return parts[0] / parts[1];
  }
  return 1.0;
}

function formatAcuidadeResultado(formulario: any): string {
  if (!formulario) return '';
  const parts: string[] = [];
  
  const longe: string[] = [];
  if (formulario.longeOD) longe.push(`OD: ${formulario.longeOD}`);
  if (formulario.longeOE) longe.push(`OE: ${formulario.longeOE}`);
  if (formulario.longeBinocular) longe.push(`Binocular: ${formulario.longeBinocular}`);
  if (longe.length > 0) parts.push(`Longe [${longe.join(', ')}]`);

  const perto: string[] = [];
  if (formulario.pertoBinocular) perto.push(`Binocular: ${formulario.pertoBinocular}`);
  if (perto.length > 0) parts.push(`Perto [${perto.join(', ')}]`);

  if (formulario.exameComLenteCorretiva) {
    parts.push(`Lente corretiva: ${formulario.exameComLenteCorretiva}`);
  }

  if (formulario.ishiharaRealizado && formulario.conclusaoIshihara) {
    parts.push(`Ishihara: ${formulario.conclusaoIshihara}`);
  }
  if (formulario.estereopsiaRealizado && formulario.estereopsiaResultado) {
    parts.push(`Estereopsia: ${formulario.estereopsiaResultado}`);
  }

  if (formulario.resultado) {
    parts.push(`Resultado Geral: ${formulario.resultado}`);
  }
  return parts.join(' | ');
}

function formatEspirometriaResultado(formulario: any): string {
  if (!formulario) return '';
  const parts: string[] = [];
  
  if (formulario.tabagismo === true || String(formulario.tabagismo).toLowerCase() === 'sim') {
    parts.push('Tabagismo: Sim');
  }
  
  const camposSim = [
    { key: 'tossePigarroManha', label: 'Tosse/Pigarro pela manha' },
    { key: 'catarroHabitual', label: 'Catarro habitual' },
    { key: 'sibilancia', label: 'Sibilancia' },
    { key: 'faltaArEsforco', label: 'Falta de ar ao esforco' },
    { key: 'doencaPulmonar', label: 'Doenca pulmonar' },
    { key: 'asma', label: 'Asma' },
    { key: 'medicacaoAsma', label: 'Uso de medicacao para asma' },
    { key: 'cirurgiaToraxPulmao', label: 'Cirurgia de torax/pulmao' }
  ];

  for (const campo of camposSim) {
    if (String(formulario[campo.key] || '').trim().toLowerCase() === 'sim') {
      parts.push(`${campo.label}: Sim`);
    }
  }

  if (parts.length === 0) {
    return 'Exame normal (sem queixas ou fatores de risco relatados na anamnese)';
  }

  return parts.join(' | ');
}

function isResultadoAlteradoEspirometria(formulario: any): boolean {
  if (!formulario) return false;
  if (formulario.tabagismo === true || String(formulario.tabagismo).toLowerCase() === 'sim') {
    return true;
  }
  const camposSim = [
    'tossePigarroManha', 'catarroHabitual', 'sibilancia', 'faltaArEsforco',
    'doencaPulmonar', 'asma', 'medicacaoAsma', 'cirurgiaToraxPulmao'
  ];
  return camposSim.some(campo => String(formulario[campo] || '').trim().toLowerCase() === 'sim');
}

function isResultadoAlteradoAcuidade(formulario: any): boolean {
  if (!formulario) return false;
  
  // 1. Validação de Longe (Padrão 20/20 ou melhor é normal)
  const acuidadeNormal = parseSnellen(formulario.longeOD) >= 1.0 && parseSnellen(formulario.longeOE) >= 1.0;
  if (!acuidadeNormal) return true;

  // 2. Ishihara (apenas se realizado)
  if (formulario.ishiharaRealizado === true) {
    const conclusao = String(formulario.conclusaoIshihara || '').toLowerCase();
    const ishiharaAlterado = conclusao.includes('altera') || conclusao.includes('daltonismo') || !conclusao.includes('normal');
    if (ishiharaAlterado) return true;
  }

  // 3. Estereopsia (apenas se realizado)
  if (formulario.estereopsiaRealizado === true) {
    const resultadoEstereopsia = String(formulario.estereopsiaResultado || '').toLowerCase();
    const estereopsiaAlterado = resultadoEstereopsia.includes('fora') || resultadoEstereopsia.includes('altera');
    if (estereopsiaAlterado) return true;
  }

  // 4. Se houver um resultado geral explícito e ele indicar alteração
  if (formulario.resultado) {
    const resGeral = String(formulario.resultado).trim().toLowerCase();
    if (resGeral !== 'visao normal' && resGeral !== 'normal' && resGeral !== 'apto') {
      return true;
    }
  }

  return false;
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatSocDate(value?: string | Date | null): string {
  if (!value) {
    return new Date().toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  const raw = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export async function WsResultadoExame(
  employee: SchedulingDocument,
  index: number,
): Promise<{ status: number; responseText: string; xml: string }> {
  const header = new WSSecurity(
    process.env.SOC_WEBSERVICE_USER,
    process.env.SOC_WEBSERVICE_PASS,
    'PasswordDigest',
  );
  const URL = 'https://ws1.soc.com.br/WSSoc/services/ResultadoExamesWs?wsdl';

  const referencialSequencial =
    employee.TIPOEXAME != '1' ? 'SEQUENCIAL' : 'REFERENCIAL';

  const isAudiometria = employee.EXAMES[index].grupo === 'Audiometria';
  const isClinico = employee.EXAMES[index].grupo === 'Exame Clínico';
  const isDinamometria = employee.EXAMES[index].grupo === 'Dinamometria';
  const isEspirometria = employee.EXAMES[index].grupo === 'Espirometria';
  const isAcuidade = employee.EXAMES[index].grupo === 'Acuidade Visual';

  const formulario = employee.EXAMES[index].formulario;
  const horaAgendamento = String(employee.HORARIO || '').slice(0, 5);

  const isNaoRealizado = employee.EXAMES[index].status === 'NAO_REALIZADO';

  let resultadoAlterado = false;
  let resultadoAlteradoOcupacional = false;
  let resultadoAlteradoEmAnalise = false;
  let resultado = '';
  let comentario = '';

  if (isNaoRealizado) {
    // Exame não realizado: usa o motivo registrado pelo usuário ou texto padrão
    const motivo =
      employee.EXAMES[index].motivoNaoRealizado ||
      employee.EXAMES[index].formulario?.motivoNaoRealizado ||
      'Exame nao realizado';
    resultado = motivo;
    comentario = `Exame nao realizado. Motivo: ${motivo}`;
    // Todos os flags de alteração permanecem false
  } else if (isAudiometria) {
    resultadoAlterado = isResultadoAlteradoAudiometria(formulario);
    resultadoAlteradoOcupacional = isResultadoAlteradoOcupacionalAudiometria(formulario);
    resultadoAlteradoEmAnalise = isResultadoAlteradoEmAnaliseAudiometria(formulario);
    resultado = formulario?.resultado || formulario?.conclusao || '';
    comentario = formulario?.observacoesMedicas || formulario?.observacoesFinais || formulario?.recomendacoes || formulario?.observacoes || '';
  } else if (formulario) {
    if (isClinico) {
      const conclusao = String(formulario.conclusao || '').trim().toLowerCase();
      resultadoAlterado = conclusao !== 'apto';
      resultado = formulario.conclusao || '';
    } else if (isDinamometria) {
      resultadoAlterado = String(formulario.resultado || '').trim().toLowerCase() === 'alterado';
      resultado = formatDinamometriaResultado(formulario);
    } else if (isEspirometria) {
      resultadoAlterado = isResultadoAlteradoEspirometria(formulario);
      resultado = formatEspirometriaResultado(formulario);
    } else if (isAcuidade) {
      resultadoAlterado = isResultadoAlteradoAcuidade(formulario);
      resultado = formatAcuidadeResultado(formulario);
    } else {
      resultado = formulario.resultado || formulario.conclusao || '';
    }
    comentario = formulario?.observacoesMedicas || formulario?.observacoesFinais || formulario?.recomendacoes || formulario?.observacoes || '';
  }

  // Data do resultado: vazia para NAO_REALIZADO (SOC aceita tag vazia), data real para FINALIZADO
  const dataFormatada = isNaoRealizado
    ? ''
    : formatSocDate(employee.EXAMES[index].dataExame || employee.DATAAGENDAMENTO);

  const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.soc.age.com/">
    <soapenv:Header>
        ${header.toXML()}
    </soapenv:Header>
    <soapenv:Body>
        <ser:resultadoExamesPorCodigoSequencial>
            <resultadoExame>
                <examesIdentificacaoPorIdWsVo>
                    <codigoIdFicha>${escapeXml(employee.SEQUENCIAFICHA)}</codigoIdFicha>
                    <codigoIdResultadoExame>${escapeXml(employee.EXAMES[index].sequencialResultadoExame)}</codigoIdResultadoExame>
                </examesIdentificacaoPorIdWsVo>
                    
                <identificacaoWsVo>
                    <chaveAcesso>${process.env.SOC_WEBSERVICE_PASS}</chaveAcesso>
                    <codigoEmpresaPrincipal>${process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL}</codigoEmpresaPrincipal>
                    <codigoResponsavel>${process.env.SOC_WEBSERVICE_CODIGO_RESPONSAVEL}</codigoResponsavel>
                    <homologacao></homologacao>
                    <codigoUsuario>${process.env.SOC_WEBSERVICE_CODIGO_USUARIO}</codigoUsuario>
                </identificacaoWsVo>
                    
                <resultadoExamesDadosWsVo>
                    <alteraFichaClinica>true</alteraFichaClinica>
                    
                    ${isAudiometria && !isNaoRealizado ? audiometriaTag(formulario) : ''}
                    

                     <codigoExame>${escapeXml(employee.EXAMES[index].codigoExame)}</codigoExame>
                     <codigoExaminador>${escapeXml(employee.EXAMES[index].codigoProfissional)}</codigoExaminador>
                     <codigoExaminador2></codigoExaminador2>
                     <codigoPrestador></codigoPrestador>
                     <comentario>${escapeXml(comentario)}</comentario>
                     <criaExame></criaExame>
                     <criaFichaClinica></criaFichaClinica>
                     <dataResultadoExame>${escapeXml(dataFormatada)}</dataResultadoExame>
                     
                     
                      <identificarExameAlteradoAutomaticamente>false</identificarExameAlteradoAutomaticamente>
                      <metodo></metodo>
                      <nomeExame>${escapeXml(employee.EXAMES[index].nomeExame)}</nomeExame>
                      <nomeExaminador3></nomeExaminador3>
                      <nomeImagem>${escapeXml(employee.EXAMES[index].url)}</nomeImagem>
                      <notaFiscal></notaFiscal>
                      <resultado>${escapeXml(resultado)}</resultado>
                     <resultadoAlterado>${formatSoapBoolean(resultadoAlterado)}</resultadoAlterado>
                    <resultadoAlteradoAgravamento>false</resultadoAlteradoAgravamento>
                    <resultadoAlteradoEmAnalise>${formatSoapBoolean(resultadoAlteradoEmAnalise)}</resultadoAlteradoEmAnalise>
                    <resultadoAlteradoOcupacional>${formatSoapBoolean(resultadoAlteradoOcupacional)}</resultadoAlteradoOcupacional>
                    
                    <resultadoReferencialSequencial>${referencialSequencial}</resultadoReferencialSequencial>
                    <sobrepoeResultadoExistente>true</sobrepoeResultadoExistente>
    
                     
                     <cnpjLaboratorio></cnpjLaboratorio>
                     <codigoExameLaboratorial></codigoExameLaboratorial>
                     <ordemExameEsocial></ordemExameEsocial>
                     <dataAgendamento>${escapeXml(employee.DATAAGENDAMENTO)}</dataAgendamento>
                     <horaAgendamento>${escapeXml(horaAgendamento)}</horaAgendamento>
                 </resultadoExamesDadosWsVo>
                    
                <resultadoExamesIdentificacaoFuncionarioWsVo>
                    
                    <codigoEmpresa>${escapeXml(employee.CODIGOEMPRESA)}</codigoEmpresa>
                    <codigoFuncionario>${escapeXml(employee.CODIGO)}</codigoFuncionario>
                    <dataFicha>${escapeXml(employee.DATAAGENDAMENTO)}</dataFicha>
                    <tipoeExame></tipoeExame>
                </resultadoExamesIdentificacaoFuncionarioWsVo>
            </resultadoExame>
        </ser:resultadoExamesPorCodigoSequencial>
    </soapenv:Body>
    </soapenv:Envelope>`;

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: xml,
      signal: AbortSignal.timeout(15000),
    });

    const responseText = await response.text();

    if (!response.ok) {
      const err = new Error(
        `SOC ResultadoExame HTTP ${response.status}: ${responseText.slice(0, 300)}`,
      );
      (err as any).xml = xml;
      throw err;
    }

    const faultMatch = responseText.match(/<faultstring>(.*?)<\/faultstring>/i);
    if (faultMatch?.[1]) {
      const err = new Error(`SOC ResultadoExame SOAP Fault: ${faultMatch[1]}`);
      (err as any).xml = xml;
      (err as any).responseText = responseText;
      throw err;
    }

    return {
      status: response.status,
      responseText,
      xml,
    };
  } catch (error) {
    if (!(error as any)?.xml) {
      (error as any).xml = xml;
    }
    throw error;
  }
}
