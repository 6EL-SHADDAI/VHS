import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { CaptureItem } from '@/types'

interface GalleryDB extends DBSchema {
  captures: {
    key: string
    value: CaptureItem
    indexes: { 'by-date': number }
  }
}

let db: IDBPDatabase<GalleryDB> | null = null

async function getDB() {
  if (db) return db
  db = await openDB<GalleryDB>('vhs-gallery', 1, {
    upgrade(db) {
      const store = db.createObjectStore('captures', { keyPath: 'id' })
      store.createIndex('by-date', 'createdAt')
    },
  })
  return db
}

export async function saveCapture(item: CaptureItem): Promise<void> {
  const database = await getDB()
  await database.put('captures', item)
}

export async function getAllCaptures(): Promise<CaptureItem[]> {
  const database = await getDB()
  return database.getAllFromIndex('captures', 'by-date')
}

export async function deleteCapture(id: string): Promise<void> {
  const database = await getDB()
  await database.delete('captures', id)
}

export async function getCapture(id: string): Promise<CaptureItem | undefined> {
  const database = await getDB()
  return database.get('captures', id)
}
