// Mr.G Suite localStorage helpers

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
  status: 'en-cours' | 'arrive' | 'recupere' | 'livre';
  photos: string[];
  rating: number;
  review: string;
  suggestions: string;
  devisId: string;
  createdAt: string;
}

export interface DevisLigne {
  id: string;
  image: string;
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
} as const;

export const storage = {
  getUser: (): string | null => localStorage.getItem(KEYS.user),
  setUser: (name: string) => localStorage.setItem(KEYS.user, name),

  getPin: (): string | null => localStorage.getItem(KEYS.pin),
  setPin: (pin: string) => localStorage.setItem(KEYS.pin, btoa(pin)),
  checkPin: (pin: string): boolean => btoa(pin) === localStorage.getItem(KEYS.pin),

  getLang: (): 'fr' | 'en' => (localStorage.getItem(KEYS.lang) as 'fr' | 'en') || 'fr',
  setLang: (lang: 'fr' | 'en') => localStorage.setItem(KEYS.lang, lang),

  getTheme: (): 'dark' | 'light' => (localStorage.getItem(KEYS.theme) as 'dark' | 'light') || 'dark',
  setTheme: (theme: 'dark' | 'light') => localStorage.setItem(KEYS.theme, theme),

  getReminderDays: (): number => parseInt(localStorage.getItem(KEYS.reminderDays) || '3'),
  setReminderDays: (days: number) => localStorage.setItem(KEYS.reminderDays, String(days)),

  getAutosave: (): boolean => localStorage.getItem(KEYS.autosave) !== 'false',
  setAutosave: (on: boolean) => localStorage.setItem(KEYS.autosave, String(on)),

  getProfil: (): MrgProfil => {
    try { return JSON.parse(localStorage.getItem(KEYS.profil) || '{}'); }
    catch { return { nom: '', logo: '', devise: 'XOF' }; }
  },
  setProfil: (p: MrgProfil) => localStorage.setItem(KEYS.profil, JSON.stringify(p)),

  getOrders: (): MrgOrder[] => {
    try { return JSON.parse(localStorage.getItem(KEYS.orders) || '[]'); }
    catch { return []; }
  },
  setOrders: (o: MrgOrder[]) => localStorage.setItem(KEYS.orders, JSON.stringify(o)),

  getDevis: (): MrgDevis[] => {
    try { return JSON.parse(localStorage.getItem(KEYS.devis) || '[]'); }
    catch { return []; }
  },
  setDevis: (d: MrgDevis[]) => localStorage.setItem(KEYS.devis, JSON.stringify(d)),

  isTutorialSeen: (): boolean => localStorage.getItem(KEYS.tutorialSeen) === 'true',
  setTutorialSeen: () => localStorage.setItem(KEYS.tutorialSeen, 'true'),

  isFirstLaunch: (): boolean => !localStorage.getItem(KEYS.user),

  resetAll: () => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },
};
