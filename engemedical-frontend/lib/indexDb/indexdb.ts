// lib/indexedDb.ts
import { openDB } from "idb";

import { CadastroEmpresa } from "../soc/interfaces/CadastroEmpresa";

const DB_NAME = "medlink-db";
const STORE_NAME = "companies";

export class IndexDb {
  public static async initDB() {
    return openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // a chave será o CODIGO de cada empresa
          db.createObjectStore(STORE_NAME, { keyPath: "CODIGO" });
        }
      },
    });
  }

  public static async saveCompanies(companies: CadastroEmpresa[]) {
    const db = await this.initDB();
    const tx = db.transaction(STORE_NAME, "readwrite");

    for (const company of companies) {
      await tx.store.put(company);
    }
    await tx.done;
  }

  public static async getCompanies(): Promise<CadastroEmpresa[]> {
    const db = await this.initDB();
    const list: CadastroEmpresa[] = await db.getAll(STORE_NAME);

    const listOrdened = list.sort((a, b) =>
      a.RAZAOSOCIAL.localeCompare(b.RAZAOSOCIAL, "pt-BR", {
        sensitivity: "base",
      }),
    );

    return listOrdened;
  }

  public static async getCompanyById(
    codigo: string,
  ): Promise<CadastroEmpresa | undefined> {
    const db = await this.initDB();

    return db.get(STORE_NAME, codigo);
  }

  public static async clearCompanies() {
    const db = await this.initDB();
    const tx = db.transaction(STORE_NAME, "readwrite");

    await tx.store.clear();
    await tx.done;
  }
}
