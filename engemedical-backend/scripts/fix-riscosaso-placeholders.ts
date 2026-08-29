/**
 * Corrige RISCOSASO de registros antigos que ficaram com
 * "INESPECIFICOS: Risco Ocupacional (Código: xxxx)".
 *
 * Fluxo:
 * 1. Busca docs MongoDB com RISCOSASO contendo placeholder
 * 2. Para cada SEQUENCIAFICHA única, obtém CODIGOFUNCIONARIO via SOC (193601)
 * 3. Resolve riscos via híbrido (193602 + 210129)
 * 4. Atualiza docs no MongoDB
 *
 * Uso:
 *   npx ts-node scripts/fix-riscosaso-placeholders.ts                         # dry-run
 *   npx ts-node scripts/fix-riscosaso-placeholders.ts --dry-run                # dry-run
 *   npx ts-node scripts/fix-riscosaso-placeholders.ts --apply                  # aplica
 *   npx ts-node scripts/fix-riscosaso-placeholders.ts --empresa=2068859        # filtra empresa
 *   npx ts-node scripts/fix-riscosaso-placeholders.ts --empresa=2068859 --apply
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: resolve(__dirname, '../.env') });

const REQUEST_DELAY = 300; // ms entre chamadas ao SOC (rate limiting)

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--apply');
const empresaFilter = args.find(a => a.startsWith('--empresa='))?.split('=')[1] || null;
const beforeFilter = args.find(a => a.startsWith('--before='))?.split('=')[1] || null;
const afterFilter = args.find(a => a.startsWith('--after='))?.split('=')[1] || null;
const targetGroupsFilter = args.includes('--fix-groups');

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const SOC_GRUPO_MAP: Record<string, string> = {
  '1': 'FISICOS', '2': 'QUIMICOS', '3': 'BIOLOGICOS',
  '4': 'ERGONOMICOS', '5': 'ACIDENTES', '6': 'INESPECIFICOS',
};

const MAPA_CONHECIDO: Record<string, { grupo: string; nome: string }> = {
  '1': { grupo: 'FISICOS', nome: 'Ruído.' },
  '774': { grupo: 'FISICOS', nome: 'Ruído Contínuo' },
  '1047': { grupo: 'FISICOS', nome: 'Ruído Contínuo (NHO 01 - Q3)' },
  '1176': { grupo: 'FISICOS', nome: 'Vibração de Corpo Inteiro' },
  '301': { grupo: 'QUIMICOS', nome: 'Particulado Respirável' },
  '646': { grupo: 'QUIMICOS', nome: 'Particulado Respirável / Silica' },
  '745': { grupo: 'QUIMICOS', nome: 'Contato com óleo diesel' },
  '855': { grupo: 'QUIMICOS', nome: 'Varredura de Solventes' },
  '443': { grupo: 'BIOLOGICOS', nome: 'Trabalhos em galerias, fossas e tanques de esgoto' },
  '173': { grupo: 'ERGONOMICOS', nome: 'Postura inadequada' },
  '250': { grupo: 'ERGONOMICOS', nome: 'Carga / Levantamento' },
  '410': { grupo: 'ERGONOMICOS', nome: 'Postura sentada' },
  '515': { grupo: 'ERGONOMICOS', nome: 'Deslocamento a pé' },
  '592': { grupo: 'ERGONOMICOS', nome: 'Levantamento de carga' },
  '303': { grupo: 'ACIDENTES', nome: 'Queda de objetos' },
  '309': { grupo: 'ACIDENTES', nome: 'Objetos cortantes' },
  '311': { grupo: 'FISICOS', nome: 'Superfícies e/ou materiais aquecidos expostos' },
  '744': { grupo: 'ACIDENTES', nome: 'Colisão' },
  '83': { grupo: 'INESPECIFICOS', nome: 'Não há risco ocupacional específico' },
  '39': { grupo: 'BIOLOGICOS', nome: 'Animais peçonhentos' },
  '304': { grupo: 'ACIDENTES', nome: 'Projeção de Partículas' },
  '307': { grupo: 'ACIDENTES', nome: 'Condições perigosas previstas na legislação trabalhista (Inflamáveis)' },
  '330': { grupo: 'ACIDENTES', nome: 'Partes móveis / Aprisionamento' },
  '1564': { grupo: 'BIOLOGICOS', nome: 'Resíduos Contaminados' },
  '457': { grupo: 'QUIMICOS', nome: 'Varredura de Vapores Orgânicos Selecionados' },
  '1158': { grupo: 'FISICOS', nome: 'Ruido Contínuo' },
  '188': { grupo: 'QUIMICOS', nome: 'Negro de fumo' },
};

async function fetchJson(url: string): Promise<any[]> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const buf = await resp.arrayBuffer();
    const dec = new TextDecoder('iso-8859-1').decode(buf);
    if (dec.startsWith('De')) return [];
    return JSON.parse(dec);
  } catch { return []; }
}

/**
 * Obtém CODIGOFUNCIONARIO a partir da SEQUENCIAFICHA via endpoint 193601.
 */
