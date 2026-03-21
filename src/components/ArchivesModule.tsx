import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/lib/i18n';
import { storage, MrgOrder } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, ArrowLeft, Trash2, Star, Ship, Plane, Search, Eye, ArchiveRestore, Package } from 'lucide-react';

interface ArchivesModuleProps {
  lang: 'fr' | 'en';
}

const genId = () => Math.random().toString(36).slice(2, 10);
const formatNum = (n: number, c = 'XOF') => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' ' + c;

const statusColors: Record<string, string> = {
  'pas-commande': 'bg-[hsl(var(--status-pas-commande))] text-primary-foreground',
  'preparation': 'bg-[hsl(var(--status-preparation))] text-primary-foreground',
  'en-cours': 'bg-[hsl(var(--status-en-cours))] text-[hsl(0,0%,7%)]',
  'arrive': 'bg-[hsl(var(--status-arrive))] text-primary-foreground',
  'recupere': 'bg-[hsl(var(--status-recupere))] text-[hsl(0,0%,7%)]',
  'livre': 'bg-[hsl(var(--status-livre))] text-primary-foreground',
};

const statusLabels = { 'pas-commande': 'pasCommande', 'preparation': 'preparation', 'en-cours': 'enCours', 'arrive': 'arrive', 'recupere': 'recupere', 'livre': 'livre' } as const;

const TransportBadge = ({ type, lang }: { type: string; lang: 'fr' | 'en' }) => {
  if (type === 'avion') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-or/20 text-or"><Plane size={12} /> {t('avion', lang)}</span>;
  if (type === 'bateau') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-bleu-mer/20 text-bleu-mer"><Ship size={12} /> {t('bateau', lang)}</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-or/20 to-bleu-mer/20 text-foreground"><Plane size={12} /><Ship size={12} /> Mix</span>;
};

const StarRating = ({ value }: { value: number }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={14} className={i <= value ? 'text-or fill-or' : 'text-muted-foreground'} />
    ))}
  </div>
);

const emptyArchiveOrder = (): MrgOrder => ({
  id: genId(),
  client: '',
  phone: '',
  transport: 'bateau',
  realPrice: 0,
  clientPrice: 0,
  profit: 0,
  dateOrder: '',
  dateArrival: '',
  datePickup: '',
  dateDelivery: '',
  status: 'livre',
  photos: [],
  rating: 0,
  review: '',
  suggestions: '',
  devisId: '',
  createdAt: new Date().toISOString(),
  archived: true,
});

type View = 'list' | 'form' | 'detail';

