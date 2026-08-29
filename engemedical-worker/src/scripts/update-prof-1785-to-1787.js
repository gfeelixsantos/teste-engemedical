/**
 * update-prof-1785-to-1787.js
 *
 * Atualiza o cadastro do profissional MARIA JULIA TONELOTTO de 1785 para 1787 no MongoDB (coleção 'users')
 * e atualiza todos os ASOs/agendamentos pendentes ou históricos que possuem a referência ao código 1785.
 *
 * Dados do Profissional:
 *   Código SOC: 1787
 *   CPF: 386.019.628-66
 *   Conselho: 288844
 *   UF Conselho: SP
 */

const path = require('path');
const { MongoClient } = require('mongodb');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
});

const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://cmso360_db_user:123a5067b9@cmso360.nyei7qg.mongodb.net/?appName=cmso360';
const MONGO_DATABASE = process.env.MONGO_DATABASE || 'cmso-agendamento';

const PROFESSIONAL_CORRETO = {
  codigo: '1787',
  nome: 'MARIA JULIA TONELOTTO - CMSO',
  cpf: '386.019.628-66',
  conselho: '288844',
  ufconselho: 'SP',
};

async function main() {
  console.log(`\n${'='.repeat(65)}`);
  console.log(`  Atualização de Profissional no MongoDB (1785 → 1787)`);
  console.log(`${'='.repeat(65)}\n`);

  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log('✅ MongoDB conectado\n');

  try {
    const db = client.db(MONGO_DATABASE);

    // 1. Atualizar na coleção 'users'
    const usersColl = db.collection('users');
    const userQuery = {
      $or: [
        { codigo: '1785' },
        { codigo: 1785 },
        { codigoProfissional: '1785' },
        { nome: /MARIA JULIA TONELOTTO/i }
      ]
    };

    const usersEncontrados = await usersColl.find(userQuery).toArray();
    console.log(`👤 Usuários encontrados na coleção 'users': ${usersEncontrados.length}`);

    if (usersEncontrados.length > 0) {
      const resUser = await usersColl.updateMany(userQuery, {
        $set: {
          codigo: '1787',
          codigoProfissional: '1787',
          cpf: PROFESSIONAL_CORRETO.cpf,
          conselho: PROFESSIONAL_CORRETO.conselho,
          ufconselho: PROFESSIONAL_CORRETO.ufconselho,
          updatedAt: new Date()
        }
      });
      console.log(`  ✅ ${resUser.modifiedCount} registro(s) atualizado(s) em 'users' com código 1787, CPF e CRM/SP.\n`);
    } else {
      console.log('  ℹ️ Nenhum usuário encontrado com código 1785 em \'users\'. Criando/Garantindo o registro...\n');
      await usersColl.updateOne(
        { codigo: '1787' },
        {
          $set: {
            codigo: '1787',
            codigoProfissional: '1787',
            nome: PROFESSIONAL_CORRETO.nome,
            cpf: PROFESSIONAL_CORRETO.cpf,
            conselho: PROFESSIONAL_CORRETO.conselho,
            ufconselho: PROFESSIONAL_CORRETO.ufconselho,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      console.log('  ✅ Profissional registrado/atualizado na coleção \'users\' com sucesso.\n');
    }

    // 2. Atualizar na coleção 'schedulings' (ASOs e exames)
    const schedulingsColl = db.collection('schedulings');
    const schedQuery = {
      $or: [
        { 'ASOINFO.codigoProfissional': '1785' },
        { 'ASOINFO.professional.codigo': '1785' },
        { 'EXAMES.formulario.codigoMedico': '1785' },
        { 'EXAMES.formulario.codigoProfissional': '1785' },
        { 'EXAMES.codigoProfissional': '1785' }
      ]
    };

    const schedsAfetados = await schedulingsColl.countDocuments(schedQuery);
    console.log(`📊 Agendamentos afetados com código 1785 na coleção 'schedulings': ${schedsAfetados}`);

    if (schedsAfetados > 0) {
      // Atualiza ASOINFO.codigoProfissional e ASOINFO.professional
      const resSched = await schedulingsColl.updateMany(schedQuery, {
        $set: {
          'ASOINFO.codigoProfissional': '1787',
          'ASOINFO.professional': PROFESSIONAL_CORRETO,
          'ASOINFO.updatedAt': new Date()
        }
      });

      console.log(`  ✅ ${resSched.modifiedCount} agendamento(s) atualizados com ASOINFO.codigoProfissional = 1787.`);

      // Atualiza também dentro do array de EXAMES onde codigoMedico ou codigoProfissional seja 1785
      const docsComExames = await schedulingsColl.find({
        $or: [
          { 'EXAMES.formulario.codigoMedico': '1785' },
          { 'EXAMES.formulario.codigoProfissional': '1785' },
          { 'EXAMES.codigoProfissional': '1785' }
        ]
      }).toArray();

      let countExamesAtualizados = 0;
      for (const doc of docsComExames) {
        let mudou = false;
        const exames = Array.isArray(doc.EXAMES) ? doc.EXAMES : [];

        exames.forEach(ex => {
          if (ex.codigoProfissional === '1785') {
            ex.codigoProfissional = '1787';
            mudou = true;
          }
          if (ex.formulario) {
            if (ex.formulario.codigoMedico === '1785') {
              ex.formulario.codigoMedico = '1787';
              mudou = true;
            }
            if (ex.formulario.codigoProfissional === '1785') {
              ex.formulario.codigoProfissional = '1787';
              mudou = true;
            }
          }
        });

        if (mudou) {
          await schedulingsColl.updateOne(
            { _id: doc._id },
            { $set: { EXAMES: exames, updatedAt: new Date() } }
          );
          countExamesAtualizados++;
        }
      }

      console.log(`  ✅ ${countExamesAtualizados} agendamento(s) tiveram seus exames internos atualizados para o código 1787.\n`);
    } else {
      console.log('  ✅ Nenhum agendamento pendente encontrado com o código 1785.\n');
    }

    console.log(`${'='.repeat(65)}`);
    console.log('  CONCLUÍDO COM SUCESSO!');
    console.log(`${'='.repeat(65)}\n`);

  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('\n❌ ERRO FATAL:', err.message);
  process.exit(1);
});