async function lookupFuncionarioCode(empresaTrabalho: string, sequenciaFicha: string): Promise<string | null> {
  const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro=${encodeURIComponent(JSON.stringify({
    empresa: '16459', codigo: '193601', chave: '8ce693447b44481c7438',
    tipoSaida: 'json', sequencial: sequenciaFicha, empresaTrabalho,
  }))}`;
  const data = await fetchJson(url);
  const arr = Array.isArray(data) ? data : [];
  if (arr.length > 0) {
    const cod = (arr[0].CODIGOFUNCIONARIO || '').toString().trim();
    return cod || null;
  }
  return null;
}

/**
 * Busca códigos de risco do funcionário via 193602 (Riscos do Funcionário).
 */
async function fetchEmployeeRiskCodes(empresaTrabalho: string, codigoFuncionario: string): Promise<Set<string>> {
  const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro=${encodeURIComponent(JSON.stringify({
    empresa: '16459', codigo: '193602', chave: '8355c87bb9157db187cb',
    tipoSaida: 'json', empresaTrabalho, funcionario: codigoFuncionario,
  }))}`;
  const data = await fetchJson(url);
  const riscos = new Set<string>();
  for (const item of (Array.isArray(data) ? data : [])) {
    const cod = (item.CODRISCO || '').toString().trim();
    if (cod) riscos.add(cod);
  }
  return riscos;
}

/**
 * Busca códigos de risco via 161440 (Pedido de Exame) usando empresa alvo + funcionario + data.
 * Tenta empresa=empresaTrabalho primeiro, fallback para empresa=16459 + empresaTrabalho.
 */
async function fetchPedidoRiskCodes(
  empresaTrabalho: string, codigoFuncionario: string, dataAgendamento: string
): Promise<Set<string>> {
  const partes = dataAgendamento.split('/');
  if (partes.length !== 3) return new Set();
  const mes = partes[1];
  const ano = partes[2];
  const dataInicio = `01/${mes}/${ano}`;
  const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate().toString().padStart(2, '0');
  const dataFim = `${ultimoDia}/${mes}/${ano}`;

  const buildUrl = (empresa: string, et?: string) => {
    const params: any = {
      empresa, codigo: '161440', chave: '3d0851191bdd7e498167',
      tipoSaida: 'json',
      funcionarioInicio: codigoFuncionario, funcionarioFim: codigoFuncionario,
      paramData: '1', dataInicio, dataFim,
      paramSequencial: '', sequenciaFicha: '',
      paramFunc: '0', cpffuncionario: '', nomefuncionario: '',
      codpresta: '', nomepresta: '', paramPresta: '0',
      codunidade: '', nomeunidade: '', paramUnidade: '0',
    };
    if (et) params.empresaTrabalho = et;
    return `https://ws1.soc.com.br/WebSoc/exportadados?parametro=${encodeURIComponent(JSON.stringify(params))}`;
  };

  const parseRiscos = (data: any[]): Set<string> => {
    const riscos = new Set<string>();
    for (const item of data) {
      const raw = (item.RISCOSFUNCIONARIO || item.RISCOSASO || '').toString();
      for (const c of raw.split(',').map(r => r.trim()).filter(Boolean)) {
        riscos.add(c);
      }
    }
    return riscos;
  };

  // 1a tentativa: empresa = empresaTrabalho
  let data = await fetchJson(buildUrl(empresaTrabalho));
  if (Array.isArray(data) && data.length > 0) return parseRiscos(data);

  // 2a tentativa: empresa = '16459' + empresaTrabalho
  data = await fetchJson(buildUrl('16459', empresaTrabalho));
  if (Array.isArray(data) && data.length > 0) return parseRiscos(data);

  return new Set();
}

/**
 * Busca todos os registros ativos de riscos_config no Supabase e constrói
 * um mapa: código SOC → { grupo, nome }.
 * Fonte primária de resolução — substitui chamadas SOC + IA para códigos já mapeados.
 */
