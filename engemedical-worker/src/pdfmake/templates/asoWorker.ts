import { TDocumentDefinitions } from 'pdfmake/interfaces';
import * as fs from 'fs';
import * as path from 'path';
import { getImageBase64 } from 'src/utils/util';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';

import { WorkerAsoInput } from '../aso-worker.types';
import { resolveRelatorioEvidenciasUrl } from '../autenticacao-evidencias-url.util';

export async function gerarTemplateAsoWorker(
  data: WorkerAsoInput,
): Promise<TDocumentDefinitions> {
  const PRIMARY = '#114E34';
  const LIGHT_TEXT = '#333333';
  const MUTED = '#5B5B5B';

  const {
    funcionario,
    empresa,
    unidade,
    unidadeAtendimento,
    atendimento,
    medicoCoordenador,
    medicoExaminador,
    parecer,
    riscos,
    exames,
    autenticacaoAtendimento,
  } = data;

  const logoLocalPath = path.resolve(
    process.cwd(),
    '..',
    'engemedical-connect-frontend',
    'public',
    'images',
    'cmso_logo.png',
  );
  const logoCmso = fs.existsSync(logoLocalPath)
    ? `data:image/png;base64,${fs.readFileSync(logoLocalPath).toString('base64')}`
    : await getImageBase64('https://cmsocupacional.com.br/images/logo.png');

  const biometriaImage = autenticacaoAtendimento.biometria?.imageBase64 || null;

  let assinaturaProfissional: string | null = null;
  const isDigitalizada =
    medicoExaminador?.signatureStatus === 'DIGITALIZADA' ||
    medicoExaminador?.signatureStatus === 'DIGITALIZADA_FALLBACK';

  if (medicoExaminador?.codigo && !isDigitalizada) {
    try {
      assinaturaProfissional = await getImageBase64(ASSINATURAS_URL[medicoExaminador.codigo]);
    } catch (err) {
      console.warn(
        `[ASO_WORKER] Falha ao carregar assinatura do medicoExaminador ${medicoExaminador.codigo}:`,
        err,
      );
    }
  }

  const assinaturaDigital = !isDigitalizada && !!assinaturaProfissional;

  const relatorioEvidenciasUrl = resolveRelatorioEvidenciasUrl(
    atendimento.prontuarioId,
    autenticacaoAtendimento.evidencias?.relatorioEvidenciasUrl,
  );

  // ─── UNIT ADDRESS (dinâmico via SocCompanyService) ──────────────────────────
  const enderecoUnidade = [unidade.endereco, unidade.numero, unidade.bairro, unidade.cidade, unidade.uf ? `${unidade.uf}` : '']
    .filter(Boolean).join(' - ');
  const enderecoUnidadeCompleto = enderecoUnidade
    ? `${enderecoUnidade}${unidade.cep ? ` - CEP: ${unidade.cep}` : ''}`
    : `${unidade.cidade || 'N/D'}${unidade.cep ? ` - CEP: ${unidade.cep}` : ''}`;

  // ─── COMPANY ADDRESS ──────────────────────────────────────────────────────
  const enderecoEmpresa = [empresa.endereco, empresa.numeroEndereco, empresa.complementoEndereco, empresa.bairro]
    .filter(Boolean).join(' - ');
  const enderecoEmpresaCompleto = enderecoEmpresa
    ? `${enderecoEmpresa}`
    : 'N/D';

  // ─── DATA E IDADE HELPERS ────────────────────────────────────────────

  const formatDate = (iso?: string | null): string => {
    if (!iso) return 'N/D';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR');
  };

  const safeFormatDate = (value?: string | null): string => {
    if (!value) return 'N/D';
    const trimmed = value.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return trimmed;
  };

  const formatDateTime = (value?: string | null): string => {
    if (!value) return 'N/D';
    const d = new Date(value);
    if (!isNaN(d.getTime()) && value.includes('T')) {
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return value;
  };

  let idadeText = '';
  if (funcionario.dataNascimento) {
    const parts = funcionario.dataNascimento.split('/');
    if (parts.length === 3) {
      const dia = parseInt(parts[0], 10);
      const mes = parseInt(parts[1], 10) - 1;
      const ano = parseInt(parts[2], 10);
      const nasc = new Date(ano, mes, dia);
      const hoje = new Date();
      let idade = hoje.getFullYear() - nasc.getFullYear();
      const m = hoje.getMonth() - nasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
        idade--;
      }
      idadeText = `${idade} anos`;
    }
  }

  // ─── GERAÇÃO DE CABEÇALHOS CINZAS ESTILO SOC ──────────────────────────

  const buildSectionHeader = (title: string): any => {
    return {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: title,
              bold: true,
              fontSize: 8.5,
              fillColor: '#EEEEEE',
              alignment: 'center',
              color: '#111111',
              padding: [4, 3, 4, 3],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 8, 0, 6],
    };
  };

  // ─── RISCOS AGRUPADOS (MAMBANDO IGUAL AO SOC) ─────────────────────────

  const categoryConfigs = [
    { key: 'FISICO', label: 'Físicos', color: '#009966', defaultText: 'Risco inexistente' },
    { key: 'QUIMICO', label: 'Químicos', color: '#FF0000', defaultText: 'Risco inexistente' },
    { key: 'BIOLOGICO', label: 'Biológicos', color: '#663333', defaultText: 'Risco inexistente' },
    { key: 'ERGONOMICO', label: 'Ergonômicos', color: '#FF9900', defaultText: 'Risco inexistente' },
    { key: 'ACIDENTES', label: 'Acidentes', color: '#0000FF', defaultText: 'Risco inexistente' },
    { key: 'INESPECIFICOS', label: 'Inespecíficos', color: '#000000', defaultText: 'Não há risco ocupacional específico.' },
  ];

  const groupedRiscos: Record<string, string[]> = {
    FISICO: [],
    QUIMICO: [],
    BIOLOGICO: [],
    ERGONOMICO: [],
    ACIDENTES: [],
    INESPECIFICOS: [],
  };

  if (riscos && riscos.length > 0) {
    for (const r of riscos) {
      const g = (r.grupo || 'INESPECIFICOS').toUpperCase();
      const riskName = r.risco || 'N/D';
      if (g.includes('FISICO')) groupedRiscos.FISICO.push(riskName);
      else if (g.includes('QUIMICO')) groupedRiscos.QUIMICO.push(riskName);
      else if (g.includes('BIOLOGICO')) groupedRiscos.BIOLOGICO.push(riskName);
      else if (g.includes('ERGONOMICO')) groupedRiscos.ERGONOMICO.push(riskName);
      else if (g.includes('ACIDENTES')) groupedRiscos.ACIDENTES.push(riskName);
      else groupedRiscos.INESPECIFICOS.push(riskName);
    }
  }

  const riscosContent: any[] = [];
  for (const config of categoryConfigs) {
    const list = groupedRiscos[config.key] || [];
    const textValue = list.length > 0 ? list.join(', ') : config.defaultText;
    riscosContent.push({
      columns: [
        { text: config.label, width: '15%', color: config.color, fontSize: 8, alignment: 'right', bold: true },
        { text: textValue, width: '85%', fontSize: 8, color: LIGHT_TEXT, alignment: 'left', margin: [15, 0, 0, 0] },
      ],
      margin: [0, 2, 0, 2],
    });
  }

  // ─── EXAMES REALIZADOS (GRID DE 2 COLUNAS SEM CABEÇALHOS) ─────────────

  const examesCells: any[] = [];
  const colCount = 2;
  const examesList =
    exames && exames.length > 0
      ? exames.filter((e) => e.codigoExame !== 'triagem')
      : [
          {
            nomeExame:
              'Avaliação Clínica Ocupacional (Anamnese e Exame físico) (Cód. eSocial - 0295)',
            dataExame: atendimento.dataAgendamento || 'N/D',
          },
        ];

  for (let i = 0; i < examesList.length; i += colCount) {
    const rowCells: any[] = [];
    for (let j = 0; j < colCount; j++) {
      const examIndex = i + j;
      if (examIndex < examesList.length) {
        const e = examesList[examIndex];
        const examDate = safeFormatDate(e.dataExame || atendimento.dataAgendamento);
        rowCells.push({
          width: '50%',
          columns: [
            { text: examDate, width: '20%', fontSize: 8, color: LIGHT_TEXT },
            { text: e.nomeExame || 'N/D', width: '80%', fontSize: 8, color: LIGHT_TEXT },
          ],
          margin: [0, 4, 10, 4],
        });
      } else {
        rowCells.push({ text: '', width: '50%' });
      }
    }
    examesCells.push({ columns: rowCells });
  }

  // ─── DATA HORA VALIDACAO E ASSINATURA FUNCIONARIO ────────────────────

  const dataAssinaturaFuncionario = autenticacaoAtendimento.validadoEm
    ? formatDate(autenticacaoAtendimento.validadoEm)
    : atendimento.dataAgendamento || 'N/D';

  const dataHoraFooter = formatDateTime(
    autenticacaoAtendimento.validadoEm || atendimento.dataAgendamento,
  );

  const buildFuncionarioAuthBlock = () => {
    const isFacial = autenticacaoAtendimento.metodo === 'FACIAL';
    const authImage =
      autenticacaoAtendimento.metodo === 'BIOMETRIA'
        ? biometriaImage
        : null;

    return {
      columns: [
        {
          width: 58,
          stack: [
            authImage
              ? { image: authImage, fit: [58, 58], alignment: 'center', margin: [0, 0, 0, 2] }
              : isFacial && relatorioEvidenciasUrl
                ? { qr: relatorioEvidenciasUrl, fit: 58, alignment: 'center', margin: [0, 0, 0, 2] }
                : { text: '', margin: [0, 58, 0, 0] },
          ],
        },
        {
          width: '*',
          stack: [
            {
              text: isFacial ? 'Autenticado por reconhecimento facial' : 'Assinado biometricamente por digital',
              fontSize: 7,
              bold: true,
              color: PRIMARY,
              alignment: 'left',
              margin: [0, 2, 0, 0],
            },
            { text: funcionario.nome, fontSize: 8.2, bold: true, color: PRIMARY, alignment: 'left', margin: [0, 1, 0, 0] },
            { text: `CPF: ${funcionario.cpfMascarado || 'N/D'}`, fontSize: 7.4, color: MUTED, alignment: 'left', margin: [0, 1, 0, 0] },
            { text: `Validação: ${dataAssinaturaFuncionario}`, fontSize: 7.4, color: MUTED, alignment: 'left', margin: [0, 1, 0, 0] },
            { text: `Status: ${autenticacaoAtendimento.status || 'N/D'}`, fontSize: 7.4, color: MUTED, alignment: 'left', margin: [0, 1, 0, 0] },
            {
              text: isFacial
                ? `Validador: ${autenticacaoAtendimento.validadoPor || 'N/D'}`
                : `Dedo: ${autenticacaoAtendimento.biometria?.dedo || 'N/D'}`,
              fontSize: 7.4,
              color: MUTED,
              alignment: 'left',
              margin: [0, 1, 0, 0],
            },
          ],
        },
      ],
    };
  };

  const buildAsoFooter = (): any => {
    const textoMetodo =
      autenticacaoAtendimento.metodo === 'FACIAL'
        ? 'Reconhecimento facial validado, com evidência eletrônica, conforme LGPD, MP 2.200-2/2001 e Lei 14.063/2020.'
        : 'Biometria validada, com evidência eletrônica, conforme LGPD, MP 2.200-2/2001 e Lei 14.063/2020.';

    return {
      margin: [34, 8, 34, 4],
      columns: [
        {
          width: '45%',
          stack: [
            {
              table: {
                widths: [108],
                body: [
                  [
                    assinaturaProfissional
                      ? {
                          image: assinaturaProfissional,
                          fit: [108, 36],
                          alignment: 'center',
                        }
                      : { text: '', margin: [0, 36, 0, 0] },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 0, 0, 3],
            },
            {
              text: medicoExaminador?.nome?.toUpperCase() || 'N/D',
              fontSize: 6.8,
              color: PRIMARY,
              bold: true,
              margin: [0, 2, 0, 0],
            },
            {
              text: `CPF: ${medicoExaminador?.cpf || 'N/D'}`,
              fontSize: 6.6,
              color: MUTED,
              margin: [0, 1, 0, 0],
            },
            {
              text: `CRM: ${medicoExaminador?.conselho || 'CRM'} / ${medicoExaminador?.ufconselho || ''}`,
              fontSize: 6.4,
              color: MUTED,
              margin: [0, 1, 0, 0],
            },
            ...(assinaturaDigital
              ? [
                  {
                    text: 'Documento assinado eletronicamente,\ngarantindo autoria e integridade integral do documento\nconforme a MP nº 2.200-2/2001 e a Lei nº 14.063/2020.',
                    fontSize: 4.6,
                    color: '#111111',
                    italics: true,
                    lineHeight: 1.02,
                    alignment: 'left',
                    margin: [0, 6, 0, 0],
                  },
                ]
              : []),
            {
              text: `${dataHoraFooter} - ${unidadeAtendimento || unidade.nome || 'N/D'}`,
              fontSize: 6.4,
              color: MUTED,
              margin: [0, 2, 0, 0],
            },
          ],
        },
        {
          width: '10%',
          text: '',
        },
        {
          width: '45%',
          columns: [
            {
              width: '*',
              stack: [
                { text: '', margin: [0, 4, 0, 0] },
                {
                  text: funcionario.nome,
                  fontSize: 7.5,
                  bold: true,
                  color: PRIMARY,
                  alignment: 'right',
                  margin: [0, 2, 0, 0],
                },
                {
                  text: `CPF: ${funcionario.cpfMascarado || 'N/D'}`,
                  fontSize: 7.4,
                  color: MUTED,
                  alignment: 'right',
                  margin: [0, 1, 0, 0],
                },
                {
                  text: `${dataHoraFooter} - ${unidadeAtendimento || unidade.nome || 'N/D'}`,
                  fontSize: 7.4,
                  color: MUTED,
                  alignment: 'right',
                  margin: [0, 1, 0, 0],
                },
                {
                  text: textoMetodo,
                  fontSize: 6.8,
                  color: MUTED,
                  alignment: 'right',
                  margin: [0, 2, 0, 0],
                  lineHeight: 1.05,
                },
              ],
            },
            {
              width: 68,
              stack: [
                { text: '', margin: [0, 4, 0, 0] },
                relatorioEvidenciasUrl
                  ? {
                      qr: relatorioEvidenciasUrl,
                      fit: 58,
                      alignment: 'center',
                      margin: [0, 0, 0, 2],
                    }
                  : biometriaImage
                    ? {
                        image: biometriaImage,
                        fit: [58, 58],
                        alignment: 'center',
                        margin: [0, 0, 0, 2],
                      }
                    : { text: '', margin: [0, 58, 0, 0] },
              ],
            },
          ],
        },
      ],
    };
  };

  // ─── DOC DEFINITION ──────────────────────────────────────────────────

  return {
    pageSize: 'A4',
    pageMargins: [34, 35, 34, 155],
    footer: buildAsoFooter(),
    content: [
      // ═══════════════ HEADER ═══════════════════════════════════════════
      {
        columns: [
          {
            width: '20%',
            image: logoCmso || '',
            fit: [95, 48],
            alignment: 'left',
          },
          {
            width: '60%',
            stack: [
              {
                  text: empresa.nome.toUpperCase(),
                  fontSize: 10,
                  bold: true,
                  color: PRIMARY,
                  alignment: 'center',
                },
                {
                  text: 'ASO - ATESTADO DE SAÚDE OCUPACIONAL',
                  fontSize: 9,
                  bold: true,
                  color: '#A8CE3B',
                  alignment: 'center',
                  margin: [0, 4, 0, 0],
                },
              ],
            margin: [0, 8, 0, 0], // Adiciona margem superior para centralizar verticalmente com a logo
            },
            {
              width: '20%',
              // Espaço reservado para logo do cliente
              text: '',
            },
          ],
        margin: [0, 0, 0, 15],
      },

      // ═══════════════ TRABALHADOR / EMPRESA ════════════════════════════
      {
        columns: [
          {
            width: '52%',
            stack: [
              { columns: [{ text: 'Nome:', width: '22%', fontSize: 8 }, { text: funcionario.nome, width: '78%', fontSize: 9, bold: false, color: PRIMARY }] },
              { columns: [{ text: 'Nascimento:', width: '22%', fontSize: 8 }, { text: `${funcionario.dataNascimento || 'N/D'}${idadeText ? ` - ${idadeText}` : ''}`, width: '78%', fontSize: 8 }] },
              { columns: [{ text: 'Cargo:', width: '22%', fontSize: 8 }, { text: funcionario.cargo || 'N/D', width: '78%', fontSize: 8 }] },
              { columns: [{ text: 'Endereço:', width: '22%', fontSize: 8 }, { text: enderecoEmpresaCompleto || 'N/D', width: '78%', fontSize: 8 }] },
            ],
          },
          {
            width: '24%',
            stack: [
              { columns: [{ text: 'Código:', width: '35%', fontSize: 8 }, { text: funcionario.codigo || 'N/D', width: '65%', fontSize: 8 }] },
              { columns: [{ text: 'CPF:', width: '35%', fontSize: 8 }, { text: funcionario.cpfMascarado || 'N/D', width: '65%', fontSize: 8 }] },
              { columns: [{ text: 'Setor:', width: '35%', fontSize: 8 }, { text: funcionario.setor || 'N/D', width: '65%', fontSize: 8 }] },
              { columns: [{ text: 'Cidade:', width: '35%', fontSize: 8 }, { text: `${unidade.cidade || 'N/D'} / SP`, width: '65%', fontSize: 8 }] },
            ],
          },
          {
            width: '24%',
            stack: [
              { columns: [{ text: 'CNPJ', width: '35%', fontSize: 8 }, { text: empresa.cnpj || 'N/D', width: '65%', fontSize: 8 }] },
              { columns: [{ text: 'Unidade:', width: '35%', fontSize: 8 }, { text: unidade.nome || 'N/D', width: '65%', fontSize: 8 }] },
              { columns: [{ text: 'CEP:', width: '35%', fontSize: 8 }, { text: unidade.cep || 'N/D', width: '65%', fontSize: 8 }] },
            ],
          },
        ],
        margin: [0, 2, 0, 6],
      },

      // ═══════════════ MÉDICO PCMSO ═════════════════════════════════════
      buildSectionHeader('MÉDICO RESPONSÁVEL PELO PCMSO'),
      {
        text: `${medicoCoordenador.nome} - CRM: ${medicoCoordenador.crm} / ${medicoCoordenador.uf} - Medicina do Trabalho`,
        fontSize: 8,
        alignment: 'center',
        margin: [0, 2, 0, 2],
      },
      {
        text: `CENTRO MÉDICO DE SAÚDE OCUPACIONAL - ${unidadeAtendimento || unidade.nome || 'Rio Claro'}`,
        fontSize: 8,
        bold: true,
        alignment: 'left',
        margin: [0, 4, 0, 2],
      },
      {
        text: enderecoUnidadeCompleto,
        fontSize: 8,
        margin: [0, 1, 0, 4],
      },

      // ═══════════════ RISCOS OCUPACIONAIS ══════════════════════════════
      buildSectionHeader('PERIGOS / FATORES DE RISCO'),
      {
        stack: riscosContent,
        margin: [0, 4, 0, 4],
      },

      // ═══════════════ TIPO DE EXAME ════════════════════════════════════
      buildSectionHeader('TIPO DE EXAME'),
      {
        text: atendimento.tipoExameNome || 'N/D',
        fontSize: 10,
        bold: true,
        color: PRIMARY,
        alignment: 'center',
        margin: [0, 4, 0, 4],
      },

      // ═══════════════ EXAMES REALIZADOS ════════════════════════════════
      buildSectionHeader('AVALIAÇÃO CLÍNICA E EXAMES REALIZADOS'),
      {
        stack: examesCells,
        margin: [0, 4, 0, 4],
      },

      // ═══════════════ PARECER / CONCLUSÃO MÉDICA ═══════════════════════
      buildSectionHeader('PARECER'),
      {
        text: parecer?.opinionType || 'N/D',
        fontSize: 10,
        bold: true,
        color: PRIMARY,
        alignment: 'center',
        margin: [0, 4, 0, 2],
      },
      ...(parecer?.alturaParecer
        ? [{
            text: `Trabalho em Altura: ${parecer.alturaParecer}`,
            fontSize: 8,
            color: PRIMARY,
            alignment: 'center',
            margin: [0, 1, 0, 1],
          }]
        : []),
      ...(parecer?.confinadoParecer
        ? [{
            text: `Espaço Confinado: ${parecer.confinadoParecer}`,
            fontSize: 8,
            color: PRIMARY,
            alignment: 'center',
            margin: [0, 1, 0, 4],
          }]
        : []),

      // ═══════════════ ORIENTAÇÕES MÉDICAS (se houver) ══════════════════════
      ...(parecer?.orientacoes && parecer.orientacoes.length > 0
        ? [
            buildSectionHeader('ORIENTAÇÕES MÉDICAS'),
            ...parecer.orientacoes.map((orientacao, idx) => ({
              text: `${idx + 1}. ${orientacao}`,
              fontSize: 8,
              color: LIGHT_TEXT,
              alignment: 'left',
              margin: [0, 2, 0, 2],
            })),
            { text: '', margin: [0, 0, 0, 8] },
          ]
        : []),

      // ═══════════════ OBSERVACAO ═══════════════════════════════════════
      buildSectionHeader('OBSERVAÇÕES'),
      {
        text: parecer?.details || ' ',
        fontSize: 8,
        color: LIGHT_TEXT,
        alignment: 'left',
        margin: [0, 4, 0, 10],
      },

    ],
    styles: {
      mainTitle: { fontSize: 18, bold: true },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        color: PRIMARY,
        margin: [0, 5, 0, 2],
      },
    },
    defaultStyle: { fontSize: 10, color: LIGHT_TEXT },
  };
}
