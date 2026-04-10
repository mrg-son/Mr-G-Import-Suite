// Mr.G Suite — Formation (Training) storage layer
import * as db from './db';
import type { MrgFormation as MrgFormationType } from './db';
import { triggerAutoBackup } from './autoBackup';

export type MrgFormation = MrgFormationType;
  id: string;
  client: string;
  phone: string;
  objectif: string;
  plateformes: string[];
  plateformesCustom: string;
  dateFormation: string;
  duree: number; // hours
  prix: number;
  devise: string;
  acompte: number;
  statut: 'planifiee' | 'en-cours' | 'terminee' | 'payee';
  notes: string;
  createdAt: string;
  archived?: boolean;
}

const PLATEFORMES_LIST = ['Alibaba', '1688', 'Taobao', 'Pinduoduo', 'Shein'] as const;
export { PLATEFORMES_LIST };

// In-memory cache
let formationsCache: MrgFormation[] | null = null;

export async function initFormationStorage(): Promise<void> {
  formationsCache = await db.getAllFormations();
}

export const formationStorage = {
  getFormations: (): MrgFormation[] => {
    return formationsCache || [];
  },

  setFormations: (f: MrgFormation[]) => {
    formationsCache = f;
    db.setAllFormations(f).catch(() => {});
    triggerAutoBackup();
  },

  addFormation: (f: MrgFormation) => {
    const all = formationStorage.getFormations();
    all.push(f);
    formationStorage.setFormations(all);
  },

  updateFormation: (f: MrgFormation) => {
    const all = formationStorage.getFormations().map(x => x.id === f.id ? f : x);
    formationStorage.setFormations(all);
  },

  deleteFormation: (id: string) => {
    const all = formationStorage.getFormations().filter(x => x.id !== id);
    formationStorage.setFormations(all);
  },
};
