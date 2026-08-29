import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("=== INICIANDO SINCRONIZAÇÃO DE DATAS DE NASCIMENTO DO SOC ===");

  const mongoUrl = process.env.MONGO_URL;
  const mongoDbName = process.env.MONGO_DATABASE || 'cmso-agendamento';

  if (!mongoUrl) {
    console.error("Erro: MONGO_URL não encontrada no .env");
    process.exit(1);
  }

  // 1. Conexão MongoDB
  console.log("Conectando ao MongoDB...");
  const mongoClient = new MongoClient(mongoUrl);
  await mongoClient.connect();
  const db = mongoClient.db(mongoDbName);
  const schedulingsCollection = db.collection('schedulings');

  // Obter data de hoje (Formato DD/MM/YYYY)
  const todayBR = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  console.log(`Buscando empresas com agendamentos hoje (${todayBR}) que não possuem data de nascimento...`);
  
  const query = {
    DATAAGENDAMENTO: todayBR,
    $or: [
      { DATANASCIMENTO: "" },
      { DATANASCIMENTO: null }
    ]
  };

  const unsyncedDocs = await schedulingsCollection.find(query).toArray();
  console.log(`Encontrados ${unsyncedDocs.length} documentos sem data de nascimento.`);

  if (unsyncedDocs.length === 0) {
    console.log("Todos os agendamentos já possuem data de nascimento.");
    await mongoClient.close();
    return;
  }

  // Obter lista única de códigos de empresa
  const uniqueCompanies = Array.from(new Set(unsyncedDocs.map(d => d.CODIGOEMPRESA).filter(Boolean)));
  console.log(`Esses documentos pertencem a ${uniqueCompanies.length} empresas diferentes.`);

  let totalUpdated = 0;

  for (let idx = 0; idx < uniqueCompanies.length; idx++) {
    const empresa = uniqueCompanies[idx];
    console.log(`[${idx + 1}/${uniqueCompanies.length}] Buscando pedidos da empresa ${empresa} no SOC...`);

    const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro={"empresa":"${empresa}","codigo":"161440","chave":"3d0851191bdd7e498167","tipoSaida":"json","paramSequencial":"","sequenciaFicha":"","funcionarioInicio":"1","funcionarioFim":"999999999","paramData":"1","dataInicio":"${todayBR}","dataFim":"${todayBR}","paramFunc":"","cpffuncionario":"","nomefuncionario":"","codpresta":"","nomepresta":"","paramPresta":"","codunidade":"","nomeunidade":"","paramUnidade":""}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`  -> Erro HTTP: ${response.status}`);
        continue;
      }

      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);

      if (decoded.startsWith('De')) {
        console.log(`  -> Nenhum registro retornado pelo SOC.`);
        continue;
      }

      const pedidos = JSON.parse(decoded);
      console.log(`  -> Recebidos ${pedidos.length} registros do SOC.`);

      for (const pedido of pedidos) {
        const codFuncionario = pedido.CODIGOFUNCIONARIO;
        const dataNascimento = pedido.DATANASCIMENTO;
        const sequenciaFicha = pedido.SEQUENCIAFICHA;

        if (codFuncionario && dataNascimento) {
          // Atualiza todos os agendamentos correspondentes
          const updateResult = await schedulingsCollection.updateMany(
            {
              DATAAGENDAMENTO: todayBR,
              CODIGOEMPRESA: empresa,
              COD: String(codFuncionario) // No Mongo, o código do funcionário é armazenado em "CODIGO" ou "COD"
            },
            {
              $set: {
                DATANASCIMENTO: dataNascimento,
                SEQUENCIAFICHA: sequenciaFicha || "",
                AUTENTICACAOATENDIMENTO: { metodo: 'SOC' }
              }
            }
          );
          
          // E também atualiza usando a chave "CODIGO" por segurança
          const updateResult2 = await schedulingsCollection.updateMany(
            {
              DATAAGENDAMENTO: todayBR,
              CODIGOEMPRESA: empresa,
              CODIGO: String(codFuncionario)
            },
            {
              $set: {
                DATANASCIMENTO: dataNascimento,
                SEQUENCIAFICHA: sequenciaFicha || "",
                AUTENTICACAOATENDIMENTO: { metodo: 'SOC' }
              }
            }
          );

          const matchedCount = updateResult.matchedCount + updateResult2.matchedCount;
          const modifiedCount = updateResult.modifiedCount + updateResult2.modifiedCount;

          if (modifiedCount > 0) {
            console.log(`  -> Sincronizado: ${pedido.NOMEFUNCIONARIO} (Nascimento: ${dataNascimento})`);
            totalUpdated += modifiedCount;
          }
        }
      }
    } catch (err) {
      console.error(`  -> Falha no processamento da empresa ${empresa}:`, err);
    }

    // Delay leve para respeitar a API do SOC
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n=== SINCRONIZAÇÃO CONCLUÍDA ===`);
  console.log(`Total de agendamentos atualizados com data de nascimento: ${totalUpdated}`);

  await mongoClient.close();
}

main();
