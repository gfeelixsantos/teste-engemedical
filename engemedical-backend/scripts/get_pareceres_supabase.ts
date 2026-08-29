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

async function run() {
  const { data, error } = await supabase
    .from('parecer_orientacoes')
    .select('*')
    .order('categoria', { ascending: true })
    .order('ordem', { ascending: true });

  if (error) {
    console.error('Erro ao buscar pareceres:', error);
    return;
  }

  console.log(`Total de registros no Supabase: ${data.length}`);
  data.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.id}] [${p.categoria}] ${p.texto_tela} (libera_cliente: ${p.libera_cliente}, ativo: ${p.ativo})`);
  });
}

run();
