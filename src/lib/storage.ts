// Mr.G Suite — Storage layer (IndexedDB backed, sync API with cache)
// On init, we load from IndexedDB into memory. Writes go to both cache and IDB.

import * as db from './db';
import { triggerAutoBackup } from './autoBackup';

export interface MrgProfil {
  nom: string;
  logo: string;
  devise: string;
}

export interface MrgOrder {
  id: string;
  client: string;
  phone: string;
  transport: 'avion' | 'bateau' | 'mix';
  realPrice: number;
  clientPrice: number;
  profit: number;
  dateOrder: string;
  dateArrival: string;
  datePickup: string;
  dateDelivery: string;
  status: 'pas-commande' | 'preparation' | 'en-cours' | 'arrive' | 'recupere' | 'livre';
  photos: string[];
  rating: number;
  review: string;
  suggestions: string;
  devisId: string;
  createdAt: string;
  archived?: boolean;
}

export interface DevisLigne {
  id: string;
  image: string; // legacy single image (kept for backward compat)
  images: string[]; // multiple images
  description: string;
  quantite: number;
  prixUnitaire: number;
  fraisExpedition: number;
  prixTotal: number;
  fraisRecupBateau: number;
  fraisRecupAvion: number;
  modeChoisi: 'bateau' | 'avion' | 'mix' | 'personnalise';
}

export interface MrgDevis {
  id: string;
  numero: string;
  client: string;
  clientPhone: string;
  devise: string;
  logoEntreprise: string;
  nomEntreprise: string;
  lignes: DevisLigne[];
  totalBateau: number;
  totalAvion: number;
  totalPersonnalise: number;
  statut: 'brouillon' | 'envoye' | 'confirme';
  orderId: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  phone: string;
  logo: string;
}

export interface MrgPaymentInfo {
  moovPhone: string;
  yasPhone: string;
  methods: PaymentMethod[];
}

// ========== In-memory cache ==========
let cache: Record<string, string> = {};
let ordersCache: MrgOrder[] | null = null;
let devisCache: MrgDevis[] | null = null;
let initialized = false;

// Initialize: migrate from localStorage then load from IDB
export async function initStorage(): Promise<void> {
  if (initialized) return;
  
  await db.migrateFromLocalStorage();
  
  // Load settings into cache
  const keys = ['mrg_user', 'mrg_pin', 'mrg_lang', 'mrg_theme', 'mrg_reminder_days', 'mrg_autosave', 'mrg_profil', 'mrg_tutorial_seen', 'mrg_payment', 'mrg_orders_disabled'];
  for (const key of keys) {
    const val = await db.getSetting(key);
    if (val !== undefined) {
      cache[key] = val;
    }
  }
  
  ordersCache = await db.getAllOrders();
  devisCache = await db.getAllDevis();
  
  initialized = true;
}

// Helper to get from cache, falling back to localStorage for pre-init reads
function get(key: string): string | null {
  if (key in cache) return cache[key];
  // Fallback for pre-init (e.g. useAppState initial render)
  return localStorage.getItem(key);
}

function set(key: string, value: string) {
  cache[key] = value;
  // Also write to localStorage as fallback
  localStorage.setItem(key, value);
  // Async write to IDB (fire-and-forget)
  db.setSetting(key, value).catch(() => {});
}

const KEYS = {
  user: 'mrg_user',
  pin: 'mrg_pin',
  lang: 'mrg_lang',
  theme: 'mrg_theme',
  reminderDays: 'mrg_reminder_days',
  autosave: 'mrg_autosave',
  orders: 'mrg_orders',
  devis: 'mrg_devis',
  profil: 'mrg_profil',
  tutorialSeen: 'mrg_tutorial_seen',
  payment: 'mrg_payment',
  ordersDisabled: 'mrg_orders_disabled',
} as const;

