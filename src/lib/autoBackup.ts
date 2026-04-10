// Auto-backup system — triggers on every data save when autosave is enabled
import { storage } from './storage';
import { designStorage } from './designStorage';
import { formationStorage } from './formationStorage';
import { addExport } from './db';
import { fileNames } from './fileNaming';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function triggerAutoBackup() {
  if (!storage.getAutosave()) return;

  // Debounce to avoid multiple rapid saves
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      const data = {
        user: storage.getUser(),
        profil: storage.getProfil(),
        orders: storage.getOrders(),
        devis: storage.getDevis(),
        designProjects: designStorage.getProjects(),
        designDevis: designStorage.getDevis(),
        formations: formationStorage.getFormations(),
        lang: storage.getLang(),
        theme: storage.getTheme(),
        reminderDays: storage.getReminderDays(),
        autosave: storage.getAutosave(),
        exportedAt: new Date().toISOString(),
      };
      const jsonStr = JSON.stringify(data, null, 2);
      const filename = fileNames.backup();

      await addExport({
        id: Math.random().toString(36).slice(2, 10),
        date: new Date().toISOString(),
        type: 'json',
        filename,
        data: jsonStr,
        size: new Blob([jsonStr]).size,
      });
    } catch {
      // Silent fail for auto-backup
    }
  }, 2000);
}
