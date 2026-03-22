import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/lib/i18n';
import { designStorage, DesignProject } from '@/lib/designStorage';
import { storage } from '@/lib/storage';
import { Plus, Search, Phone, Edit, Archive, ArrowLeft, X, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props { lang: 'fr' | 'en'; }

const typeOptions = [
  { value: 'logo-branding', label: { fr: 'Logo / Branding', en: 'Logo / Branding' } },
  { value: 'affiche-flyer', label: { fr: 'Affiche / Flyer', en: 'Poster / Flyer' } },
  { value: 'identite-visuelle', label: { fr: 'Identité visuelle complète', en: 'Full visual identity' } },
  { value: 'reseaux-sociaux', label: { fr: 'Réseaux sociaux', en: 'Social media' } },
  { value: 'autre', label: { fr: 'Autre', en: 'Other' } },
];

const statusOptions: { value: DesignProject['statut']; label: Record<string, string>; color: string }[] = [
  { value: 'discussion', label: { fr: 'Discussion', en: 'Discussion' }, color: 'bg-muted-foreground/20 text-muted-foreground' },
  { value: 'en-cours', label: { fr: 'En cours', en: 'In progress' }, color: 'bg-purple-500/15 text-purple-400' },
  { value: 'livre', label: { fr: 'Livré', en: 'Delivered' }, color: 'bg-or/15 text-or' },
  { value: 'paye', label: { fr: 'Payé', en: 'Paid' }, color: 'bg-emerald-500/15 text-emerald-400' },
];

const emptyProject = (): Omit<DesignProject, 'id' | 'createdAt'> => ({
  client: '', phone: '', type: 'logo-branding', description: '', prix: 0, devise: 'XOF',
  acompte: 0, statut: 'discussion', deadline: '', gallery: [], notes: '', typeCustom: '',
});

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
    setForm({ client: p.client, phone: p.phone, type: p.type, typeCustom: p.typeCustom, description: p.description, prix: p.prix, devise: p.devise, acompte: p.acompte, statut: p.statut, deadline: p.deadline, gallery: p.gallery, notes: p.notes });
    setEditId(p.id); setView('form');
  };

  const handleSave = () => {
    const all = designStorage.getProjects();
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
    const solde = p.prix - p.acompte;
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
          <p className="text-sm text-muted-foreground mb-1">{typeOptions.find(t => t.value === p.type)?.label[lang]}</p>
          {p.description && <p className="font-satoshi text-sm mb-4">{p.description}</p>}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="glass-card p-3"><p className="text-xs text-muted-foreground">{lang === 'fr' ? 'Prix convenu' : 'Agreed price'}</p><p className="font-clash font-bold">{p.prix.toLocaleString()} {p.devise}</p></div>
            <div className="glass-card p-3"><p className="text-xs text-muted-foreground">{lang === 'fr' ? 'Acompte reçu' : 'Deposit received'}</p><p className="font-clash font-bold">{p.acompte.toLocaleString()} {p.devise}</p></div>
          </div>
          <div className={`glass-card p-4 mb-4 text-center ${solde <= 0 ? 'border-emerald-500/30' : 'border-or/30'} border`}>
            <p className="text-xs text-muted-foreground mb-1">{lang === 'fr' ? 'Solde restant' : 'Remaining balance'}</p>
            <p className={`font-clash font-bold text-2xl ${solde <= 0 ? 'text-emerald-400' : 'text-or'}`}>
              {Math.max(0, solde).toLocaleString()} {p.devise}
            </p>
          </div>
          {p.deadline && <p className="text-sm text-muted-foreground mb-4">Deadline: {new Date(p.deadline).toLocaleDateString()}</p>}

          {/* Gallery */}
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
              <a href={whatsappLink(p.phone, p.client, p.type, solde)} target="_blank" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-satoshi text-sm hover:bg-emerald-700 transition-colors">
                WhatsApp
              </a>
            )}
            <button onClick={() => handleEdit(p)} className="px-4 py-2 rounded-xl bg-or/15 text-or font-satoshi text-sm hover:bg-or/25">{t('editDevis', lang)}</button>
            <button onClick={() => handleArchive(p.id)} className="px-4 py-2 rounded-xl bg-secondary text-foreground font-satoshi text-sm hover:bg-secondary/80">
              <Archive size={14} className="inline mr-1" /> {t('archiveOrder', lang)}
            </button>
          </div>
        </div>

        {/* Lightbox */}
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
    const solde = form.prix - form.acompte;
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

      {/* Filters */}
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

      {/* List */}
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
                  </div>
                  <p className="text-xs text-muted-foreground">{typeOptions.find(t => t.value === p.type)?.label[lang]} · {p.prix.toLocaleString()} {p.devise}</p>
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
