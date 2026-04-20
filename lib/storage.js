"use client";

import { openDB } from "idb";

const DB_NAME = "pipery-dashboard";
const STORE_NAME = "documents";

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id"
        });
      }
    }
  });
}

export async function saveDocument(document) {
  const db = await getDb();
  await db.put(STORE_NAME, document);
}

export async function getSavedDocument(id) {
  const db = await getDb();
  return db.get(STORE_NAME, id);
}

export async function listSavedDocuments() {
  const db = await getDb();
  const documents = await db.getAll(STORE_NAME);
  return documents.sort((left, right) => right.savedAt.localeCompare(left.savedAt));
}
