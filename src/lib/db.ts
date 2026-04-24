import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { MrgProfil, MrgOrder, MrgDevis, MrgPaymentInfo } from './storage';
import type { DesignProject, DesignDevis } from './designStorage';

export interface ExportRecord {
  id: string;
  date: string;
  type: 'json' | 'excel';
  filename: string;
  data: string;
  size: number;
}

export interface MrgFormation {
  id: string;
  client: string;
  phone: string;
  objectif: string;
  plateformes: string[];
  plateformesCustom: string;
  dateFormation: string;
  duree: number;
  prix: number;
  devise: string;
  acompte: number;
  statut: 'planifiee' | 'en-cours' | 'terminee' | 'payee';
  notes: string;
  createdAt: string;
  archived?: boolean;
}

export type ReceiptSource = 'order' | 'design-project' | 'formation' | 'devis' | 'design-devis' | 'manual';
export type PaymentMode = 'cash' | 'mobile-money' | 'virement' | 'carte' | 'autre';
export type ReceiptType = 'acompte' | 'solde' | 'total' | 'partiel';

export interface MrgReceipt {
  id: string;
  numero: string;
  date: string;
  client: string;
  clientPhone: string;
  source: ReceiptSource;
  sourceId?: string;
  sourceLabel: string;
  montant: number;
  devise: string;
  modePaiement: PaymentMode;
  modePaiementCustom?: string;
  type: ReceiptType;
  totalAttendu: number;
  totalDejaPaye: number;
  resteAPayer: number;
  notes: string;
  createdAt: string;
  archived?: boolean;
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
  design_projects: {
    key: string;
    value: DesignProject;
    indexes: { 'by-date': string };
  };
  design_devis: {
    key: string;
    value: DesignDevis;
    indexes: { 'by-date': string };
  };
  formations: {
    key: string;
    value: MrgFormation;
    indexes: { 'by-date': string };
  };
  receipts: {
    key: string;
    value: MrgReceipt;
    indexes: { 'by-date': string };
  };
}

let dbInstance: IDBPDatabase<MrgDB> | null = null;

async function getDB(): Promise<IDBPDatabase<MrgDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<MrgDB>('mrg-suite', 4, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
      if (!db.objectStoreNames.contains('orders')) {
        const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
        orderStore.createIndex('by-date', 'createdAt');
      }
      if (!db.objectStoreNames.contains('devis')) {
        const devisStore = db.createObjectStore('devis', { keyPath: 'id' });
        devisStore.createIndex('by-date', 'createdAt');
      }
      if (!db.objectStoreNames.contains('exports')) {
        const exportStore = db.createObjectStore('exports', { keyPath: 'id' });
        exportStore.createIndex('by-date', 'date');
      }
      if (!db.objectStoreNames.contains('design_projects')) {
        const dpStore = db.createObjectStore('design_projects', { keyPath: 'id' });
        dpStore.createIndex('by-date', 'createdAt');
      }
      if (!db.objectStoreNames.contains('design_devis')) {
        const ddStore = db.createObjectStore('design_devis', { keyPath: 'id' });
        ddStore.createIndex('by-date', 'createdAt');
      }
      // v3: Formations
      if (!db.objectStoreNames.contains('formations')) {
        const fStore = db.createObjectStore('formations', { keyPath: 'id' });
        fStore.createIndex('by-date', 'createdAt');
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

// ========== Design Projects ==========

export async function getAllDesignProjects(): Promise<DesignProject[]> {
  const db = await getDB();
  return db.getAll('design_projects');
}

export async function setAllDesignProjects(projects: DesignProject[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('design_projects', 'readwrite');
  await tx.store.clear();
  for (const p of projects) { await tx.store.put(p); }
  await tx.done;
}

// ========== Design Devis ==========

export async function getAllDesignDevis(): Promise<DesignDevis[]> {
  const db = await getDB();
  return db.getAll('design_devis');
}

export async function setAllDesignDevis(devisList: DesignDevis[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('design_devis', 'readwrite');
  await tx.store.clear();
  for (const d of devisList) { await tx.store.put(d); }
  await tx.done;
}


// ========== Formations ==========

export async function getAllFormations(): Promise<MrgFormation[]> {
  const db = await getDB();
  return db.getAll('formations');
}

export async function setAllFormations(formations: MrgFormation[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('formations', 'readwrite');
  await tx.store.clear();
  for (const f of formations) { await tx.store.put(f); }
  await tx.done;
}

// ========== Reset ==========

export async function resetAllDB(): Promise<void> {
  const db = await getDB();
  const stores: Array<'settings' | 'orders' | 'devis' | 'exports' | 'design_projects' | 'design_devis' | 'formations'> = ['settings', 'orders', 'devis', 'exports', 'design_projects', 'design_devis', 'formations'];
  for (const store of stores) {
    const tx = db.transaction(store, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
  const lsKeys = ['mrg_user', 'mrg_pin', 'mrg_lang', 'mrg_theme', 'mrg_reminder_days', 'mrg_autosave', 'mrg_orders', 'mrg_devis', 'mrg_profil', 'mrg_tutorial_seen', 'mrg_payment'];
  lsKeys.forEach(k => localStorage.removeItem(k));
}