async function buildSupabaseRiscoMap(): Promise<Map<string, { grupo: string; nome: string }>> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return new Map();

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('riscos_config')
      .select('codigos, grupo, descricao')
      .eq('ativo', true);

    if (error || !data) return new Map();

    const mapa = new Map<string, { grupo: string; nome: string }>();
    for (const row of data) {
      const grupo = (row.grupo || '').trim().toUpperCase();
      if (!grupo) continue;
      const nome = (row.descricao || '').trim();
      if (!nome) continue;
      for (const codigo of (row.codigos || [])) {
        const c = codigo.toString().trim();
        if (c && !mapa.has(c)) {
          mapa.set(c, { grupo, nome });
        }
      }
    }
    return mapa;
  } catch {
    return new Map();
  }
}

interface Solucao {
  codigo: string;
  risco: string;
  grupo: string;
}

/**
 * Classifica o grupo de um risco via IA (Groq → Azure OpenAI).
 */
async function classifyRiskGroupWithIA(riscoNome: string): Promise<string | null> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY;
  if (!GROQ_API_KEY && !AZURE_API_KEY) return null;

  const messages = [
    {
      role: 'system',
      content: 'Classifique o risco ocupacional (PGR/SST) em um dos 6 grupos. FISICOS: ruído, vibração, radiação, temperatura, umidade, pressão. QUIMICOS: poeira, fumo, névoa, gás, vapor, produto químico, substância. BIOLOGICOS: vírus, bactéria, fungo, parasita, agente infeccioso. ERGONOMICOS: postura, esforço repetitivo, levantamento de peso, mobiliário. ACIDENTES: queda, corte, projeção de partículas, superfície aquecida, colisão, aprisionamento, eletricidade, máquina, espaço confinado. INESPECIFICOS: atividade administrativa, preventiva, vigilância, sem agente específico. Responda apenas o grupo em MAIÚSCULO.',
    },
    { role: 'user', content: riscoNome },
  ];

  // Tenta Groq primeiro
  if (GROQ_API_KEY) {
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'qwen/qwen3.6-27b',
          messages, max_tokens: 15, temperature: 0,
        }),
      });
      const json: any = await resp.json();
      const res = (json?.choices?.[0]?.message?.content || '').trim().toUpperCase();
      if (['FISICOS', 'QUIMICOS', 'BIOLOGICOS', 'ERGONOMICOS', 'ACIDENTES', 'INESPECIFICOS'].includes(res)) return res;
    } catch {}
  }

  // Fallback Azure OpenAI
  if (AZURE_API_KEY) {
    try {
      const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || 'https://cmsoopenai.openai.azure.com/').replace(/\/openai\/v1\/?$/i, '');
      const model = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1-mini';
      const resp = await fetch(`${endpoint}/openai/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': AZURE_API_KEY },
        body: JSON.stringify({ model, messages, max_tokens: 15, temperature: 0 }),
      });
      const json: any = await resp.json();
      const res = (json?.choices?.[0]?.message?.content || '').trim().toUpperCase();
      if (['FISICOS', 'QUIMICOS', 'BIOLOGICOS', 'ERGONOMICOS', 'ACIDENTES', 'INESPECIFICOS'].includes(res)) return res;
    } catch {}
  }

  return null;
}

async function resolverRiscos(
  empresaTrabalho: string,
  codigoFuncionario: string,
  riscosPedido: Set<string>,
  supabaseRiscoMap: Map<string, { grupo: string; nome: string }>,
): Promise<Solucao[]> {
  // 1. Supabase riscos_config — fonte primária (curadoria manual do usuário)
  //    (já temos o mapa pré-carregado, usamos inline no loop final)

  // 2. PCMSO (210129) — fonte secundária de nome e grupo
  await delay(REQUEST_DELAY);
  const pcmsUrl = `https://ws1.soc.com.br/WebSoc/exportadados?parametro={"empresa":"16459","codigo":"210129","chave":"1bdcb22f319e202d8cf1","tipoSaida":"json","empresaTrabalho":"${empresaTrabalho}","codigoRisco":"","codigoExame":"","codigoGrupoRisco":""}`;
  const pcmsData = await fetchJson(pcmsUrl);
  const pcmsGrupoMap: Record<string, string> = {};
  const pcmsNomeMap: Record<string, string> = {};
  for (const item of (Array.isArray(pcmsData) ? pcmsData : [])) {
    const codigo = (item.CODIGO_RISCO || item.CODRISCO || '').toString().trim();
    const nome = (item.NOME_RISCO || item.RISCO || '').toString().trim();
    const grupoCode = (item.GRUPO_RISCO || item.GRUPORISCO || '').toString().trim();
    const grupo = SOC_GRUPO_MAP[grupoCode];
    if (codigo) {
      if (grupo) pcmsGrupoMap[codigo] = grupo;
      if (nome) pcmsNomeMap[codigo] = nome;
    }
  }

  // 2. Cadastro Risco Empresa (198100) — fallback de nome para todos os riscos cadastrados
  await delay(REQUEST_DELAY);
  const cadUrl = `https://ws1.soc.com.br/WebSoc/exportadados?parametro=${encodeURIComponent(JSON.stringify({
    empresa: '16459', codigo: '198100', chave: 'aacce9903d91a5196136',
    tipoSaida: 'json', empresaTrabalho,
  }))}`;
  const cadData = await fetchJson(cadUrl);
  const empresaNomeMap: Record<string, string> = {};
  for (const item of (Array.isArray(cadData) ? cadData : [])) {
    const codigo = (item.COD || '').toString().trim();
    const nome = (item.NOME || '').toString().trim();
    if (codigo && nome) empresaNomeMap[codigo] = nome;
  }

  // 3. Endpoint do funcionário (193602) — fallback de nome
  await delay(REQUEST_DELAY);
  const empUrl = `https://ws1.soc.com.br/WebSoc/exportadados?parametro=${encodeURIComponent(JSON.stringify({
    empresa: '16459', codigo: '193602', chave: '8355c87bb9157db187cb',
    tipoSaida: 'json', empresaTrabalho, funcionario: codigoFuncionario,
  }))}`;
  const employeeData = await fetchJson(empUrl);
  const employeeNomeMap: Record<string, string> = {};
  for (const item of (Array.isArray(employeeData) ? employeeData : [])) {
    const codigo = (item.CODRISCO || '').toString().trim();
    const nome = (item.RISCO || '').toString().trim();
    if (codigo && nome) employeeNomeMap[codigo] = nome;
  }

  // 4. Montar resultado para TODOS os códigos do pedido
  const resultado: Solucao[] = [];

  for (const codigo of riscosPedido) {
    if (resultado.some(r => r.codigo === codigo)) continue;

    // Nome: Supabase → PCMSO → cadastro empresa → funcionário → mapaConhecido → placeholder
    const sb = supabaseRiscoMap.get(codigo);
    const nome = sb?.nome || pcmsNomeMap[codigo] || empresaNomeMap[codigo] || employeeNomeMap[codigo] || MAPA_CONHECIDO[codigo]?.nome || `Risco Ocupacional (Código: ${codigo})`;

    // Grupo: Supabase → PCMSO → MAPA_CONHECIDO → IA → INESPECIFICOS
    let grupo: string | undefined = sb?.grupo || pcmsGrupoMap[codigo] || MAPA_CONHECIDO[codigo]?.grupo;
    if (!grupo && !nome.includes('Risco Ocupacional')) {
      const iaGroup = await classifyRiskGroupWithIA(nome);
      if (iaGroup) grupo = iaGroup;
      if (grupo) await delay(50);
    }
    grupo = grupo || 'INESPECIFICOS';

    resultado.push({ codigo, risco: nome, grupo });
  }

  return resultado;
}

async function main() {
  const MONGO_URL = process.env.MONGO_URL || '';
  const MONGO_DATABASE = process.env.MONGO_DATABASE || 'cmso-agendamento';
  const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'schedulings';

  if (!MONGO_URL) {
    console.error('MONGO_URL não configurada');
    process.exit(1);
  }

  console.log('');
  console.log('============================================================');
  console.log('  CORREÇÃO DE RISCOSASO — placeholder para híbrido');
  console.log(`  Modo: ${isDryRun ? 'DRY-RUN' : 'APPLY'}`);
  if (empresaFilter) console.log(`  Empresa filtro: ${empresaFilter}`);
  console.log('============================================================');
  console.log(`  Banco: ${MONGO_DATABASE}.${MONGO_COLLECTION}`);
  console.log('');

  const client = new MongoClient(MONGO_URL, {
    serverApi: ServerApiVersion.v1,
    ssl: true,
  });

  await client.connect();
  console.log('  Conectado ao MongoDB.\n');

  try {
    const db = client.db(MONGO_DATABASE);
    const collection = db.collection(MONGO_COLLECTION);

    const matchQuery: any = {
      RISCOSASO: { $exists: true, $ne: null },
    };
    if (empresaFilter) matchQuery.CODIGOEMPRESA = empresaFilter;

    // Filtro por CREATED — apenas quando explicitamente informado
    if (beforeFilter) {
      matchQuery.$or = [
        { CREATED: { $exists: false } },
        { CREATED: { $lt: beforeFilter + 'T23:59:59.999Z' } },
      ];
      console.log(`  Filtro CREATED < ${beforeFilter} (ou sem CREATED)`);
    }

    if (afterFilter) {
      // só se aplica a documentos que TENHAM CREATED
      const afterCond: any = { $gte: afterFilter + 'T00:00:00.000Z' };
      if (matchQuery.$or) {
        // combinar com $or já existente
        matchQuery.$and = [
          { $or: matchQuery.$or },
          { CREATED: afterCond },
        ];
        delete matchQuery.$or;
      } else {
        matchQuery.CREATED = afterCond;
      }
      console.log(`  Filtro CREATED >= ${afterFilter}`);
    }

    console.log('');

    const docs = await collection
      .find(matchQuery, {
        projection: {
          _id: 1,
          CODIGOEMPRESA: 1,
          NOME: 1,
          SEQUENCIAFICHA: 1,
          DATAAGENDAMENTO: 1,
          CREATED: 1,
          RISCOSASO: 1,
        },
      })
      .toArray();

    console.log(`  Total de documentos com RISCOSASO: ${docs.length}`);

    // Inclui docs com placeholder OU array vazio OU — com --fix-groups — INESPECIFICOS (exceto cod 83)
    const docsParaProcessar = docs.filter(doc => {
      if (!Array.isArray(doc.RISCOSASO) || doc.RISCOSASO.length === 0) return true;
      const hasPlaceholder = (doc.RISCOSASO as any[]).some(r => (r.risco || '').includes('Risco Ocupacional'));
      if (hasPlaceholder) return true;
      if (targetGroupsFilter) {
        const hasBadGroup = (doc.RISCOSASO as any[]).some(r =>
          r.grupo === 'INESPECIFICOS' && r.codigo !== '83'
        );
        if (hasBadGroup) return true;
      }
      return false;
    });

    if (docsParaProcessar.length === 0) {
      console.log('  Nenhum documento pendente de correção.');
      return;
    }

    console.log(`  Documentos a corrigir: ${docsParaProcessar.length} (vazios=${docsParaProcessar.filter(d => !Array.isArray(d.RISCOSASO) || d.RISCOSASO.length === 0).length}, placeholder=${docsParaProcessar.filter(d => Array.isArray(d.RISCOSASO) && d.RISCOSASO.length > 0 && (d.RISCOSASO as any[]).some(r => (r.risco || '').includes('Risco Ocupacional'))).length})`);
    console.log('');

    // Agrupar por empresa + sequenciaFicha
    const grupos = new Map<string, {
      empresa: string;
      sequencia: string;
      nome: string;
      ids: any[];
      codigosPedido: Set<string>;
      funcionarioCode: string | null;
      dataAgendamento: string;
      riscosVazio: boolean;
    }>();

    for (const doc of docsParaProcessar) {
      const seq = doc.SEQUENCIAFICHA || 'SEM_SEQUENCIA';
      const key = `${doc.CODIGOEMPRESA}|${seq}`;
      if (!grupos.has(key)) {
        grupos.set(key, {
          empresa: doc.CODIGOEMPRESA,
          sequencia: seq,
          nome: doc.NOME || '',
          ids: [],
          codigosPedido: new Set<string>(),
          funcionarioCode: null,
          dataAgendamento: doc.DATAAGENDAMENTO || '',
          riscosVazio: !Array.isArray(doc.RISCOSASO) || doc.RISCOSASO.length === 0,
        });
      }
      const g = grupos.get(key)!;
      g.ids.push(doc._id);
      // Aproveita dataAgendamento do primeiro documento que tiver
      if (!g.dataAgendamento && doc.DATAAGENDAMENTO) {
        g.dataAgendamento = doc.DATAAGENDAMENTO;
      }
      if (Array.isArray(doc.RISCOSASO)) {
        for (const risco of doc.RISCOSASO) {
          if (risco.codigo) g.codigosPedido.add(risco.codigo);
        }
      }
    }

    console.log(`  Grupos únicos (empresa+sequencia): ${grupos.size}`);
    console.log('');

    // Carrega mapa do Supabase (uma vez para todo o lote)
    console.log('  Carregando riscos_config do Supabase...');
    const supabaseRiscoMap = await buildSupabaseRiscoMap();
    console.log(`  Supabase: ${supabaseRiscoMap.size} códigos mapeados`);
    console.log('');

    let totalDocsCorrigidos = 0;
    let totalRiscosCorrigidos = 0;
    let resolvidosTotal = 0;
    let placeholdersTotal = 0;

    for (const [key, grupo] of grupos) {
      console.log(`  ─────────────────────────────────────────`);

      // Buscar CODIGOFUNCIONARIO via SOC se tiver sequencia
      if (grupo.sequencia !== 'SEM_SEQUENCIA' && !grupo.funcionarioCode) {
        await delay(REQUEST_DELAY);
        const cod = await lookupFuncionarioCode(grupo.empresa, grupo.sequencia);
        grupo.funcionarioCode = cod;
      }

      console.log(`  Empresa: ${grupo.empresa}`);
      console.log(`  Funcionário: ${grupo.nome}`);
      console.log(`  Sequência: ${grupo.sequencia}`);
      console.log(`  Cód. Func. SOC: ${grupo.funcionarioCode || 'NÃO ENCONTRADO'}`);
      console.log(`  Documentos: ${grupo.ids.length}`);

      if (!grupo.funcionarioCode) {
        console.log('  ⚠️  Pulando — não foi possível identificar o funcionário no SOC');
        console.log('');
        continue;
      }

      // Se o documento tem RISCOSASO vazio, busca os códigos de risco atuais do funcionário via 193602
      if (grupo.codigosPedido.size === 0) {
        console.log(`  RISCOSASO vazio — buscando riscos do funcionário via 193602...`);
        await delay(REQUEST_DELAY);
        const riscosDoFunc = await fetchEmployeeRiskCodes(grupo.empresa, grupo.funcionarioCode);
        for (const c of riscosDoFunc) grupo.codigosPedido.add(c);

        // Fallback para 161440 (Pedido de Exame) se 193602 não retornou nada
        if (grupo.codigosPedido.size === 0 && grupo.dataAgendamento) {
          console.log(`  193602 vazio — buscando pedido de exame via 161440 (data: ${grupo.dataAgendamento})...`);
          await delay(REQUEST_DELAY);
          const riscosPedido = await fetchPedidoRiskCodes(grupo.empresa, grupo.funcionarioCode, grupo.dataAgendamento);
          for (const c of riscosPedido) grupo.codigosPedido.add(c);
        }
      }

      console.log(`  Códigos: ${Array.from(grupo.codigosPedido).sort().join(',')}`);

      const solucao = await resolverRiscos(grupo.empresa, grupo.funcionarioCode, grupo.codigosPedido, supabaseRiscoMap);

      resolvidosTotal += solucao.filter(s => !s.risco.includes('Risco Ocupacional')).length;
      placeholdersTotal += solucao.filter(s => s.risco.includes('Risco Ocupacional')).length;

      console.log(`  Riscos: ${solucao.length}`);

      for (const s of solucao) {
        const icon = s.risco.includes('Risco Ocupacional') ? '⚠️' : '✅';
        console.log(`    ${icon} ${s.codigo} → "${s.risco}" [${s.grupo}]`);
      }

      if (!isDryRun) {
        await collection.updateMany(
          { _id: { $in: grupo.ids as any } },
          { $set: { RISCOSASO: solucao } },
        );
        totalDocsCorrigidos += grupo.ids.length;
        console.log(`  -> ${grupo.ids.length} documento(s) atualizado(s)`);
      }

      console.log('');
    }

    console.log('================ RESUMO ================');
    console.log(`  Grupos processados: ${grupos.size}`);
    console.log(`  Documentos candidatos: ${docsParaProcessar.length}`);
    if (!isDryRun) console.log(`  Documentos atualizados: ${totalDocsCorrigidos}`);
    console.log(`  Riscos com nome real: ${resolvidosTotal}`);
    console.log(`  Riscos com placeholder: ${placeholdersTotal}`);
    console.log('========================================');

    if (isDryRun) {
      console.log('');
      console.log('Dry-run concluído. Execute com --apply para aplicar.');
    }
  } finally {
    await client.close();
    console.log('');
    console.log('[FIX] Conexão encerrada.');
  }
}

main().catch((err) => {
  console.error('[FIX] ERRO CRÍTICO:', err);
  process.exit(1);
});
