// Mr.G Suite — Receipts storage layer
import * as db from './db';
import type { MrgReceipt as MrgReceiptType } from './db';
import { triggerAutoBackup } from './autoBackup';

export type MrgReceipt = MrgReceiptType;
export type { ReceiptSource, PaymentMode, ReceiptType } from './db';

// In-memory cache
let receiptsCache: MrgReceipt[] | null = null;

export async function initReceiptStorage(): Promise<void> {
  receiptsCache = await db.getAllReceipts();
}

export const receiptStorage = {
  getReceipts: (): MrgReceipt[] => receiptsCache || [],

  setReceipts: (r: MrgReceipt[]) => {
    receiptsCache = r;
    db.setAllReceipts(r).catch(() => {});
    triggerAutoBackup();
  },

  addReceipt: (r: MrgReceipt) => {
    const all = receiptStorage.getReceipts();
    all.push(r);
    receiptStorage.setReceipts(all);
  },

  updateReceipt: (r: MrgReceipt) => {
    const all = receiptStorage.getReceipts().map(x => x.id === r.id ? r : x);
    receiptStorage.setReceipts(all);
  },

  deleteReceipt: (id: string) => {
    const all = receiptStorage.getReceipts().filter(x => x.id !== id);
    receiptStorage.setReceipts(all);
  },

  // Auto-numbering: #YYYY-R-XXX (zero-padded, year-scoped)
  nextNumero: (): string => {
    const year = new Date().getFullYear();
    const prefix = `#${year}-R-`;
    const all = receiptStorage.getReceipts();
    const sameYear = all.filter(r => r.numero.startsWith(prefix));
    const maxN = sameYear.reduce((m, r) => {
      const n = parseInt(r.numero.replace(prefix, ''), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return `${prefix}${String(maxN + 1).padStart(3, '0')}`;
  },
};
