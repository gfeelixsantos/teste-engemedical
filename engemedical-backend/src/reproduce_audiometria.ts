import { MongoClient, ObjectId } from 'mongodb';
import { QueueServiceClient } from '@azure/storage-queue';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URL = process.env.MONGO_URL || '';
const AZURE_CONNECTION_STRING =
  process.env.AZURE_CONNECTION_STRING_BLOB ||
  process.env.AZURE_STORAGE_CONNECTION_STRING ||
  '';
const QUEUE_NAME = 'resultados-exames'; // The synchronized queue

async function reproduce() {
  console.log('--- Starting Reproduction Script ---');
  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    const db = client.db(process.env.MONGO_DATABASE || 'cmso-agendamento');
    const coll = db.collection(process.env.MONGO_COLLECTION || 'schedulings');

    const schedulingId = '69c3bc3cf38584d681cf406c';
    const doc = await coll.findOne({ _id: new ObjectId(schedulingId) });

    if (!doc) {
      console.error('Document not found:', schedulingId);
      return;
    }

    console.log('Found Document:', doc.NOME);

    const audiometria = doc.EXAMES.find((e: any) => e.grupo === 'Audiometria');
    if (!audiometria) {
      console.error('Audiometria not found in EXAMES');
      return;
    }

    console.log('Current Audiometria Status:', audiometria.status);
    console.log('Current Audiometria URL:', audiometria.url || 'None');

    // Professional info
    const profissional = {
      codigo: '1407',
      nome: 'MARIA APARECIDA',
      cpf: '', // Add CPF if needed for BRY
    };

    const message = {
      grupo: 'Audiometria',
      funcionario: doc,
      profissional: profissional,
      updateAt: new Date(),
      assinaturaDigitalObrigatoria: true,
      credentials: {
        pin: process.env.BRYKMS_PIN || '123456',
      },
    };

    const queueServiceClient = QueueServiceClient.fromConnectionString(
      AZURE_CONNECTION_STRING,
    );
    const queueClient = queueServiceClient.getQueueClient(QUEUE_NAME);

    console.log('Enqueuing message to:', QUEUE_NAME);
    const sendMessageResponse = await queueClient.sendMessage(
      Buffer.from(JSON.stringify(message)).toString('base64'),
    );

    console.log('Success! MessageId:', sendMessageResponse.messageId);
    console.log('The worker should now pick this up and process it.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

reproduce();
