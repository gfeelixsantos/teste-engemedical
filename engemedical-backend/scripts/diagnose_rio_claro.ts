import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("=== INICIANDO DIAGNÓSTICO DE AGENDAMENTOS E TICKETS (RIO CLARO) ===");

  const mongoUrl = process.env.MONGO_URL;
  const mongoDbName = process.env.MONGO_DATABASE || 'cmso-agendamento';
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!mongoUrl || !supabaseUrl || !supabaseKey) {
    console.error("Erro: Variáveis de ambiente MONGO_URL, SUPABASE_URL ou SUPABASE_KEY não encontradas no .env");
    process.exit(1);
  }

  // 1. Conexão MongoDB
  const mongoClient = new MongoClient(mongoUrl);
  await mongoClient.connect();
  const db = mongoClient.db(mongoDbName);
  const schedulingsCollection = db.collection('schedulings');

  // Obter data de hoje (Formato DD/MM/YYYY)
  const todayBR = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
  
  const schedules = await schedulingsCollection.find({
    DATAAGENDAMENTO: todayBR,
    UNIDADEATENDIMENTO: { $regex: /^RIO CLARO$/, $options: 'i' }
  }).toArray();

  // 2. Conexão Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('unidade', 'RIO CLARO')
    .gte('emissao', startOfDay.toISOString())
    .lte('emissao', endOfDay.toISOString());

  if (error) {
    console.error("Erro ao buscar tickets no Supabase:", error);
    await mongoClient.close();
    process.exit(1);
  }

  // 3. Análise de correlação
  let matchCount = 0;
  let agendadoComPrefixoC = 0;
  let agendadoComPrefixoVazio = 0;

  for (const ticket of tickets || []) {
    const isPreferential = ticket.preferencial || (ticket.prefixo && ticket.prefixo.trim().toUpperCase() === 'P');
    const isAgendado = ticket.prefixo && ticket.prefixo.trim().toUpperCase() === 'C';
    const isComum = !ticket.prefixo || ticket.prefixo.trim() === '';
    
    const ticketCpfClean = String(ticket.cpf || '').replace(/\D/g, '');
    const ticketNomeNorm = String(ticket.nome || '').trim().toUpperCase();

    const matchingSchedule = schedules.find(s => {
      const scheduleCpfClean = String(s.CPFFUNCIONARIO || '').replace(/\D/g, '');
      const scheduleNomeNorm = String(s.NOME || '').trim().toUpperCase();
      
      const matchByCpf = ticketCpfClean && scheduleCpfClean && ticketCpfClean === scheduleCpfClean;
      const matchByName = ticketNomeNorm && scheduleNomeNorm && ticketNomeNorm === scheduleNomeNorm;
      
      return matchByCpf || matchByName;
    });

    if (matchingSchedule) {
      matchCount++;
      if (isAgendado) {
        agendadoComPrefixoC++;
      } else if (isComum) {
        agendadoComPrefixoVazio++;
      }
    }
  }

  console.log("\n=== RELATÓRIO DO DIAGNÓSTICO ===");
  console.log(`1. Total de agendamentos no MongoDB para hoje: ${schedules.length}`);
  console.log(`2. Total de tickets emitidos no Supabase hoje: ${tickets?.length || 0}`);
  console.log(`3. Total de tickets que correspondem a um agendamento: ${matchCount}`);
  console.log(`   - Emitidos Corretamente (Prefixo C): ${agendadoComPrefixoC}`);
  console.log(`   - Emitidos Incorretamente (Prefixo Vazio/Comum devido a terem retirado a senha comum antes do sync): ${agendadoComPrefixoVazio}`);
  
  await mongoClient.close();
}

main();
