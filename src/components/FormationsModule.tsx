import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/lib/i18n';
import { formationStorage, MrgFormation, PLATEFORMES_LIST } from '@/lib/formationStorage';
import { storage } from '@/lib/storage';
import { GraduationCap, Plus, Search, Phone, ArrowLeft, Trash2, Edit, MessageCircle, Users, DollarSign, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface FormationsModuleProps {
  lang: 'fr' | 'en';
}

const emptyFormation = (): MrgFormation => ({
  id: Math.random().toString(36).slice(2, 10),
  client: '',
  phone: '',
  objectif: '',
  plateformes: [],
  plateformesCustom: '',
  dateFormation: new Date().toISOString().slice(0, 10),
  duree: 2,
  prix: 0,
  devise: storage.getProfil().devise || 'XOF',
  acompte: 0,
  statut: 'planifiee',
  notes: '',
  createdAt: new Date().toISOString(),
});

const statusColors: Record<string, string> = {
  planifiee: 'bg-muted text-muted-foreground',
  'en-cours': 'bg-purple-500/20 text-purple-400',
  terminee: 'bg-or/20 text-or',
  payee: 'bg-green-500/20 text-green-400',
};

const statusLabels = {
  fr: { planifiee: 'Planifiée', 'en-cours': 'En cours', terminee: 'Terminée', payee: 'Payée' },
  en: { planifiee: 'Planned', 'en-cours': 'In progress', terminee: 'Completed', payee: 'Paid' },
};

const FormationsModule = ({ lang }: FormationsModuleProps) => {
  const [formations, setFormations] = useState<MrgFormation[]>([]);
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [current, setCurrent] = useState<MrgFormation>(emptyFormation());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    setFormations(formationStorage.getFormations());
  }, []);

  const reload = () => setFormations(formationStorage.getFormations());

  const handleSave = () => {
    if (!current.client.trim()) return;
    const exists = formations.find(f => f.id === current.id);
    if (exists) {
      formationStorage.updateFormation(current);
    } else {
      formationStorage.addFormation(current);
    }
    reload();
    setView('list');
  };

  const handleDelete = (id: string) => {
    if (!confirm(lang === 'fr' ? 'Supprimer cette formation ?' : 'Delete this training?')) return;
    formationStorage.deleteFormation(id);
    reload();
    setView('list');
  };

  const openWhatsApp = (f: MrgFormation) => {
    const msg = lang === 'fr'
      ? `Bonjour ${f.client}, concernant votre formation sur les plateformes d'achat en Chine. ${f.statut === 'terminee' ? `Le solde restant est de ${(f.prix - f.acompte).toLocaleString()} ${f.devise}.` : ''}`
      : `Hello ${f.client}, regarding your training on Chinese buying platforms. ${f.statut === 'terminee' ? `The remaining balance is ${(f.prix - f.acompte).toLocaleString()} ${f.devise}.` : ''}`;
    const phone = f.phone.replace(/\s/g, '').replace('+', '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Stats
  const now = new Date();
  const thisMonth = formations.filter(f => {
    const d = new Date(f.dateFormation);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalRevenue = formations.filter(f => f.statut === 'payee').reduce((s, f) => s + f.prix, 0);
  const monthRevenue = thisMonth.reduce((s, f) => s + f.acompte, 0);
  const totalLearners = formations.length;
  const pendingPayment = formations.filter(f => f.statut !== 'payee' && f.acompte < f.prix).reduce((s, f) => s + (f.prix - f.acompte), 0);

  // Chart data - last 6 months
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const month = d.toLocaleString(lang, { month: 'short' });
    const revenue = formations
      .filter(f => {
        const fd = new Date(f.dateFormation);
        return fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear();
      })
      .reduce((s, f) => s + f.acompte, 0);
    return { month, revenue };
  });

  // Filtered list
  const filtered = formations
    .filter(f => !f.archived)
    .filter(f => filterStatus === 'all' || f.statut === filterStatus)
    .filter(f => f.client.toLowerCase().includes(search.toLowerCase()));

  const togglePlateforme = (p: string) => {
    setCurrent(prev => ({
      ...prev,
      plateformes: prev.plateformes.includes(p)
        ? prev.plateformes.filter(x => x !== p)
        : [...prev.plateformes, p],
    }));
  };

  // DETAIL VIEW
  if (view === 'detail') {
    const solde = current.prix - current.acompte;
    return (
      <div className="max-w-3xl mx-auto px-4 pt-24 md:pt-20 pb-8">
        <button onClick={() => setView('list')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 font-satoshi">
          <ArrowLeft size={16} /> {t('back', lang)}
        </button>
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-clash font-bold text-2xl">{current.client}</h2>
            <Badge className={statusColors[current.statut]}>{statusLabels[lang][current.statut]}</Badge>
          </div>
          {current.phone && (
            <p className="text-muted-foreground font-satoshi flex items-center gap-2"><Phone size={14} /> {current.phone}</p>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm font-satoshi">
            <div><span className="text-muted-foreground">{lang === 'fr' ? 'Objectif' : 'Goal'}:</span> <span>{current.objectif || '—'}</span></div>
            <div><span className="text-muted-foreground">{lang === 'fr' ? 'Date' : 'Date'}:</span> <span>{current.dateFormation}</span></div>
            <div><span className="text-muted-foreground">{lang === 'fr' ? 'Durée' : 'Duration'}:</span> <span>{current.duree}h</span></div>
            <div><span className="text-muted-foreground">{lang === 'fr' ? 'Prix' : 'Price'}:</span> <span>{current.prix.toLocaleString()} {current.devise}</span></div>
            <div><span className="text-muted-foreground">{lang === 'fr' ? 'Acompte' : 'Deposit'}:</span> <span>{current.acompte.toLocaleString()} {current.devise}</span></div>
          </div>

          <div className={`p-3 rounded-lg text-center font-clash font-bold text-lg ${solde <= 0 ? 'bg-green-500/15 text-green-400' : 'bg-or/15 text-or'}`}>
            {lang === 'fr' ? 'Solde restant' : 'Remaining'}: {solde.toLocaleString()} {current.devise}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">{lang === 'fr' ? 'Plateformes enseignées' : 'Platforms taught'}:</p>
            <div className="flex flex-wrap gap-2">
              {current.plateformes.map(p => (
                <Badge key={p} className="bg-primary/15 text-primary">{p}</Badge>
              ))}
              {current.plateformesCustom && <Badge className="bg-or/15 text-or">{current.plateformesCustom}</Badge>}
            </div>
          </div>

          {current.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">{lang === 'fr' ? 'Notes' : 'Notes'}:</p>
              <p className="text-sm font-satoshi whitespace-pre-wrap">{current.notes}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={() => setView('form')} className="flex-1 py-2 rounded-lg bg-primary/15 text-primary font-satoshi text-sm hover:bg-primary/25 transition flex items-center justify-center gap-2">
              <Edit size={14} /> {lang === 'fr' ? 'Modifier' : 'Edit'}
            </button>
            {current.phone && (
              <button onClick={() => openWhatsApp(current)} className="flex-1 py-2 rounded-lg bg-green-500/15 text-green-400 font-satoshi text-sm hover:bg-green-500/25 transition flex items-center justify-center gap-2">
                <MessageCircle size={14} /> WhatsApp
              </button>
            )}
            <button onClick={() => handleDelete(current.id)} className="py-2 px-4 rounded-lg bg-destructive/15 text-destructive font-satoshi text-sm hover:bg-destructive/25 transition">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FORM VIEW
  if (view === 'form') {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-24 md:pt-20 pb-8">
        <button onClick={() => setView('list')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 font-satoshi">
          <ArrowLeft size={16} /> {t('back', lang)}
        </button>
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-clash font-bold text-xl">{lang === 'fr' ? 'Formation' : 'Training'}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground font-satoshi">{t('client', lang)} *</label>
              <input value={current.client} onChange={e => setCurrent({ ...current, client: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground font-satoshi">{t('phone', lang)}</label>
              <input value={current.phone} onChange={e => setCurrent({ ...current, phone: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi" placeholder="+228 ..." />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground font-satoshi">{lang === 'fr' ? 'Objectif de la formation' : 'Training goal'}</label>
            <select value={current.objectif} onChange={e => setCurrent({ ...current, objectif: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi">
              <option value="">{lang === 'fr' ? 'Sélectionner...' : 'Select...'}</option>
              <option value="revente">{lang === 'fr' ? 'Acheter pour revendre' : 'Buy to resell'}</option>
              <option value="personnel">{lang === 'fr' ? 'Usage personnel' : 'Personal use'}</option>
              <option value="ecommerce">{lang === 'fr' ? 'E-commerce' : 'E-commerce'}</option>
              <option value="autre">{lang === 'fr' ? 'Autre' : 'Other'}</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground font-satoshi mb-2 block">{lang === 'fr' ? 'Plateformes enseignées' : 'Platforms taught'}</label>
            <div className="flex flex-wrap gap-2">
              {PLATEFORMES_LIST.map(p => (
                <button key={p} onClick={() => togglePlateforme(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-satoshi font-medium transition-all ${
                    current.plateformes.includes(p) ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary/50 text-muted-foreground border border-border/30'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
            <input value={current.plateformesCustom} onChange={e => setCurrent({ ...current, plateformesCustom: e.target.value })}
              placeholder={lang === 'fr' ? 'Autre plateforme...' : 'Other platform...'}
              className="w-full mt-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground font-satoshi">{lang === 'fr' ? 'Date' : 'Date'}</label>
              <input type="date" value={current.dateFormation} onChange={e => setCurrent({ ...current, dateFormation: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground font-satoshi">{lang === 'fr' ? 'Durée (heures)' : 'Duration (hours)'}</label>
              <input type="number" min={0.5} step={0.5} value={current.duree} onChange={e => setCurrent({ ...current, duree: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground font-satoshi">{lang === 'fr' ? 'Prix facturé' : 'Price charged'}</label>
              <input type="number" value={current.prix} onChange={e => setCurrent({ ...current, prix: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground font-satoshi">{lang === 'fr' ? 'Acompte reçu' : 'Deposit received'}</label>
              <input type="number" value={current.acompte} onChange={e => setCurrent({ ...current, acompte: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground font-satoshi">{lang === 'fr' ? 'Devise' : 'Currency'}</label>
              <select value={current.devise} onChange={e => setCurrent({ ...current, devise: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi">
                <option value="XOF">XOF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {current.prix > 0 && (
            <div className={`p-3 rounded-lg text-center font-clash font-bold ${(current.prix - current.acompte) <= 0 ? 'bg-green-500/15 text-green-400' : 'bg-or/15 text-or'}`}>
              {lang === 'fr' ? 'Solde restant' : 'Remaining'}: {(current.prix - current.acompte).toLocaleString()} {current.devise}
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground font-satoshi">{t('status', lang)}</label>
            <select value={current.statut} onChange={e => setCurrent({ ...current, statut: e.target.value as MrgFormation['statut'] })}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi">
              {Object.entries(statusLabels[lang]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground font-satoshi">{lang === 'fr' ? 'Notes / observations' : 'Notes / observations'}</label>
            <textarea value={current.notes} onChange={e => setCurrent({ ...current, notes: e.target.value })} rows={3}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi resize-none" />
          </div>

          <button onClick={handleSave} disabled={!current.client.trim()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase tracking-wider hover:opacity-90 transition disabled:opacity-40">
            {t('saveOrder', lang)}
          </button>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 md:pt-20 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl md:text-4xl font-clash font-bold uppercase tracking-wider mb-2 flex items-center gap-3">
          <GraduationCap className="text-or" size={32} />
          {lang === 'fr' ? 'Formations' : 'Training'}
        </h1>
        <p className="text-muted-foreground font-satoshi mb-6">
          {lang === 'fr' ? 'Gérez vos sessions de formation import Chine' : 'Manage your China import training sessions'}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Users, label: lang === 'fr' ? 'Apprenants' : 'Learners', value: totalLearners, color: 'text-primary' },
          { icon: DollarSign, label: lang === 'fr' ? 'Revenus totaux' : 'Total revenue', value: `${totalRevenue.toLocaleString()}`, color: 'text-green-400' },
          { icon: Calendar, label: lang === 'fr' ? 'Ce mois' : 'This month', value: `${monthRevenue.toLocaleString()}`, color: 'text-or' },
          { icon: Clock, label: lang === 'fr' ? 'Soldes en attente' : 'Pending balances', value: `${pendingPayment.toLocaleString()}`, color: 'text-red-400' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card p-4 text-center">
            <s.icon className={`mx-auto mb-1 ${s.color}`} size={20} />
            <div className={`font-clash font-bold text-lg ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground font-satoshi">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      {formations.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <h3 className="font-clash font-bold text-sm uppercase tracking-wider mb-3 text-muted-foreground">
            {lang === 'fr' ? 'Revenus formations — 6 derniers mois' : 'Training revenue — last 6 months'}
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="revenue" fill="hsl(var(--or))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Search + Add */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchClient', lang)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary/50 border border-border/30 text-sm font-satoshi">
          <option value="all">{lang === 'fr' ? 'Tous' : 'All'}</option>
          {Object.entries(statusLabels[lang]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button onClick={() => { setCurrent(emptyFormation()); setView('form'); }}
          className="px-4 py-2 rounded-lg bg-or/15 text-or font-satoshi text-sm font-medium hover:bg-or/25 transition flex items-center gap-2">
          <Plus size={14} /> {lang === 'fr' ? 'Nouvelle' : 'New'}
        </button>
      </div>

      {/* List */}
      <AnimatePresence>
        {filtered.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground font-satoshi">
            {lang === 'fr' ? 'Aucune formation' : 'No training sessions'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary/30 transition"
                onClick={() => { setCurrent(f); setView('detail'); }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-clash font-bold text-sm truncate">{f.client}</span>
                    <Badge className={`text-[10px] ${statusColors[f.statut]}`}>{statusLabels[lang][f.statut]}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-satoshi">
                    <span>{f.dateFormation}</span>
                    <span>{f.duree}h</span>
                    <span>{f.prix.toLocaleString()} {f.devise}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {f.plateformes.map(p => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {f.phone && (
                    <button onClick={e => { e.stopPropagation(); openWhatsApp(f); }}
                      className="p-2 rounded-lg text-green-400 hover:bg-green-500/15 transition">
                      <MessageCircle size={14} />
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); setCurrent(f); setView('form'); }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition">
                    <Edit size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FormationsModule;
