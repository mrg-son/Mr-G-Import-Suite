import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { MrgProfil, MrgOrder, MrgDevis, MrgPaymentInfo } from './storage';

export interface ExportRecord {
  id: string;
  date: string;
  type: 'json' | 'excel';
  filename: string;
  data: string; // JSON string of the backup
  size: number; // bytes
}

interface MrgDB extends DBSchema {
  settings: {
    key: string;
    value: string;
  };
  orders: {
    key: string;
    value: MrgOrder;
    indexes: { 'by-date': string };
  };
  devis: {
    key: string;
    value: MrgDevis;
    indexes: { 'by-date': string };
  };
  exports: {
    key: string;
    value: ExportRecord;
    indexes: { 'by-date': string };
  };
}

let dbInstance: IDBPDatabase<MrgDB> | null = null;

async function getDB(): Promise<IDBPDatabase<MrgDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<MrgDB>('mrg-suite', 1, {
    upgrade(db) {
      // Settings store (key-value for simple settings)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
      
      // Orders store
      if (!db.objectStoreNames.contains('orders')) {
        const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
        orderStore.createIndex('by-date', 'createdAt');
      }
      
      // Devis store
      if (!db.objectStoreNames.contains('devis')) {
        const devisStore = db.createObjectStore('devis', { keyPath: 'id' });
        devisStore.createIndex('by-date', 'createdAt');
      }
      
      // Exports history store
      if (!db.objectStoreNames.contains('exports')) {
        const exportStore = db.createObjectStore('exports', { keyPath: 'id' });
        exportStore.createIndex('by-date', 'date');
      }
    },
  });
  
  return dbInstance;
}

// ========== Settings (simple key-value) ==========

export async function getSetting(key: string): Promise<string | undefined> {
  const db = await getDB();
  return db.get('settings', key);
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put('settings', value, key);
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDB();
  await db.delete('settings', key);
}

// ========== Orders ==========

export async function getAllOrders(): Promise<MrgOrder[]> {
  const db = await getDB();
  return db.getAll('orders');
}

export async function setAllOrders(orders: MrgOrder[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('orders', 'readwrite');
  await tx.store.clear();
  for (const order of orders) {
    await tx.store.put(order);
  }
  await tx.done;
}

export async function putOrder(order: MrgOrder): Promise<void> {
  const db = await getDB();
  await db.put('orders', order);
}

export async function deleteOrder(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('orders', id);
}

// ========== Devis ==========

export async function getAllDevis(): Promise<MrgDevis[]> {
  const db = await getDB();
  return db.getAll('devis');
}

export async function setAllDevis(devisList: MrgDevis[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('devis', 'readwrite');
  await tx.store.clear();
  for (const d of devisList) {
    await tx.store.put(d);
  }
  await tx.done;
}

export async function putDevis(devis: MrgDevis): Promise<void> {
  const db = await getDB();
  await db.put('devis', devis);
}

export async function deleteDevis(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('devis', id);
}

// ========== Exports History ==========

export async function getAllExports(): Promise<ExportRecord[]> {
  const db = await getDB();
  const all = await db.getAll('exports');
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function addExport(record: ExportRecord): Promise<void> {
  const db = await getDB();
  await db.put('exports', record);
}

export async function deleteExport(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('exports', id);
}

export async function clearExports(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('exports', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

// ========== Migration from localStorage ==========

export async function migrateFromLocalStorage(): Promise<boolean> {
  const migrated = await getSetting('_migrated');
  if (migrated === 'true') return false;

  const keys = ['mrg_user', 'mrg_pin', 'mrg_lang', 'mrg_theme', 'mrg_reminder_days', 'mrg_autosave', 'mrg_profil', 'mrg_tutorial_seen', 'mrg_payment'];
  
  const db = await getDB();
  
  // Migrate simple settings
  for (const key of keys) {
    const val = localStorage.getItem(key);
    if (val !== null) {
      await db.put('settings', val, key);
    }
  }
  
  // Migrate orders
  try {
    const ordersRaw = localStorage.getItem('mrg_orders');
    if (ordersRaw) {
      const orders: MrgOrder[] = JSON.parse(ordersRaw);
      await setAllOrders(orders);
    }
  } catch {}
  
  // Migrate devis
  try {
    const devisRaw = localStorage.getItem('mrg_devis');
    if (devisRaw) {
      const devisList: MrgDevis[] = JSON.parse(devisRaw);
      await setAllDevis(devisList);
    }
  } catch {}
  
  await setSetting('_migrated', 'true');
  return true;
}

// ========== Reset ==========

export async function resetAllDB(): Promise<void> {
  const db = await getDB();
  const stores: Array<'settings' | 'orders' | 'devis' | 'exports'> = ['settings', 'orders', 'devis', 'exports'];
  for (const store of stores) {
    const tx = db.transaction(store, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
  // Also clear localStorage remnants
  const lsKeys = ['mrg_user', 'mrg_pin', 'mrg_lang', 'mrg_theme', 'mrg_reminder_days', 'mrg_autosave', 'mrg_orders', 'mrg_devis', 'mrg_profil', 'mrg_tutorial_seen', 'mrg_payment'];
  lsKeys.forEach(k => localStorage.removeItem(k));
}