export const storage = {
  getUser: (): string | null => get(KEYS.user),
  setUser: (name: string) => set(KEYS.user, name),

  getPin: (): string | null => get(KEYS.pin),
  setPin: async (pin: string) => {
    const hashed = await hashPin(pin);
    set(KEYS.pin, `sha256:${hashed}`);
  },
  checkPin: async (pin: string): Promise<boolean> => {
    const stored = get(KEYS.pin);
    if (!stored) return false;
    // New scheme: prefixed sha256 hash
    if (stored.startsWith('sha256:')) {
      const hashed = await hashPin(pin);
      return stored === `sha256:${hashed}`;
    }
    // Legacy btoa scheme — verify, then transparently upgrade to sha256
    if (stored === btoa(pin)) {
      const hashed = await hashPin(pin);
      set(KEYS.pin, `sha256:${hashed}`);
      return true;
    }
    return false;
  },

  getLang: (): 'fr' | 'en' => (get(KEYS.lang) as 'fr' | 'en') || 'fr',
  setLang: (lang: 'fr' | 'en') => set(KEYS.lang, lang),

  getTheme: (): 'dark' | 'light' => (get(KEYS.theme) as 'dark' | 'light') || 'dark',
  setTheme: (theme: 'dark' | 'light') => set(KEYS.theme, theme),

  getReminderDays: (): number => parseInt(get(KEYS.reminderDays) || '3'),
  setReminderDays: (days: number) => set(KEYS.reminderDays, String(days)),

  getAutosave: (): boolean => get(KEYS.autosave) !== 'false',
  setAutosave: (on: boolean) => set(KEYS.autosave, String(on)),

  getProfil: (): MrgProfil => {
    try { return JSON.parse(get(KEYS.profil) || '{}'); }
    catch { return { nom: '', logo: '', devise: 'XOF' }; }
  },
  setProfil: (p: MrgProfil) => set(KEYS.profil, JSON.stringify(p)),

  getOrders: (): MrgOrder[] => {
    if (ordersCache !== null) return ordersCache;
    try { return JSON.parse(get(KEYS.orders) || '[]'); }
    catch { return []; }
  },
  setOrders: (o: MrgOrder[]) => {
    ordersCache = o;
    db.setAllOrders(o).catch(() => {});
    try { localStorage.setItem(KEYS.orders, JSON.stringify(o)); } catch {}
    triggerAutoBackup();
  },

  getDevis: (): MrgDevis[] => {
    if (devisCache !== null) return devisCache;
    try { return JSON.parse(get(KEYS.devis) || '[]'); }
    catch { return []; }
  },
  setDevis: (d: MrgDevis[]) => {
    devisCache = d;
    db.setAllDevis(d).catch(() => {});
    try { localStorage.setItem(KEYS.devis, JSON.stringify(d)); } catch {}
    triggerAutoBackup();
  },

  isTutorialSeen: (): boolean => get(KEYS.tutorialSeen) === 'true',
  setTutorialSeen: () => set(KEYS.tutorialSeen, 'true'),

  getOrdersDisabled: (): boolean => get(KEYS.ordersDisabled) === 'true',
  setOrdersDisabled: (disabled: boolean) => set(KEYS.ordersDisabled, String(disabled)),

  getPayment: (): MrgPaymentInfo => {
    try {
      const raw = JSON.parse(get(KEYS.payment) || '{}');
      if (!raw.methods) {
        const methods: PaymentMethod[] = [];
        if (raw.moovPhone) methods.push({ id: 'moov', name: 'Moov Africa', phone: raw.moovPhone, logo: '/images/moov-africa.jpg' });
        if (raw.yasPhone) methods.push({ id: 'yas', name: 'Yas/Mixx', phone: raw.yasPhone, logo: '/images/yas-mixx.jpg' });
        if (methods.length === 0) {
          methods.push(
            { id: 'moov', name: 'Moov Africa', phone: '+228 70 55 43 45', logo: '/images/moov-africa.jpg' },
            { id: 'yas', name: 'Yas/Mixx', phone: '+228 98 58 70 76', logo: '/images/yas-mixx.jpg' },
          );
        }
        return { moovPhone: '', yasPhone: '', methods };
      }
      return raw;
    }
    catch { return { moovPhone: '', yasPhone: '', methods: [] }; }
  },
  setPayment: (p: MrgPaymentInfo) => set(KEYS.payment, JSON.stringify(p)),

  isFirstLaunch: (): boolean => !get(KEYS.user),

  resetAll: () => {
    cache = {};
    ordersCache = null;
    devisCache = null;
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    db.resetAllDB().catch(() => {});
  },
};
