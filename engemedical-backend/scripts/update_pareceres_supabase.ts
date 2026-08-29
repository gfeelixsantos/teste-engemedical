import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: SUPABASE_URL ou SUPABASE_KEY não configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const COMPACT_ORIENTACOES = [
  {
    categoria: "Cardiologia",
    texto_tela: "HAS / Acompanhamento com cardiologista",
    texto_email: "O colaborador apresenta diagnóstico de HAS e/ou alteração cardiovascular, devendo manter tratamento e acompanhamento médico periódico com cardiologista.",
    libera_cliente: false,
    ordem: 1,
    ativo: true
  },
  {
    categoria: "Visão / Oftalmologia",
    texto_tela: "Uso de óculos / Acompanhamento com oftalmologista",
    texto_email: "Recomendamos que o colaborador realize acompanhamento periódico com médico oftalmologista, mantendo o uso de óculos de grau durante as atividades laborais.",
    libera_cliente: true,
    ordem: 2,
    ativo: true
  },
  {
    categoria: "Visão / Oftalmologia",
    texto_tela: "Visão monocular — apto com orientação",
    texto_email: "O colaborador apresenta visão monocular e está apto ao trabalho, devendo manter acompanhamento oftalmológico regular e respeitar as orientações médicas quanto a atividades que demandem acuidade visual.",
    libera_cliente: false,
    ordem: 3,
    ativo: true
  },
  {
    categoria: "Trabalho em Altura",
    texto_tela: "Apto para trabalho em altura — utilizar cinto",
    texto_email: "O colaborador está apto para trabalho em altura, sendo obrigatório o uso do cinto de segurança e demais equipamentos de proteção individual (EPI) conforme NR-35.",
    libera_cliente: true,
    ordem: 4,
    ativo: true
  },
  {
    categoria: "Trabalho em Altura",
    texto_tela: "Inapto para trabalho em altura",
    texto_email: "O colaborador está inapto para atividades em altura, devendo a empresa realocá-lo para atividades compatíveis com suas condições de saúde.",
    libera_cliente: false,
    ordem: 5,
    ativo: true
  },
  {
    categoria: "Restrições Físicas",
    texto_tela: "Não carregar peso excessivo",
    texto_email: "O colaborador não deve realizar o transporte manual de cargas acima do limite recomendado, conforme avaliação médica.",
    libera_cliente: true,
    ordem: 6,
    ativo: true
  },
  {
    categoria: "Acompanhamento / Retorno",
    texto_tela: "Retorno em 30 dias para reavaliação",
    texto_email: "O colaborador deverá retornar em 30 dias para reavaliação das condições de saúde e nova avaliação ocupacional.",
    libera_cliente: true,
    ordem: 7,
    ativo: true
  },
  {
    categoria: "PCD / Deficiência",
    texto_tela: "PCD — deficiência auditiva",
    texto_email: "O colaborador se enquadra como Pessoa com Deficiência (PCD), apresentando deficiência auditiva, devendo ser realizadas as adequações necessárias no ambiente de trabalho.",
    libera_cliente: false,
    ordem: 8,
    ativo: true
  }
];

async function run() {
  try {
    console.log('Buscando todos os registros atuais no Supabase...');
    const { data: existing, error: fetchError } = await supabase
      .from('parecer_orientacoes')
      .select('id');

    if (fetchError) {
      throw fetchError;
    }

    if (existing && existing.length > 0) {
      console.log(`Deletando ${existing.length} registros existentes por ID para evitar problemas de RLS...`);
      const ids = existing.map(x => x.id);
      
      const { error: deleteError } = await supabase
        .from('parecer_orientacoes')
        .delete()
        .in('id', ids);

      if (deleteError) {
        throw deleteError;
      }
      console.log('Registros antigos deletados com sucesso.');
    } else {
      console.log('Nenhum registro antigo encontrado.');
    }

    console.log('Inserindo 8 pareceres altamente otimizados...');
    const { data, error: insertError } = await supabase
      .from('parecer_orientacoes')
      .insert(COMPACT_ORIENTACOES)
      .select();

    if (insertError) {
      throw insertError;
    }

    console.log('Pareceres inseridos com sucesso! Total:', data?.length);
    data?.forEach((p, idx) => {
      console.log(`${idx + 1}. [${p.categoria}] ${p.texto_tela} (libera_cliente: ${p.libera_cliente})`);
    });
  } catch (error) {
    console.error('Erro na execução:', error);
  }
}

run();
