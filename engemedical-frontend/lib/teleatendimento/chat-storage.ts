import { openDB } from "idb";

export interface TeleatendimentoChatMessage {
  sessionId: string;
  messageId: string;
  authorRole: "PROFESSIONAL" | "EMPLOYEE";
  authorName: string;
  text: string;
  sentAt: string;
}

const DB_NAME = "cmso360-teleatendimento";
const STORE_NAME = "chat_messages";

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "messageId",
        });
        store.createIndex("sessionId", "sessionId");
      }
    },
  });
}

export async function listChatMessages(sessionId: string) {
  try {
    const db = await getDb();
    return await db.getAllFromIndex(STORE_NAME, "sessionId", sessionId);
  } catch (err) {
    console.warn("IndexedDB not available for chat storage:", err);
    return [];
  }
}

export async function saveChatMessage(message: TeleatendimentoChatMessage) {
  try {
    const db = await getDb();
    await db.put(STORE_NAME, message);
  } catch (err) {
    console.warn("IndexedDB not available to save chat message:", err);
  }
}
