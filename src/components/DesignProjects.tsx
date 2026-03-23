import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/lib/i18n';
import { designStorage, DesignProject, PrintSection } from '@/lib/designStorage';
import { storage } from '@/lib/storage';
import { Plus, Search, Phone, Edit, Archive, ArrowLeft, X, Trash2, Image as ImageIcon, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props { lang: 'fr' | 'en'; }

const typeOptions = [
  { value: 'logo-branding', label: { fr: 'Logo / Branding', en: 'Logo / Branding' } },
  { value: 'affiche-flyer', label: { fr: 'Affiche / Flyer', en: 'Poster / Flyer' } },
  { value: 'identite-visuelle', label: { fr: 'Identité visuelle complète', en: 'Full visual identity' } },
  { value: 'reseaux-sociaux', label: { fr: 'Réseaux sociaux', en: 'Social media' } },
  { value: 'autre', label: { fr: 'Autre (préciser)', en: 'Other (specify)' } },
];

const printTypeOptions = [
  { value: 'bache', label: { fr: 'Bâche', en: 'Banner' } },
  { value: 'affiche', label: { fr: 'Affiche', en: 'Poster' } },
  { value: 'carte-visite', label: { fr: 'Carte de visite', en: 'Business card' } },
  { value: 'autocollant', label: { fr: 'Autocollant', en: 'Sticker' } },
  { value: 'tshirt', label: { fr: 'T-shirt', en: 'T-shirt' } },
  { value: 'rollup', label: { fr: 'Roll-up', en: 'Roll-up' } },
  { value: 'autre', label: { fr: 'Autre (préciser)', en: 'Other (specify)' } },
];

const statusOptions: { value: DesignProject['statut']; label: Record<string, string>; color: string }[] = [
  { value: 'discussion', label: { fr: 'Discussion', en: 'Discussion' }, color: 'bg-muted-foreground/20 text-muted-foreground' },
  { value: 'en-cours', label: { fr: 'En cours', en: 'In progress' }, color: 'bg-purple-500/15 text-purple-400' },
  { value: 'livre', label: { fr: 'Livré', en: 'Delivered' }, color: 'bg-or/15 text-or' },
  { value: 'paye', label: { fr: 'Payé', en: 'Paid' }, color: 'bg-emerald-500/15 text-emerald-400' },
];

const emptyPrint = (): PrintSection => ({
  enabled: false, type: 'bache', typeCustom: '', quantite: 1, prixUnitaire: 0, devise: 'XOF', totalImpression: 0, inclusDansPrix: true,
});

const emptyProject = (): Omit<DesignProject, 'id' | 'createdAt'> => ({
  client: '', phone: '', type: 'logo-branding', description: '', prix: 0, devise: 'XOF',
  acompte: 0, statut: 'discussion', deadline: '', gallery: [], notes: '', typeCustom: '',
  impression: emptyPrint(),
});

export const getTypeLabel = (p: { type: string; typeCustom?: string }, lang: string) => {
  if (p.type === 'autre' && p.typeCustom) return p.typeCustom;
  return typeOptions.find(t => t.value === p.type)?.label[lang] || p.type;
};

const getPrintTypeLabel = (imp: PrintSection, lang: string) => {
  if (imp.type === 'autre' && imp.typeCustom) return imp.typeCustom;
  return printTypeOptions.find(t => t.value === imp.type)?.label[lang] || imp.type;
};

const DesignProjects = ({ lang }: Props) => {
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProject());
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const projects = designStorage.getProjects().filter(p => !p.archived);

  const filtered = useMemo(() => {
    return projects
      .filter(p => !search || p.client.toLowerCase().includes(search.toLowerCase()))
      .filter(p => filterStatus === 'all' || p.statut === filterStatus)
      .filter(p => filterType === 'all' || p.type === filterType)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [projects, search, filterStatus, filterType]);

  const handleNew = () => { setForm(emptyProject()); setEditId(null); setView('form'); };
  const handleEdit = (p: DesignProject) => {
    setForm({
      client: p.client, phone: p.phone, type: p.type, typeCustom: p.typeCustom, description: p.description,
      prix: p.prix, devise: p.devise, acompte: p.acompte, statut: p.statut, deadline: p.deadline,
      gallery: p.gallery, notes: p.notes, impression: p.impression || emptyPrint(),
    });
    setEditId(p.id); setView('form');
  };

  const handleSave = () => {
    const all = designStorage.getProjects();
    const imp = form.impression;
    if (imp) imp.totalImpression = imp.quantite * imp.prixUnitaire;
    if (editId) {
      const idx = all.findIndex(p => p.id === editId);
      if (idx >= 0) all[idx] = { ...all[idx], ...form };
    } else {
      all.push({ ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() } as DesignProject);
    }
    designStorage.setProjects(all);
    toast({ title: t('saved', lang) });
    setView('list');
  };

  const handleArchive = (id: string) => {
    const all = designStorage.getProjects();
    const idx = all.findIndex(p => p.id === id);
    if (idx >= 0) { all[idx].archived = true; designStorage.setProjects(all); }
    setView('list');
  };

  const handleDelete = (id: string) => {
    designStorage.setProjects(designStorage.getProjects().filter(p => p.id !== id));
    setView('list');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setForm(prev => ({ ...prev, gallery: [...prev.gallery, reader.result as string] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => {
    setForm(prev => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== idx) }));
  };

  const updateImpression = (patch: Partial<PrintSection>) => {
    setForm(prev => {
      const imp = { ...(prev.impression || emptyPrint()), ...patch };
      imp.totalImpression = imp.quantite * imp.prixUnitaire;
      return { ...prev, impression: imp };
    });
  };

  const whatsappLink = (phone: string, client: string, type: string, solde: number) => {
    const msg = lang === 'fr'
      ? `Bonjour ${client}, votre projet ${type.replace(/-/g, ' ')} est prêt ! Le solde restant est de ${solde.toLocaleString()} XOF.`
      : `Hello ${client}, your ${type.replace(/-/g, ' ')} project is ready! The remaining balance is ${solde.toLocaleString()} XOF.`;
    return `https://wa.me/${phone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  // DETAIL VIEW
  if (view === 'detail' && detailId) {
    const p = projects.find(x => x.id === detailId);
    if (!p) return null;
    const imp = p.impression;
    const fraisImpression = imp?.enabled && !imp.inclusDansPrix ? imp.totalImpression : 0;
    const solde = p.prix + fraisImpression - p.acompte;
    const statusObj = statusOptions.find(s => s.value === p.statut);
    return (
      <div className="max-w-3xl mx-auto px-4 pt-24 md:pt-20 pb-8">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4 font-satoshi text-sm">
          <ArrowLeft size={16} /> {t('back', lang)}
        </button>
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-clash font-bold text-2xl">{p.client}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusObj?.color}`}>{statusObj?.label[lang]}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{getTypeLabel(p, lang)}</p>
          {p.description && <p className="font-satoshi text-sm mb-4">{p.description}</p>}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="glass-card p-3"><p className="text-xs text-muted-foreground">{lang === 'fr' ? 'Prix convenu' : 'Agreed price'}</p><p className="font-clash font-bold">{p.prix.toLocaleString()} {p.devise}</p></div>
            <div className="glass-card p-3"><p className="text-xs text-muted-foreground">{lang === 'fr' ? 'Acompte reçu' : 'Deposit received'}</p><p className="font-clash font-bold">{p.acompte.toLocaleString()} {p.devise}</p></div>
          </div>

          {/* Print section detail */}
          {imp?.enabled && (
            <div className="glass-card p-4 mb-4 border border-purple-500/20">
              <h4 className="font-clash font-bold text-sm mb-2 flex items-center gap-2"><Printer size={14} className="text-purple-400" /> {lang === 'fr' ? 'Impression' : 'Printing'}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm font-satoshi">
                <p><span className="text-muted-foreground">Type:</span> {getPrintTypeLabel(imp, lang)}</p>
                <p><span className="text-muted-foreground">{lang === 'fr' ? 'Quantité' : 'Qty'}:</span> {imp.quantite}</p>
                <p><span className="text-muted-foreground">{lang === 'fr' ? 'Prix unitaire' : 'Unit price'}:</span> {imp.prixUnitaire.toLocaleString()} {imp.devise}</p>
                <p><span className="text-muted-foreground">Total:</span> {imp.totalImpression.toLocaleString()} {imp.devise}</p>
              </div>
              <p className="text-xs mt-2 text-muted-foreground">
                {imp.inclusDansPrix
                  ? (lang === 'fr' ? '✓ Inclus dans le prix client' : '✓ Included in client price')
                  : (lang === 'fr' ? '⚠ En supplément (non inclus)' : '⚠ Extra charge (not included)')}
              </p>
            </div>
          )}

          <div className={`glass-card p-4 mb-4 text-center ${solde <= 0 ? 'border-emerald-500/30' : 'border-or/30'} border`}>
            <p className="text-xs text-muted-foreground mb-1">{lang === 'fr' ? 'Solde restant' : 'Remaining balance'}</p>
            <p className={`font-clash font-bold text-2xl ${solde <= 0 ? 'text-emerald-400' : 'text-or'}`}>
              {Math.max(0, solde).toLocaleString()} {p.devise}
            </p>
          </div>
          {p.deadline && <p className="text-sm text-muted-foreground mb-4">Deadline: {new Date(p.deadline).toLocaleDateString()}</p>}

          {p.gallery.length > 0 && (
            <div className="mb-4">
              <h4 className="font-clash font-bold text-sm mb-2">{lang === 'fr' ? 'Visuels livrés' : 'Delivered visuals'}</h4>
              <div className="grid grid-cols-3 gap-2">
                {p.gallery.map((img, i) => (
                  <img key={i} src={img} alt="" className="rounded-lg w-full aspect-square object-cover cursor-pointer hover:opacity-80" onClick={() => setLightboxImg(img)} />
                ))}
              </div>
            </div>
          )}
          {p.notes && <div className="glass-card p-3 mb-4"><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm font-satoshi">{p.notes}</p></div>}

          <div className="flex gap-2 flex-wrap">
            {p.phone && (
              <a href={whatsappLink(p.phone, p.client, getTypeLabel(p, lang), solde)} target="_blank" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-satoshi text-sm hover:bg-emerald-700 transition-colors">
                WhatsApp
              </a>
            )}
            <button onClick={() => handleEdit(p)} className="px-4 py-2 rounded-xl bg-or/15 text-or font-satoshi text-sm hover:bg-or/25">{t('editDevis', lang)}</button>
            <button onClick={() => handleArchive(p.id)} className="px-4 py-2 rounded-xl bg-secondary text-foreground font-satoshi text-sm hover:bg-secondary/80">
              <Archive size={14} className="inline mr-1" /> {t('archiveOrder', lang)}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {lightboxImg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
              <img src={lightboxImg} alt="" className="max-w-full max-h-[90vh] rounded-xl" />
              <button className="absolute top-4 right-4 text-white" onClick={() => setLightboxImg(null)}><X size={24} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // FORM VIEW
  if (view === 'form') {
    const imp = form.impression || emptyPrint();
    const fraisImpression = imp.enabled && !imp.inclusDansPrix ? imp.quantite * imp.prixUnitaire : 0;
    const solde = form.prix + fraisImpression - form.acompte;
    return (
      <div className="max-w-3xl mx-auto px-4 pt-24 md:pt-20 pb-8">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4 font-satoshi text-sm">
          <ArrowLeft size={16} /> {t('back', lang)}
        </button>
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-clash font-bold text-xl">{editId ? (lang === 'fr' ? 'Modifier le projet' : 'Edit project') : (lang === 'fr' ? 'Nouveau projet' : 'New project')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-satoshi">{t('client', lang)} *</label>
              <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm focus:outline-none focus:ring-2 focus:ring-or/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-satoshi">{t('phone', lang)}</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm focus:outline-none focus:ring-2 focus:ring-or/50" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? 'Type de prestation' : 'Service type'}</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm">
                {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label[lang]}</option>)}
              </select>
              {form.type === 'autre' && (
                <input value={form.typeCustom || ''} onChange={e => setForm(f => ({ ...f, typeCustom: e.target.value }))}
                  placeholder={lang === 'fr' ? 'Précisez le type...' : 'Specify the type...'}
                  className="w-full mt-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm focus:outline-none focus:ring-2 focus:ring-or/50" />
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-satoshi">{t('status', lang)}</label>
              <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value as any }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm">
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label[lang]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? 'Description du brief' : 'Brief description'}</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm resize-none focus:outline-none focus:ring-2 focus:ring-or/50" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? 'Prix convenu' : 'Agreed price'}</label>
              <div className="flex gap-2 mt-1">
                <input type="number" value={form.prix || ''} onChange={e => setForm(f => ({ ...f, prix: Number(e.target.value) }))} className="flex-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm focus:outline-none focus:ring-2 focus:ring-or/50" />
                <select value={form.devise} onChange={e => setForm(f => ({ ...f, devise: e.target.value }))} className="px-2 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm w-20">
                  <option>XOF</option><option>EUR</option><option>USD</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? 'Acompte reçu' : 'Deposit received'}</label>
              <input type="number" value={form.acompte || ''} onChange={e => setForm(f => ({ ...f, acompte: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm focus:outline-none focus:ring-2 focus:ring-or/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? 'Solde restant' : 'Remaining'}</label>
              <div className={`mt-1 px-3 py-2 rounded-xl font-clash font-bold text-sm ${solde <= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-or/10 text-or'}`}>
                {Math.max(0, solde).toLocaleString()} {form.devise}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-satoshi">Deadline</label>
            <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm focus:outline-none focus:ring-2 focus:ring-or/50" />
          </div>

          {/* IMPRESSION SECTION */}
          <div className="glass-card p-4 border border-purple-500/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-clash font-bold text-sm flex items-center gap-2">
                <Printer size={16} className="text-purple-400" />
                {lang === 'fr' ? 'Impression' : 'Printing'}
              </h3>
              <button
                type="button"
                onClick={() => updateImpression({ enabled: !imp.enabled })}
                className={`relative w-11 h-6 rounded-full transition-colors ${imp.enabled ? 'bg-purple-500' : 'bg-secondary'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${imp.enabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground font-satoshi mb-3">
              {lang === 'fr' ? 'Je gère l\'impression pour ce projet' : 'I handle printing for this project'}
            </p>

            {imp.enabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? 'Type d\'impression' : 'Print type'}</label>
                  <select value={imp.type} onChange={e => updateImpression({ type: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm">
                    {printTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label[lang]}</option>)}
                  </select>
                  {imp.type === 'autre' && (
                    <input value={imp.typeCustom || ''} onChange={e => updateImpression({ typeCustom: e.target.value })}
                      placeholder={lang === 'fr' ? 'Précisez...' : 'Specify...'}
                      className="w-full mt-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? 'Quantité' : 'Quantity'}</label>
                    <input type="number" value={imp.quantite || ''} onChange={e => updateImpression({ quantite: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? 'Prix unitaire' : 'Unit price'}</label>
                    <input type="number" value={imp.prixUnitaire || ''} onChange={e => updateImpression({ prixUnitaire: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-satoshi">Total</label>
                    <div className="mt-1 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-400 font-clash font-bold text-sm">
                      {(imp.quantite * imp.prixUnitaire).toLocaleString()} {form.devise}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? 'Inclus dans le prix client ?' : 'Included in client price?'}</label>
                  <button
                    type="button"
                    onClick={() => updateImpression({ inclusDansPrix: !imp.inclusDansPrix })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${imp.inclusDansPrix ? 'bg-emerald-500' : 'bg-or'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${imp.inclusDansPrix ? 'translate-x-5' : ''}`} />
                  </button>
                  <span className="text-xs font-satoshi">{imp.inclusDansPrix ? (lang === 'fr' ? 'Oui' : 'Yes') : (lang === 'fr' ? 'Non (supplément)' : 'No (extra)')}</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Gallery upload */}
          <div>
            <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? 'Galerie fichiers livrés' : 'Delivered files gallery'}</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.gallery.map((img, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"><X size={12} /></button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center cursor-pointer hover:border-or/50 transition-colors">
                <ImageIcon size={20} className="text-muted-foreground" />
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-satoshi">{lang === 'fr' ? 'Notes internes' : 'Internal notes'}</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm resize-none focus:outline-none focus:ring-2 focus:ring-or/50" />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!form.client} className="px-6 py-2 rounded-xl bg-or text-accent-foreground font-clash font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40">
              {t('saveOrder', lang)}
            </button>
            {editId && (
              <button onClick={() => handleDelete(editId)} className="px-4 py-2 rounded-xl bg-destructive/15 text-destructive font-satoshi text-sm hover:bg-destructive/25">
                <Trash2 size={14} className="inline mr-1" /> {t('deleteOrder', lang)}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 md:pt-20 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-clash font-bold uppercase tracking-wider">{lang === 'fr' ? 'Projets' : 'Projects'}</h1>
        <button onClick={handleNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-or text-accent-foreground font-clash font-bold text-sm uppercase hover:opacity-90">
          <Plus size={16} /> {lang === 'fr' ? 'Nouveau' : 'New'}
        </button>
      </motion.div>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchClient', lang)} className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm focus:outline-none focus:ring-2 focus:ring-or/50" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm">
          <option value="all">{t('allStatuses', lang)}</option>
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label[lang]}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 font-satoshi text-sm">
          <option value="all">{lang === 'fr' ? 'Tous les types' : 'All types'}</option>
          {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label[lang]}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground font-satoshi">{lang === 'fr' ? 'Aucun projet' : 'No projects'}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p, i) => {
            const statusObj = statusOptions.find(s => s.value === p.statut);
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-center justify-between gap-4 cursor-pointer hover:scale-[1.01] transition-transform"
                onClick={() => { setDetailId(p.id); setView('detail'); }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-satoshi font-medium truncate">{p.client}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusObj?.color}`}>{statusObj?.label[lang]}</span>
                    {p.impression?.enabled && <Printer size={12} className="text-purple-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{getTypeLabel(p, lang)} · {p.prix.toLocaleString()} {p.devise}</p>
                </div>
                <div className="flex items-center gap-1">
                  {p.phone && (
                    <a href={`https://wa.me/${p.phone.replace(/[^0-9+]/g, '')}`} target="_blank" onClick={e => e.stopPropagation()} className="p-2 rounded-lg hover:bg-emerald-500/15 text-emerald-400"><Phone size={16} /></a>
                  )}
                  <button onClick={e => { e.stopPropagation(); handleEdit(p); }} className="p-2 rounded-lg hover:bg-or/15 text-or"><Edit size={16} /></button>
                  <button onClick={e => { e.stopPropagation(); handleArchive(p.id); }} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><Archive size={16} /></button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DesignProjects;