const ArchivesModule = ({ lang }: ArchivesModuleProps) => {
  const { toast } = useToast();
  const [archivedOrders, setArchivedOrders] = useState<MrgOrder[]>(() => storage.getOrders().filter(o => o.archived));
  const [view, setView] = useState<View>('list');
  const [currentOrder, setCurrentOrder] = useState<MrgOrder>(emptyArchiveOrder());
  const [search, setSearch] = useState('');

  const profil = storage.getProfil();
  const devise = profil.devise || 'XOF';

  const saveArchive = (updated: MrgOrder[]) => {
    const active = storage.getOrders().filter(o => !o.archived);
    storage.setOrders([...active, ...updated]);
    setArchivedOrders(updated);
  };

  const unarchiveOrder = (id: string) => {
    const order = archivedOrders.find(o => o.id === id);
    if (!order) return;
    const all = storage.getOrders();
    storage.setOrders(all.map(o => o.id === id ? { ...o, archived: false } : o));
    setArchivedOrders(prev => prev.filter(o => o.id !== id));
    toast({ title: lang === 'fr' ? 'Commande restaurée' : 'Order restored' });
    if (view === 'detail') setView('list');
  };

  const deleteOrder = (id: string) => {
    if (!confirm(t('deleteConfirm', lang))) return;
    const all = storage.getOrders().filter(o => o.id !== id);
    storage.setOrders(all);
    setArchivedOrders(prev => prev.filter(o => o.id !== id));
    toast({ title: t('orderDeleted', lang) });
    if (view === 'detail' || view === 'form') setView('list');
  };

  const saveOrder = () => {
    const updated = { ...currentOrder, archived: true, profit: currentOrder.clientPrice - currentOrder.realPrice };
    const idx = archivedOrders.findIndex(o => o.id === updated.id);
    const newArchived = [...archivedOrders];
    if (idx >= 0) newArchived[idx] = updated;
    else newArchived.push(updated);
    saveArchive(newArchived);
    toast({ title: t('orderSaved', lang) });
    setView('list');
  };

  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filtered = useMemo(() => {
    if (!search) return archivedOrders;
    return archivedOrders.filter(o => normalize(o.client).includes(normalize(search)));
  }, [archivedOrders, search]);

  const totalProfit = archivedOrders.reduce((s, o) => s + o.profit, 0);

  // Chart - all time by month
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    archivedOrders.forEach(o => {
      const d = o.dateOrder ? new Date(o.dateOrder) : new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + o.profit;
    });
    return Object.entries(map).sort().slice(-12).map(([k, v]) => {
      const [y, m] = k.split('-');
      const d = new Date(parseInt(y), parseInt(m) - 1);
      return { name: d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', year: '2-digit' }), profit: v };
    });
  }, [archivedOrders, lang]);

  const inputClass = "w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi";

  // DETAIL VIEW
  if (view === 'detail') {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-24 md:pt-20 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-satoshi text-sm mb-4 transition-colors">
            <ArrowLeft size={16} /> {t('back', lang)}
          </button>
          <h1 className="text-2xl font-clash font-bold uppercase tracking-wider mb-6">{t('orderDetail', lang)}</h1>

          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-clash font-bold text-xl">{currentOrder.client}</h2>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-or/20 text-or">{t('archived', lang)}</span>
                <TransportBadge type={currentOrder.transport} lang={lang} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm font-satoshi">
              <div><span className="text-muted-foreground">{t('phone', lang)}:</span> {currentOrder.phone || '—'}</div>
              <div><span className="text-muted-foreground">{t('status', lang)}:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[currentOrder.status]}`}>{t(statusLabels[currentOrder.status] as any, lang)}</span></div>
              <div><span className="text-muted-foreground">{t('realPrice', lang)}:</span> {formatNum(currentOrder.realPrice, devise)}</div>
              <div><span className="text-muted-foreground">{t('clientPrice', lang)}:</span> {formatNum(currentOrder.clientPrice, devise)}</div>
            </div>

            <div className="p-4 rounded-xl bg-or/15 text-center">
              <p className="font-clash uppercase text-xs tracking-wider text-or">{t('profit', lang)}</p>
              <p className={`font-satoshi font-extrabold text-3xl ${currentOrder.profit >= 0 ? 'text-or' : 'text-destructive'}`}>
                {formatNum(currentOrder.profit, devise)}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm font-satoshi">
              <div><p className="text-muted-foreground text-xs uppercase">{t('dateOrder', lang)}</p><p>{currentOrder.dateOrder || '—'}</p></div>
              <div><p className="text-muted-foreground text-xs uppercase">{t('dateArrival', lang)}</p><p>{currentOrder.dateArrival || '—'}</p></div>
              <div><p className="text-muted-foreground text-xs uppercase">{t('datePickup', lang)}</p><p>{currentOrder.datePickup || '—'}</p></div>
              <div><p className="text-muted-foreground text-xs uppercase">{t('dateDelivery', lang)}</p><p>{currentOrder.dateDelivery || '—'}</p></div>
            </div>

            {currentOrder.rating > 0 && (
              <div>
                <p className="font-clash uppercase text-xs tracking-wider text-muted-foreground mb-2">{t('rating', lang)}</p>
                <StarRating value={currentOrder.rating} />
                {currentOrder.review && <p className="font-satoshi text-sm mt-2">{currentOrder.review}</p>}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button onClick={() => unarchiveOrder(currentOrder.id)} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2">
                <ArchiveRestore size={16} /> {t('unarchiveOrder', lang)}
              </button>
              <button onClick={() => { setView('form'); }} className="px-6 py-3 rounded-xl bg-secondary border border-border font-clash font-bold uppercase text-sm tracking-wider hover:border-primary transition-colors">
                {t('editOrder', lang)}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // FORM VIEW (for adding old orders)
  if (view === 'form') {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-24 md:pt-20 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-satoshi text-sm mb-4 transition-colors">
            <ArrowLeft size={16} /> {t('back', lang)}
          </button>
          <h1 className="text-2xl font-clash font-bold uppercase tracking-wider mb-6">
            {archivedOrders.find(o => o.id === currentOrder.id) ? t('editOrder', lang) : t('addOldOrder', lang)}
          </h1>

          <div className="space-y-6">
            <div className="glass-card p-6 space-y-4">
              <h2 className="font-clash font-bold uppercase text-sm tracking-wider text-primary">{t('client', lang)}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1 font-satoshi">{t('client', lang)}</label>
                  <input value={currentOrder.client} onChange={e => setCurrentOrder(p => ({ ...p, client: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1 font-satoshi">{t('phone', lang)}</label>
                  <input value={currentOrder.phone} onChange={e => setCurrentOrder(p => ({ ...p, phone: e.target.value }))} className={inputClass} placeholder="+228..." />
                </div>
              </div>
            </div>

            <div className="glass-card p-6 space-y-4">
              <h2 className="font-clash font-bold uppercase text-sm tracking-wider text-or">{t('transport', lang)} & {t('profit', lang)}</h2>
              <div>
                <label className="block text-sm text-muted-foreground mb-1 font-satoshi">{t('transport', lang)}</label>
                <select value={currentOrder.transport} onChange={e => setCurrentOrder(p => ({ ...p, transport: e.target.value as MrgOrder['transport'] }))} className={inputClass}>
                  <option value="bateau">{t('bateau', lang)}</option>
                  <option value="avion">{t('avion', lang)}</option>
                  <option value="mix">Mix</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1 font-satoshi">{t('realPrice', lang)} ({devise})</label>
                  <input type="number" value={currentOrder.realPrice} onChange={e => {
                    const v = parseFloat(e.target.value) || 0;
                    setCurrentOrder(p => ({ ...p, realPrice: v, profit: p.clientPrice - v }));
                  }} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1 font-satoshi">{t('clientPrice', lang)} ({devise})</label>
                  <input type="number" value={currentOrder.clientPrice} onChange={e => {
                    const v = parseFloat(e.target.value) || 0;
                    setCurrentOrder(p => ({ ...p, clientPrice: v, profit: v - p.realPrice }));
                  }} className={inputClass} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-or/10 text-center">
                <span className="font-clash uppercase text-xs tracking-wider text-muted-foreground">{t('profit', lang)}: </span>
                <span className={`font-satoshi font-extrabold text-xl ${currentOrder.profit >= 0 ? 'text-[hsl(var(--status-livre))]' : 'text-destructive'}`}>
                  {formatNum(currentOrder.profit, devise)}
                </span>
              </div>
            </div>

            <div className="glass-card p-6 space-y-4">
              <h2 className="font-clash font-bold uppercase text-sm tracking-wider text-bleu-mer">Dates</h2>
              <div className="grid grid-cols-2 gap-4">
                {(['dateOrder', 'dateArrival', 'datePickup', 'dateDelivery'] as const).map(dk => (
                  <div key={dk}>
                    <label className="block text-sm text-muted-foreground mb-1 font-satoshi">{t(dk, lang)}</label>
                    <input type="date" value={currentOrder[dk]} onChange={e => setCurrentOrder(p => ({ ...p, [dk]: e.target.value }))} className={inputClass} />
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6 space-y-4">
              <h2 className="font-clash font-bold uppercase text-sm tracking-wider">{t('status', lang)}</h2>
              <div className="flex gap-2 flex-wrap">
                {(['pas-commande', 'preparation', 'en-cours', 'arrive', 'recupere', 'livre'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setCurrentOrder(p => ({ ...p, status: s }))}
                    className={`px-4 py-2 rounded-xl font-clash font-bold uppercase text-xs tracking-wider transition-all ${
                      currentOrder.status === s ? statusColors[s] : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {t(statusLabels[s] as any, lang)}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-6 space-y-4">
              <h2 className="font-clash font-bold uppercase text-sm tracking-wider">{t('rating', lang)} & {t('review', lang)}</h2>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={18} className={`cursor-pointer transition-colors ${i <= currentOrder.rating ? 'text-or fill-or' : 'text-muted-foreground'}`} onClick={() => setCurrentOrder(p => ({ ...p, rating: i }))} />
                ))}
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1 font-satoshi">{t('review', lang)}</label>
                <textarea value={currentOrder.review} onChange={e => setCurrentOrder(p => ({ ...p, review: e.target.value }))} className={inputClass + ' min-h-[80px]'} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={saveOrder} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
                {t('saveOrder', lang)}
              </button>
              {archivedOrders.find(o => o.id === currentOrder.id) && (
                <button onClick={() => deleteOrder(currentOrder.id)} className="px-6 py-3 rounded-xl bg-destructive text-destructive-foreground font-clash font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
                  {t('deleteOrder', lang)}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 md:pt-20 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-clash font-bold uppercase tracking-wider flex items-center gap-3">
            <Package size={28} className="text-or" /> {t('archives', lang)}
          </h1>
          <button onClick={() => { setCurrentOrder(emptyArchiveOrder()); setView('form'); }} className="px-6 py-3 rounded-xl bg-or text-accent-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus size={18} /> {t('addOldOrder', lang)}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4">
            <p className="font-clash uppercase text-xs tracking-wider text-muted-foreground">{t('totalOrders', lang)}</p>
            <p className="font-satoshi font-bold text-2xl text-primary mt-1">{archivedOrders.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="font-clash uppercase text-xs tracking-wider text-muted-foreground">{t('totalProfit', lang)}</p>
            <p className={`font-satoshi font-bold text-2xl mt-1 ${totalProfit >= 0 ? 'text-[hsl(var(--status-livre))]' : 'text-destructive'}`}>{formatNum(totalProfit, devise)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="font-clash uppercase text-xs tracking-wider text-muted-foreground">{lang === 'fr' ? 'Clients uniques' : 'Unique clients'}</p>
            <p className="font-satoshi font-bold text-2xl text-bleu-mer mt-1">{new Set(archivedOrders.map(o => o.client)).size}</p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="glass-card p-6 mb-6">
            <h2 className="font-clash font-bold uppercase text-sm tracking-wider mb-4">{lang === 'fr' ? 'Historique des bénéfices' : 'Profit history'}</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => formatNum(v, devise)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="hsl(var(--accent))" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Search */}
        <div className="glass-card p-4 mb-6">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchClient', lang)} className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi text-sm" />
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Package size={48} className="mx-auto text-muted-foreground mb-4 opacity-40" />
            <p className="text-muted-foreground font-satoshi">{t('noArchives', lang)}</p>
            <p className="text-sm text-muted-foreground/70 font-satoshi mt-2">
              {lang === 'fr' ? 'Ajoutez vos anciennes commandes ici pour garder un historique complet.' : 'Add your old orders here to keep a complete history.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(o => (
              <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-satoshi font-medium">{o.client}</span>
                  <TransportBadge type={o.transport} lang={lang} />
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[o.status]}`}>
                    {t(statusLabels[o.status] as any, lang)}
                  </span>
                  <span className={`font-satoshi font-bold text-sm ${o.profit >= 0 ? 'text-[hsl(var(--status-livre))]' : 'text-destructive'}`}>
                    {formatNum(o.profit, devise)}
                  </span>
                  {o.dateOrder && <span className="text-xs text-muted-foreground">{o.dateOrder}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setCurrentOrder(o); setView('detail'); }} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"><Eye size={16} /></button>
                  <button onClick={() => unarchiveOrder(o.id)} className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors" title={t('unarchiveOrder', lang)}><ArchiveRestore size={16} /></button>
                  <button onClick={() => deleteOrder(o.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={16} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ArchivesModule;
