import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/lib/i18n';
import { storage, MrgOrder } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, ArrowLeft, Trash2, Star, Ship, Plane, AlertTriangle, Search, MessageCircle, Eye, Edit, Archive } from 'lucide-react';

interface ImportTrackerProps {
  lang: 'fr' | 'en';
  editOrderId?: string | null;
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
  if (type === 'avion') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-or/20 text-or"><Plane size={12} /> {t('avion', lang)}</span>
  );
  if (type === 'bateau') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-bleu-mer/20 text-bleu-mer"><Ship size={12} /> {t('bateau', lang)}</span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-or/20 to-bleu-mer/20 text-foreground"><Plane size={12} /><Ship size={12} /> Mix</span>
  );
};

const StarRating = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        size={18}
        className={`cursor-pointer transition-colors ${i <= value ? 'text-or fill-or' : 'text-muted-foreground'}`}
        onClick={() => onChange?.(i)}
      />
    ))}
  </div>
);

const emptyOrder = (): MrgOrder => ({
  id: genId(),
  client: '',
  phone: '',
  transport: 'bateau',
  realPrice: 0,
  clientPrice: 0,
  profit: 0,
  dateOrder: new Date().toISOString().slice(0, 10),
  dateArrival: '',
  datePickup: '',
  dateDelivery: '',
  status: 'pas-commande',
  photos: [],
  rating: 0,
  review: '',
  suggestions: '',
  devisId: '',
  createdAt: new Date().toISOString(),
});

type View = 'dashboard' | 'list' | 'form' | 'detail';

