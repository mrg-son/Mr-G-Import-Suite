import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { t } from '@/lib/i18n';
import { designStorage, DesignDevis, DesignDevisLigne, DesignProject } from '@/lib/designStorage';
import { storage } from '@/lib/storage';
import { Plus, Trash2, ArrowLeft, FileText, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';

interface Props { lang: 'fr' | 'en'; onNavigate: (tab: string) => void; }

const statusOptions = [
  { value: 'brouillon', label: { fr: 'Brouillon', en: 'Draft' }, color: 'bg-muted-foreground/20 text-muted-foreground' },
  { value: 'envoye', label: { fr: 'Envoyé', en: 'Sent' }, color: 'bg-bleu-mer/15 text-bleu-mer' },
  { value: 'accepte', label: { fr: 'Accepté', en: 'Accepted' }, color: 'bg-emerald-500/15 text-emerald-400' },
  { value: 'refuse', label: { fr: 'Refusé', en: 'Refused' }, color: 'bg-destructive/15 text-destructive' },
];

const emptyLigne = (): DesignDevisLigne => ({
  id: crypto.randomUUID(), description: '', quantite: 1, prixUnitaire: 0, total: 0,
});

const DesignDevisMaker = ({ lang, onNavigate }: Props) => {
  const { toast } = useToast();
  const profil = storage.getProfil();
  const devisList = designStorage.getDevis();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const generateNumero = () => {
    const year = new Date().getFullYear();
    const count = devisList.filter(d => d.numero.includes(`${year}-D-`)).length + 1;
    return `#${year}-D-${String(count).padStart(3, '0')}`;
  };

  const [form, setForm] = useState({
    client: '', clientPhone: '', devise: profil.devise || 'XOF',
    lignes: [emptyLigne()] as DesignDevisLigne[],
    acomptePourcent: 50, statut: 'brouillon' as DesignDevis['statut'],
    conditions: '', numero: generateNumero(),
  });

  const total = form.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const acompteMontant = Math.round(total * form.acomptePourcent / 100);
  const solde = total - acompteMontant;

  const updateLigne = (idx: number, field: string, value: any) => {
    setForm(f => {
      const lignes = [...f.lignes];
      (lignes[idx] as any)[field] = value;
      lignes[idx].total = lignes[idx].quantite * lignes[idx].prixUnitaire;
      return { ...f, lignes };
    });
  };

  const handleSave = () => {
    const all = designStorage.getDevis();
    const devis: DesignDevis = {
      id: editId || crypto.randomUUID(),
      numero: form.numero,
      client: form.client, clientPhone: form.clientPhone,
      devise: form.devise, logoEntreprise: profil.logo, nomEntreprise: profil.nom,
      lignes: form.lignes, acomptePourcent: form.acomptePourcent,
      acompteMontant, soldeRestant: solde, total,
      statut: form.statut, projectId: '', conditions: form.conditions,
      createdAt: editId ? (all.find(d => d.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };
    if (editId) {
      const idx = all.findIndex(d => d.id === editId);
      if (idx >= 0) all[idx] = devis; else all.push(devis);
    } else {
      all.push(devis);
    }
    designStorage.setDevis(all);
    toast({ title: t('devisSaved', lang) });
    setView('list');
  };

  const handleEdit = (d: DesignDevis) => {
    setForm({ client: d.client, clientPhone: d.clientPhone, devise: d.devise, lignes: d.lignes, acomptePourcent: d.acomptePourcent, statut: d.statut, conditions: d.conditions, numero: d.numero });
    setEditId(d.id); setView('form');
  };

  const handleDelete = (id: string) => {
    designStorage.setDevis(designStorage.getDevis().filter(d => d.id !== id));
    setView('list');
  };

  const handleConvertToProject = (d: DesignDevis) => {
    const projects = designStorage.getProjects();
    const project: DesignProject = {
      id: crypto.randomUUID(), client: d.client, phone: d.clientPhone,
      type: 'autre', description: d.lignes.map(l => l.description).join(', '),
      prix: d.total, devise: d.devise, acompte: d.acompteMontant,
      statut: 'en-cours', deadline: '', gallery: [], notes: `Converti du devis ${d.numero}`,
      createdAt: new Date().toISOString(),
    };
    projects.push(project);
    designStorage.setProjects(projects);
    // Update devis to link project
    const all = designStorage.getDevis();
    const idx = all.findIndex(x => x.id === d.id);
    if (idx >= 0) { all[idx].projectId = project.id; designStorage.setDevis(all); }
    toast({ title: lang === 'fr' ? 'Converti en projet' : 'Converted to project' });
  };

  const handleExport = async (type: 'pdf' | 'png') => {
    if (!exportRef.current) return;
    const canvas = await html2canvas(exportRef.current, { backgroundColor: '#111', scale: 2 });
    const link = document.createElement('a');
    link.download = `devis-design-${form.numero}.${type === 'pdf' ? 'png' : 'png'}`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleNew = () => {
    setForm({ client: '', clientPhone: '', devise: profil.devise || 'XOF', lignes: [emptyLigne()], acomptePourcent: 50, statut: 'brouillon', conditions: '', numero: generateNumero() });
    setEditId(null); setView('form');
  };

  // FORM VIEW
  if (view === 'form') {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-24 md:pt-20 pb-8">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4 font-satoshi text-sm">
          <ArrowLeft size={16} /> {t('back', lang)}
        </button>

        <div ref={exportRef} className="glass-card p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/30 pb-4">
            <div className="flex items-center gap-3">
              {profil.logo && <img src={profil.logo} alt="" className="w-12 h-12 rounded-lg object-cover" />}
              <div><p className="font-clash font-bold text-lg">{profil.nom || 'Mr.G Design'}</p></div>
            </div>
            <div className="text-right">
              <p className="font-clash font-bold text-or">{form.numero}</p>
              <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value as any }))} className="mt-1 px-2 py-1 rounded-lg bg-secondary/50 border border-border/30 text-xs font-satoshi">
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label[lang]}</option>)}
              </select>
            </div>
          </div>

          {/* Client info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-satoshi">{t('clientName', lang)}</label>
              <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-satoshi">{t('clientPhone', lang)}</label>
              <input value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-satoshi">{t('currency', lang)}</label>
              <select value={form.devise} onChange={e => setForm(f => ({ ...f, devise: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm">
                <option>XOF</option><option>EUR</option><option>USD</option>
              </select>
            </div>
          </div>

          {/* Lines */}
          <div>
            <h3 className="font-clash font-bold text-sm mb-3">{lang === 'fr' ? 'Prestations' : 'Services'}</h3>
            {form.lignes.map((l, i) => (
              <div key={l.id} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-5">
                  {i === 0 && <label className="text-xs text-muted-foreground">{t('description', lang)}</label>}
                  <input value={l.description} onChange={e => updateLigne(i, 'description', e.target.value)} className="w-full px-2 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi" />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="text-xs text-muted-foreground">{t('quantity', lang)}</label>}
                  <input type="number" value={l.quantite} onChange={e => updateLigne(i, 'quantite', Number(e.target.value))} className="w-full px-2 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi" />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="text-xs text-muted-foreground">{t('unitPrice', lang)}</label>}
                  <input type="number" value={l.prixUnitaire || ''} onChange={e => updateLigne(i, 'prixUnitaire', Number(e.target.value))} className="w-full px-2 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi" />
                </div>
                <div className="col-span-2 text-right font-clash font-bold text-sm pt-1">
                  {(l.quantite * l.prixUnitaire).toLocaleString()}
                </div>
                <div className="col-span-1">
                  {form.lignes.length > 1 && (
                    <button onClick={() => setForm(f => ({ ...f, lignes: f.lignes.filter((_, j) => j !== i) }))} className="p-1 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={() => setForm(f => ({ ...f, lignes: [...f.lignes, emptyLigne()] }))} className="flex items-center gap-1 text-or text-sm font-satoshi hover:underline mt-2">
              <Plus size={14} /> {t('addLine', lang)}
            </button>
          </div>

          {/* Payment conditions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/30 pt-4">
            <div>
              <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? '% Acompte' : '% Deposit'}</label>
              <input type="number" value={form.acomptePourcent} onChange={e => setForm(f => ({ ...f, acomptePourcent: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm" min={0} max={100} />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{lang === 'fr' ? 'Acompte' : 'Deposit'}</p>
              <p className="font-clash font-bold text-or text-lg">{acompteMontant.toLocaleString()} {form.devise}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{lang === 'fr' ? 'Solde restant' : 'Remaining'}</p>
              <p className="font-clash font-bold text-lg">{solde.toLocaleString()} {form.devise}</p>
            </div>
          </div>

          {/* Total */}
          <div className="text-right border-t border-border/30 pt-4">
            <p className="text-sm text-muted-foreground">{t('totalGeneral', lang)}</p>
            <p className="font-clash font-bold text-3xl text-or">{total.toLocaleString()} {form.devise}</p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? 'Conditions' : 'Terms'}</label>
            <textarea value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} rows={2} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm resize-none" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={handleSave} disabled={!form.client} className="px-6 py-2 rounded-xl bg-or text-accent-foreground font-clash font-bold text-sm uppercase hover:opacity-90 disabled:opacity-40">
            {t('saveDevis', lang)}
          </button>
          <button onClick={() => handleExport('png')} className="px-4 py-2 rounded-xl bg-secondary text-foreground font-satoshi text-sm hover:bg-secondary/80">
            <ImageIcon size={14} className="inline mr-1" /> {t('exportPNG', lang)}
          </button>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 md:pt-20 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-clash font-bold uppercase tracking-wider">{t('devisTitle', lang)}</h1>
        <button onClick={handleNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-or text-accent-foreground font-clash font-bold text-sm uppercase hover:opacity-90">
          <Plus size={16} /> {t('newDevis', lang)}
        </button>
      </motion.div>

      {devisList.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground font-satoshi">{t('noDevis', lang)}</div>
      ) : (
        <div className="space-y-3">
          {[...devisList].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((d, i) => {
            const statusObj = statusOptions.find(s => s.value === d.statut);
            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-clash font-bold text-or">{d.numero}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusObj?.color}`}>{statusObj?.label[lang]}</span>
                  </div>
                  <p className="text-sm font-satoshi">{d.client} · {d.total.toLocaleString()} {d.devise}</p>
                </div>
                <div className="flex items-center gap-1">
                  {d.statut === 'accepte' && !d.projectId && (
                    <button onClick={() => handleConvertToProject(d)} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-satoshi hover:bg-emerald-500/25">
                      {lang === 'fr' ? '→ Projet' : '→ Project'}
                    </button>
                  )}
                  <button onClick={() => handleEdit(d)} className="p-2 rounded-lg hover:bg-or/15 text-or"><FileText size={16} /></button>
                  <button onClick={() => handleDelete(d.id)} className="p-2 rounded-lg hover:bg-destructive/15 text-destructive"><Trash2 size={16} /></button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DesignDevisMaker;
