/**
 * Saneamento de registros biométricos inválidos
 *
 * Uso:
 *   npx ts-node scripts/saneamento-biometria.ts           # equivale a --dry-run
 *   npx ts-node scripts/saneamento-biometria.ts --dry-run  # lista afetados, NÃO altera
 *   npx ts-node scripts/saneamento-biometria.ts --apply    # aplica as alterações
 *
 * Este script:
 * 1. Localiza biometrias com cpfHash vazio (e3b0c442... = hash de string vazia)
 * 2. Localiza biometrias com dataNascimentoHash null ou vazio
 * 3. Localiza registros ATIVO sem template ou sem templateVersion
 * 4. Localiza registros ATIVO com template fake (imagem PNG/base64)
 * 5. Atualiza para status INATIVO (soft-block, preserva auditoria)
 * 6. Alerta sobre necessidade de recriar índice único parcial
 */

import { MongoClient } from 'mongodb';

const EMPTY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

// Prefixo base64 de imagem PNG (template fake)
const PNG_BASE64_PREFIX = 'iVBORw0KGgo';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--apply');

async function main() {
  const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const MONGO_DATABASE = process.env.MONGO_DATABASE || 'cms0360';

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SANEAMENTO DE BIOMETRIAS');
  console.log(`  Modo: ${isDryRun ? '🔎 DRY-RUN (sem alterações)' : '⚠️  APPLY (aplicando alterações)'}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Banco: ${MONGO_URL}/${MONGO_DATABASE}`);
  console.log('');

  const client = new MongoClient(MONGO_URL);
  await client.connect();

  try {
    const db = client.db(MONGO_DATABASE);
    const collection = db.collection('biometrias');

    // ─── Critérios de inativação ────────────────────────────────────────
    const criterioIdentidadeInsuficiente = {
      status: 'ATIVO',
      $or: [
        { cpfHash: '' },
        { cpfHash: EMPTY_HASH },
        { cpfHash: { $exists: false } },
        { dataNascimentoHash: null },
        { dataNascimentoHash: '' },
        { dataNascimentoHash: { $exists: false } },
      ],
    };

    const criterioSemTemplate = {
      status: 'ATIVO',
      $and: [
        { cpfHash: { $exists: true, $nin: ['', EMPTY_HASH] } },
        { dataNascimentoHash: { $exists: true, $nin: [null, ''] } },
      ],
      $or: [
        { template: { $exists: false } },
        { template: null },
        { template: '' },
        { templateVersion: { $exists: false } },
        { templateVersion: null },
        { templateVersion: '' },
      ],
    };

    const criterioTemplateFake = {
      status: 'ATIVO',
      $and: [
        { cpfHash: { $exists: true, $nin: ['', EMPTY_HASH] } },
        { dataNascimentoHash: { $exists: true, $nin: [null, ''] } },
      ],
      template: { $regex: `^${PNG_BASE64_PREFIX}` },
    };

    // ─── Contagens ───────────────────────────────────────────────────────
    const totalAtivos = await collection.countDocuments({ status: 'ATIVO' });
    const countIdentidade = await collection.countDocuments(criterioIdentidadeInsuficiente);
    const countSemTemplate = await collection.countDocuments(criterioSemTemplate);
    const countFake = await collection.countDocuments(criterioTemplateFake);
    const totalAfetados = countIdentidade + countSemTemplate + countFake;

    console.log(`  Total ATIVO na coleção   : ${totalAtivos}`);
    console.log(`  Identidade insuficiente  : ${countIdentidade}`);
    console.log(`  ATIVO sem template válido: ${countSemTemplate}`);
    console.log(`  ATIVO com template fake  : ${countFake}`);
    console.log(`  ──────────────────────────────────────`);
    console.log(`  Total a inativar         : ${totalAfetados}`);
    console.log('');

    if (totalAfetados === 0) {
      console.log('✅ Nenhum registro problemático encontrado. Base saudável.');
      return;
    }

    // ─── Listar registros afetados (sempre, em dry-run ou apply) ────────
    const grupos = [
      { label: 'Identidade insuficiente', filtro: criterioIdentidadeInsuficiente, motivo: 'SANEAMENTO: cpfHash ou dataNascimentoHash ausentes/vazios' },
      { label: 'Sem template válido', filtro: criterioSemTemplate, motivo: 'SANEAMENTO: ATIVO sem template ou sem templateVersion' },
      { label: 'Template fake (imagem)', filtro: criterioTemplateFake, motivo: 'SANEAMENTO: template é imagem PNG (não é template biométrico real)' },
    ];

    for (const grupo of grupos) {
      const registros = await collection.find(grupo.filtro, {
        projection: { _id: 1, dedo: 1, cpfHash: 1, dataNascimentoHash: 1, status: 1, templateVersion: 1 }
      }).toArray();

      if (registros.length === 0) continue;

      console.log(`  📋 ${grupo.label} (${registros.length} registros):`);
      for (const reg of registros) {
        const cpfPrefix = reg.cpfHash ? reg.cpfHash.slice(0, 16) + '...' : '(ausente)';
        const dnPrefix = reg.dataNascimentoHash ? reg.dataNascimentoHash.slice(0, 16) + '...' : '(nulo)';
        console.log(
          `     _id=${reg._id}  dedo=${reg.dedo || 'N/A'}  cpfHash=${cpfPrefix}  dataNascHash=${dnPrefix}  templateVersion=${reg.templateVersion || '(ausente)'}`
        );
      }
      console.log('');
    }

    if (isDryRun) {
      console.log('🔎 DRY-RUN: Nenhuma alteração aplicada.');
      console.log('   Para aplicar, execute com --apply:');
      console.log('   npx ts-node scripts/saneamento-biometria.ts --apply');
      console.log('');
      return;
    }

    // ─── APPLY: inativar registros ────────────────────────────────────
    console.log('⚠️  Aplicando inativações...');
    console.log('');

    let totalModificados = 0;

    for (const grupo of grupos) {
      const result = await collection.updateMany(
        grupo.filtro,
        {
          $set: {
            status: 'INATIVO',
            saneadoEm: new Date(),
            motivoInativacao: grupo.motivo,
          },
        }
      );
      console.log(`  ✓ ${grupo.label}: ${result.modifiedCount} inativados`);
      totalModificados += result.modifiedCount;
    }

    console.log('');
    console.log(`  Total modificados: ${totalModificados}`);

    // ─── Verificação pós-apply ───────────────────────────────────────
    const restantes = await collection.countDocuments({
      status: 'ATIVO',
      $or: [
        { cpfHash: '' },
        { cpfHash: EMPTY_HASH },
        { cpfHash: { $exists: false } },
        { dataNascimentoHash: null },
        { dataNascimentoHash: '' },
        { dataNascimentoHash: { $exists: false } },
        { template: { $in: [null, '', undefined as any] } },
        { template: { $regex: `^${PNG_BASE64_PREFIX}` } },
      ],
    });

    const ativosValidos = await collection.countDocuments({
      status: 'ATIVO',
      cpfHash: { $exists: true, $nin: ['', EMPTY_HASH] },
      dataNascimentoHash: { $exists: true, $nin: [null, ''] },
      template: { $exists: true, $ne: '', $not: /^iVBORw0KGgo/ },
      templateVersion: { $exists: true, $ne: '' },
    });

    console.log('');
    console.log(`  Registros problemáticos restantes: ${restantes}`);
    console.log(`  Registros ATIVO válidos (identidade + template): ${ativosValidos}`);
    console.log('');

    if (restantes === 0) {
      console.log('✅ SUCESSO: Base saneada. Nenhum registro ATIVO inválido restante.');
    } else {
      console.log('⚠️  ATENÇÃO: Ainda existem registros problemáticos. Verifique manualmente.');
    }

    console.log('');
    console.log('─────────────────────────────────────────────────────────');
    console.log('⚠️  PRÓXIMO PASSO OBRIGATÓRIO:');
    console.log('   Recriar o índice único parcial na coleção biometrias');
    console.log('   para garantir que somente registros com identidade forte');
    console.log('   estejam sob a restrição de unicidade.');
    console.log('');
    console.log('   Exemplo (MongoDB Shell):');
    console.log('   db.biometrias.dropIndex("unique_ativo_identity")');
    console.log('   db.biometrias.createIndex(');
    console.log('     { cpfHash: 1, dataNascimentoHash: 1, dedo: 1 },');
    console.log('     {');
    console.log('       unique: true,');
    console.log('       partialFilterExpression: {');
    console.log('         status: "ATIVO",');
    console.log('         cpfHash: { $exists: true, $nin: ["", "e3b0c442..."] },');
    console.log('         dataNascimentoHash: { $exists: true, $nin: [null, ""] }');
    console.log('       },');
    console.log('       name: "unique_ativo_identity"');
    console.log('     }');
    console.log('   )');
    console.log('─────────────────────────────────────────────────────────');

  } finally {
    await client.close();
    console.log('');
    console.log('[SANEAMENTO] Conexão encerrada.');
  }
}

main().catch((err) => {
  console.error('[SANEAMENTO] ERRO CRÍTICO:', err);
  process.exit(1);
});