const ImportTracker = ({ lang, editOrderId }: ImportTrackerProps) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<MrgOrder[]>(() => storage.getOrders().filter(o => !o.archived));
  const allOrdersForCharts = storage.getOrders(); // includes archived for charts
  const [view, setView] = useState<View>(() => {
    if (editOrderId) {
      const found = storage.getOrders().find(o => o.id === editOrderId);
      if (found) return 'form';
    }
    return 'dashboard';
  });
  const [currentOrder, setCurrentOrder] = useState<MrgOrder>(() => {
    if (editOrderId) {
      const found = storage.getOrders().find(o => o.id === editOrderId);
      if (found) return found;
    }
    return emptyOrder();
  });
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTransport, setFilterTransport] = useState('');

  const profil = storage.getProfil();
  const devise = profil.devise || 'XOF';
  const reminderDays = storage.getReminderDays();

  const saveOrdersToStorage = (activeOrders: MrgOrder[]) => {
    // Merge with archived orders before saving
    const archived = storage.getOrders().filter(o => o.archived);
    storage.setOrders([...activeOrders, ...archived]);
    setOrders(activeOrders);
  };

  const archiveOrder = (id: string) => {
    const all = storage.getOrders();
    const updated = all.map(o => o.id === id ? { ...o, archived: true } : o);
    storage.setOrders(updated);
    setOrders(updated.filter(o => !o.archived));
    toast({ title: lang === 'fr' ? 'Commande archivée' : 'Order archived' });
    if (view === 'detail' || view === 'form') setView('list');
  };

  // Stats
  const totalProfit = orders.reduce((s, o) => s + o.profit, 0);
  const thisMonthProfit = orders.filter(o => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, o) => s + o.profit, 0);
  const toRecover = orders.filter(o => o.status === 'arrive').length;

  // Reminder alert
  const overdueOrders = orders.filter(o => {
    if (o.status !== 'arrive' || !o.dateArrival) return false;
    const diff = (Date.now() - new Date(o.dateArrival).getTime()) / (1000 * 60 * 60 * 24);
    return diff > reminderDays;
  });

  // Chart data - last 6 months
  const chartData = useMemo(() => {
    const months: { name: string; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      const profit = orders
        .filter(o => { const od = new Date(o.createdAt); return od.getMonth() === m && od.getFullYear() === y; })
        .reduce((s, o) => s + o.profit, 0);
      months.push({ name: d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' }), profit });
    }
    return months;
  }, [orders, lang]);

  // Filtered orders
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (search && !normalize(o.client).includes(normalize(search))) return false;
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterTransport && o.transport !== filterTransport) return false;
      if (filterMonth) {
        const od = new Date(o.createdAt);
        const [fy, fm] = filterMonth.split('-').map(Number);
        if (od.getFullYear() !== fy || od.getMonth() + 1 !== fm) return false;
      }
      return true;
    });
  }, [orders, search, filterStatus, filterTransport, filterMonth]);

  const saveOrder = () => {
    const updated = { ...currentOrder, profit: currentOrder.clientPrice - currentOrder.realPrice };
    const idx = orders.findIndex(o => o.id === updated.id);
    const newOrders = [...orders];
    if (idx >= 0) newOrders[idx] = updated;
    else newOrders.push(updated);
    saveOrdersToStorage(newOrders);
    toast({ title: t('orderSaved', lang) });
    setView('dashboard');
  };

  const deleteOrder = (id: string) => {
    if (!confirm(t('deleteConfirm', lang))) return;
    saveOrdersToStorage(orders.filter(o => o.id !== id));
    toast({ title: t('orderDeleted', lang) });
    if (view === 'detail' || view === 'form') setView('list');
  };

  const openWhatsApp = (phone: string, client: string) => {
    const msg = lang === 'fr'
      ? `Bonjour ${client}, merci pour votre commande. Pouvez-vous me donner votre avis et une note de 1 à 5 ?`
      : `Hello ${client}, thanks for your order. Could you give me a review and a rating from 1 to 5?`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi";

  // DASHBOARD
  if (view === 'dashboard') {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-24 md:pt-20 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-clash font-bold uppercase tracking-wider">{t('trackerTitle', lang)}</h1>
            <button onClick={() => { setCurrentOrder(emptyOrder()); setView('form'); }} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2">
              <Plus size={18} /> {t('newOrder', lang)}
            </button>
          </div>

          {/* Alert */}
          {overdueOrders.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 rounded-xl bg-or/15 border border-or/30 flex items-center gap-3">
              <AlertTriangle size={20} className="text-or" />
              <p className="font-satoshi text-sm">
                <strong>{overdueOrders.length}</strong> {t('reminderAlert', lang)} <strong>{reminderDays}</strong> {t('daysWithout', lang)}
              </p>
              <button onClick={() => { setFilterStatus('arrive'); setView('list'); }} className="ml-auto text-or font-clash font-bold uppercase text-xs hover:opacity-80">
                {lang === 'fr' ? 'Voir' : 'View'}
              </button>
            </motion.div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: t('totalOrders', lang), value: orders.length, color: 'text-primary' },
              { label: t('totalProfit', lang), value: formatNum(totalProfit, devise), color: totalProfit >= 0 ? 'text-[hsl(var(--status-livre))]' : 'text-destructive' },
              { label: t('thisMonth', lang), value: formatNum(thisMonthProfit, devise), color: 'text-or' },
              { label: t('toRecover', lang), value: toRecover, color: toRecover > 0 ? 'text-destructive' : 'text-[hsl(var(--status-livre))]' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4">
                <p className="font-clash uppercase text-xs tracking-wider text-muted-foreground">{stat.label}</p>
                <p className={`font-satoshi font-bold text-2xl mt-1 ${stat.color}`}>{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Chart */}
          <div className="glass-card p-6 mb-6">
            <h2 className="font-clash font-bold uppercase text-sm tracking-wider mb-4">{t('last6Months', lang)}</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => formatNum(v, devise)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="hsl(var(--primary))" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent orders */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-clash font-bold uppercase text-sm tracking-wider">{t('recentOrders', lang)}</h2>
              <button onClick={() => setView('list')} className="text-primary font-clash font-bold uppercase text-xs hover:opacity-80">{t('allOrders', lang)}</button>
            </div>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground font-satoshi py-8">{t('noOrders', lang)}</p>
            ) : (
              <div className="space-y-2">
                {orders.slice(-5).reverse().map(o => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="font-satoshi font-medium">{o.client}</span>
                      <TransportBadge type={o.transport} lang={lang} />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-satoshi font-bold ${o.profit >= 0 ? 'text-[hsl(var(--status-livre))]' : 'text-destructive'}`}>
                        {formatNum(o.profit, devise)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[o.status]}`}>
                        {t(statusLabels[o.status], lang)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // LIST VIEW
  if (view === 'list') {
    const months = [...new Set(orders.map(o => {
      const d = new Date(o.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }))].sort().reverse();

    return (
      <div className="max-w-5xl mx-auto px-4 pt-24 md:pt-20 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => { setView('dashboard'); setFilterStatus(''); setFilterTransport(''); setFilterMonth(''); setSearch(''); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-satoshi text-sm mb-4 transition-colors">
            <ArrowLeft size={16} /> {t('back', lang)}
          </button>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-clash font-bold uppercase tracking-wider">{t('allOrders', lang)}</h1>
            <button onClick={() => { setCurrentOrder(emptyOrder()); setView('form'); }} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase text-xs hover:opacity-90 flex items-center gap-2">
              <Plus size={14} /> {t('newOrder', lang)}
            </button>
          </div>

          {/* Filters */}
          <div className="glass-card p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchClient', lang)} className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi text-sm" />
              </div>
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi text-sm">
                <option value="">{t('allMonths', lang)}</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi text-sm">
                <option value="">{t('allStatuses', lang)}</option>
                <option value="pas-commande">{t('pasCommande', lang)}</option>
                <option value="preparation">{t('preparation', lang)}</option>
                <option value="en-cours">{t('enCours', lang)}</option>
                <option value="arrive">{t('arrive', lang)}</option>
                <option value="recupere">{t('recupere', lang)}</option>
                <option value="livre">{t('livre', lang)}</option>
              </select>
              <select value={filterTransport} onChange={e => setFilterTransport(e.target.value)} className="px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi text-sm">
                <option value="">{t('allTransports', lang)}</option>
                <option value="avion">{t('avion', lang)}</option>
                <option value="bateau">{t('bateau', lang)}</option>
                <option value="mix">Mix</option>
              </select>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-muted-foreground font-satoshi">{search ? `${t('noClient', lang)} "${search}"` : t('noOrders', lang)}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map(o => (
                <div key={o.id} className="glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-satoshi font-medium">{o.client}</span>
                    <TransportBadge type={o.transport} lang={lang} />
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[o.status]}`}>
                      {t(statusLabels[o.status], lang)}
                    </span>
                    <span className={`font-satoshi font-bold text-sm ${o.profit >= 0 ? 'text-[hsl(var(--status-livre))]' : 'text-destructive'}`}>
                      {formatNum(o.profit, devise)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setCurrentOrder(o); setView('detail'); }} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"><Eye size={16} /></button>
                    <button onClick={() => { setCurrentOrder(o); setView('form'); }} className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors"><Edit size={16} /></button>
                    {o.phone && <button onClick={() => openWhatsApp(o.phone, o.client)} className="p-2 rounded-lg text-muted-foreground hover:text-[hsl(var(--status-recupere))] transition-colors"><MessageCircle size={16} /></button>}
                    <button onClick={() => deleteOrder(o.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

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
              <TransportBadge type={currentOrder.transport} lang={lang} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm font-satoshi">
              <div><span className="text-muted-foreground">{t('phone', lang)}:</span> {currentOrder.phone}</div>
              <div><span className="text-muted-foreground">{t('status', lang)}:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[currentOrder.status]}`}>{t(statusLabels[currentOrder.status], lang)}</span></div>
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

            {currentOrder.photos.length > 0 && (
              <div>
                <p className="font-clash uppercase text-xs tracking-wider text-muted-foreground mb-2">{t('photos', lang)}</p>
                <div className="flex gap-2 flex-wrap">
                  {currentOrder.photos.map((p, i) => <img key={i} src={p} alt="" className="w-20 h-20 rounded-lg object-cover" />)}
                </div>
              </div>
            )}

            {currentOrder.rating > 0 && (
              <div>
                <p className="font-clash uppercase text-xs tracking-wider text-muted-foreground mb-2">{t('rating', lang)}</p>
                <StarRating value={currentOrder.rating} onChange={() => {}} />
                {currentOrder.review && <p className="font-satoshi text-sm mt-2">{currentOrder.review}</p>}
                {currentOrder.suggestions && <p className="font-satoshi text-sm text-muted-foreground mt-1">{currentOrder.suggestions}</p>}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button onClick={() => setView('form')} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity">
                {t('editOrder', lang)}
              </button>
              {currentOrder.phone && (
                <button onClick={() => openWhatsApp(currentOrder.phone, currentOrder.client)} className="px-6 py-3 rounded-xl bg-[hsl(var(--status-recupere))]/20 text-[hsl(var(--status-recupere))] font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2">
                  <MessageCircle size={16} /> {t('whatsapp', lang)}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // FORM VIEW
  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 md:pt-20 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-satoshi text-sm mb-4 transition-colors">
          <ArrowLeft size={16} /> {t('back', lang)}
        </button>
        <h1 className="text-2xl font-clash font-bold uppercase tracking-wider mb-6">
          {orders.find(o => o.id === currentOrder.id) ? t('editOrder', lang) : t('newOrder', lang)}
        </h1>

        <div className="space-y-6">
          {/* Client info */}
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

          {/* Transport & Prices */}
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

          {/* Dates */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-clash font-bold uppercase text-sm tracking-wider text-bleu-mer">{lang === 'fr' ? 'Dates' : 'Dates'}</h2>
            <div className="grid grid-cols-2 gap-4">
              {(['dateOrder', 'dateArrival', 'datePickup', 'dateDelivery'] as const).map(dk => (
                <div key={dk}>
                  <label className="block text-sm text-muted-foreground mb-1 font-satoshi">{t(dk, lang)}</label>
                  <input type="date" value={currentOrder[dk]} onChange={e => setCurrentOrder(p => ({ ...p, [dk]: e.target.value }))} className={inputClass} />
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
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
                  {t(statusLabels[s], lang)}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-clash font-bold uppercase text-sm tracking-wider">{t('photos', lang)}</h2>
            <div className="flex gap-2 flex-wrap">
              {currentOrder.photos.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p} alt="" className="w-20 h-20 rounded-lg object-cover" />
                  <button onClick={() => setCurrentOrder(prev => ({ ...prev, photos: prev.photos.filter((_, j) => j !== i) }))} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">×</button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center cursor-pointer text-muted-foreground hover:text-primary">
                <Plus size={20} />
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (ev) => setCurrentOrder(prev => ({ ...prev, photos: [...prev.photos, ev.target?.result as string] }));
                    reader.readAsDataURL(file);
                  });
                }} />
              </label>
            </div>
          </div>

          {/* Rating & Review */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-clash font-bold uppercase text-sm tracking-wider">{t('rating', lang)} & {t('review', lang)}</h2>
            <StarRating value={currentOrder.rating} onChange={v => setCurrentOrder(p => ({ ...p, rating: v }))} />
            <div>
              <label className="block text-sm text-muted-foreground mb-1 font-satoshi">{t('review', lang)}</label>
              <textarea value={currentOrder.review} onChange={e => setCurrentOrder(p => ({ ...p, review: e.target.value }))} className={inputClass + ' min-h-[80px]'} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1 font-satoshi">{t('suggestions', lang)}</label>
              <textarea value={currentOrder.suggestions} onChange={e => setCurrentOrder(p => ({ ...p, suggestions: e.target.value }))} className={inputClass + ' min-h-[60px]'} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={saveOrder} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
              {t('saveOrder', lang)}
            </button>
            {orders.find(o => o.id === currentOrder.id) && (
              <button onClick={() => deleteOrder(currentOrder.id)} className="px-6 py-3 rounded-xl bg-destructive text-destructive-foreground font-clash font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
                {t('deleteOrder', lang)}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ImportTracker;
