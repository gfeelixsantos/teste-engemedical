import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: resolve(__dirname, '../.env') });

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--apply');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
);

async function main() {
  console.log('');
  console.log('============================================================');
  console.log('  LIMPEZA DE DUPLICATAS NO riscos_config');
  console.log(`  Modo: ${isDryRun ? 'DRY-RUN' : 'APPLY'}`);
  console.log('============================================================');

  const { data, error } = await supabase
    .from('riscos_config')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar riscos_config:', error.message);
    process.exit(1);
  }

  console.log(`\nTotal de registros: ${data.length}`);

  const codeMap: Record<string, typeof data> = {};
  for (const row of data) {
    for (const c of row.codigos || []) {
      const key = c.toString().trim();
      if (!key) continue;
      if (!codeMap[key]) codeMap[key] = [];
      codeMap[key].push(row);
    }
  }

  const duplicatas = Object.entries(codeMap).filter(([, rows]) => rows.length > 1);

  if (duplicatas.length === 0) {
    console.log('\n✅ Nenhuma duplicata encontrada.');
    return;
  }

  console.log(`\nCódigos com duplicatas: ${duplicatas.length}`);
  console.log('');

  let totalToInactivate = 0;

  for (const [code, rows] of duplicatas) {
    console.log(`  Código ${code} — ${rows.length} registros:`);

    const sorted = [...rows].sort((a, b) => {
      const aTipo = a.tipo ? 0 : 1;
      const bTipo = b.tipo ? 0 : 1;
      if (aTipo !== bTipo) return aTipo - bTipo;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const keep = sorted[0];
    const toRemove = sorted.slice(1);

    console.log(`    ✅ MANTER:  id=${keep.id} tipo=${keep.tipo || '(null)'} desc="${keep.descricao}" grupo=${keep.grupo} criado=${keep.created_at}`);
    for (const rem of toRemove) {
      const sameDesc = rem.descricao === keep.descricao && rem.grupo === keep.grupo;
      console.log(`    ${sameDesc ? '🗑️  REMOVER:' : '⚠️  REVISAR:'} id=${rem.id} tipo=${rem.tipo || '(null)'} desc="${rem.descricao}" grupo=${rem.grupo} criado=${rem.created_at}`);
      totalToInactivate++;
    }

    console.log('');
  }

  console.log(`Total a inativar: ${totalToInactivate}`);

  if (!isDryRun) {
    console.log('\nInativando duplicatas...');
    let count = 0;

    for (const [, rows] of duplicatas) {
      const sorted = [...rows].sort((a, b) => {
        const aTipo = a.tipo ? 0 : 1;
        const bTipo = b.tipo ? 0 : 1;
        if (aTipo !== bTipo) return aTipo - bTipo;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      const toRemove = sorted.slice(1);
      for (const rem of toRemove) {
        const { error: updateError } = await supabase
          .from('riscos_config')
          .update({ ativo: false, updated_at: new Date().toISOString() })
          .eq('id', rem.id);

        if (updateError) {
          console.error(`    Erro ao inativar ${rem.id}: ${updateError.message}`);
        } else {
          count++;
          console.log(`    ✅ Inativado: ${rem.id} (código ${(rem.codigos || []).join(',')})`);
        }
      }
    }

    console.log(`\n✅ ${count} registros inativados.`);
  } else {
    console.log('\nDry-run concluído. Execute com --apply para aplicar.');
  }
}

main().catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});
