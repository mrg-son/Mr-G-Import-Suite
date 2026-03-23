// Mr.G Suite — Design Storage Layer
import * as db from './db';

export interface PrintSection {
  enabled: boolean;
  type: string;
  typeCustom?: string;
  quantite: number;
  prixUnitaire: number;
  devise: string;
  totalImpression: number;
  inclusDansPrix: boolean;
}

export interface DesignProject {
  id: string;
  client: string;
  phone: string;
  type: 'logo-branding' | 'affiche-flyer' | 'identite-visuelle' | 'reseaux-sociaux' | 'autre';
  typeCustom?: string;
  description: string;
  prix: number;
  devise: string;
  acompte: number;
  statut: 'discussion' | 'en-cours' | 'livre' | 'paye';
  deadline: string;
  gallery: string[];
  notes: string;
  createdAt: string;
  archived?: boolean;
  impression?: PrintSection;
}

export interface DesignDevisLigne {
  id: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export interface DesignDevis {
  id: string;
  numero: string;
  client: string;
  clientPhone: string;
  devise: string;
  logoEntreprise: string;
  nomEntreprise: string;
  lignes: DesignDevisLigne[];
  acomptePourcent: number;
  acompteMontant: number;
  soldeRestant: number;
  total: number;
  statut: 'brouillon' | 'envoye' | 'accepte' | 'refuse';
  projectId: string;
  conditions: string;
  createdAt: string;
}

// ========== In-memory cache ==========
let projectsCache: DesignProject[] | null = null;
let devisCache: DesignDevis[] | null = null;

export async function initDesignStorage(): Promise<void> {
  projectsCache = await db.getAllDesignProjects();
  devisCache = await db.getAllDesignDevis();
}

export const designStorage = {
  getProjects: (): DesignProject[] => {
    return projectsCache || [];
  },
  setProjects: (p: DesignProject[]) => {
    projectsCache = p;
    db.setAllDesignProjects(p).catch(() => {});
  },

  getDevis: (): DesignDevis[] => {
    return devisCache || [];
  },
  setDevis: (d: DesignDevis[]) => {
    devisCache = d;
    db.setAllDesignDevis(d).catch(() => {});
  },
};
