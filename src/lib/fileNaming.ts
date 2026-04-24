// Smart file naming utility for Mr.G Suite

const sanitize = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toUpperCase()
    .slice(0, 30);

const dateStr = () => new Date().toISOString().slice(0, 10);

export const fileNames = {
  importDevisPNG: (client: string, numero: string) =>
    `MRG-IMPORT_DEVIS_${sanitize(client)}_${numero.replace('#', '')}__${dateStr()}.png`,

  importDevisPDF: (client: string, numero: string) =>
    `MRG-IMPORT_DEVIS_${sanitize(client)}_${numero.replace('#', '')}__${dateStr()}.pdf`,

  designDevisPNG: (client: string, numero: string) =>
    `MRG-DESIGN_DEVIS_${sanitize(client)}_${numero.replace('#', '')}__${dateStr()}.png`,

  designDevisPDF: (client: string, numero: string) =>
    `MRG-DESIGN_DEVIS_${sanitize(client)}_${numero.replace('#', '')}__${dateStr()}.pdf`,

  backup: () =>
    `MRG-SUITE_BACKUP_${dateStr()}.json`,

  importExcel: () =>
    `MRG-IMPORT_COMMANDES_${dateStr()}.xlsx`,

  receiptPNG: (client: string, numero: string) =>
    `MRG-SUITE_RECU_${sanitize(client)}_${numero.replace('#', '')}__${dateStr()}.png`,

  receiptPDF: (client: string, numero: string) =>
    `MRG-SUITE_RECU_${sanitize(client)}_${numero.replace('#', '')}__${dateStr()}.pdf`,
};
