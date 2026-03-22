import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { t } from '@/lib/i18n';
import { designStorage } from '@/lib/designStorage';
import { Phone, DollarSign, AlertCircle } from 'lucide-react';

interface Props { lang: 'fr' | 'en'; }

const DesignPayments = ({ lang }: Props) => {
  const projects = designStorage.getProjects().filter(p => !p.archived);
  const [filter, setFilter] = useState('all');

  const getPaymentStatus = (p: { prix: number; acompte: number }) => {
    if (p.acompte >= p.prix) return 'paye';
    if (p.acompte > 0) return 'acompte';
    return 'impaye';
  };

  const filtered = useMemo(() => {
    return projects.filter(p => filter === 'all' || getPaymentStatus(p) === filter);
  }, [projects, filter]);

  const totalEncaisse = projects.reduce((s, p) => s + p.acompte, 0);
  const totalSoldes = projects.reduce((s, p) => s + Math.max(0, p.prix - p.acompte), 0);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthEncaisse = projects.filter(p => p.createdAt.startsWith(thisMonth)).reduce((s, p) => s + p.acompte, 0);

  const paymentBadge: Record<string, { label: Record<string, string>; color: string }> = {
    impaye: { label: { fr: 'Impayé', en: 'Unpaid' }, color: 'bg-destructive/15 text-destructive' },
    acompte: { label: { fr: 'Acompte reçu', en: 'Deposit received' }, color: 'bg-or/15 text-or' },
    paye: { label: { fr: 'Tout payé', en: 'Fully paid' }, color: 'bg-emerald-500/15 text-emerald-400' },
  };

  const typeLabel: Record<string, Record<string, string>> = {
    'logo-branding': { fr: 'Logo / Branding', en: 'Logo / Branding' },
    'affiche-flyer': { fr: 'Affiche / Flyer', en: 'Poster / Flyer' },
    'identite-visuelle': { fr: 'Identité visuelle', en: 'Visual identity' },
    'reseaux-sociaux': { fr: 'Réseaux sociaux', en: 'Social media' },
    'autre': { fr: 'Autre', en: 'Other' },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 md:pt-20 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-clash font-bold uppercase tracking-wider mb-6">{lang === 'fr' ? 'Paiements' : 'Payments'}</h1>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
          <DollarSign size={20} className="text-emerald-400 mb-2" />
          <p className="font-clash font-bold text-xl">{monthEncaisse.toLocaleString()} XOF</p>
          <p className="text-xs text-muted-foreground">{lang === 'fr' ? 'Encaissé ce mois' : 'Collected this month'}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4">
          <DollarSign size={20} className="text-or mb-2" />
          <p className="font-clash font-bold text-xl">{totalEncaisse.toLocaleString()} XOF</p>
          <p className="text-xs text-muted-foreground">{lang === 'fr' ? 'Total encaissé' : 'Total collected'}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
          <AlertCircle size={20} className="text-orange-400 mb-2" />
          <p className="font-clash font-bold text-xl">{totalSoldes.toLocaleString()} XOF</p>
          <p className="text-xs text-muted-foreground">{lang === 'fr' ? 'Soldes en attente' : 'Pending balances'}</p>
        </motion.div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['all', 'impaye', 'acompte', 'paye'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl font-satoshi text-sm transition-all ${
              filter === f ? 'bg-or/15 text-or font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            {f === 'all' ? (lang === 'fr' ? 'Tous' : 'All') : paymentBadge[f].label[lang]}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground font-satoshi">{lang === 'fr' ? 'Aucun projet' : 'No projects'}</div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-xs text-muted-foreground font-satoshi">
            <div className="col-span-3">{t('client', lang)}</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">{lang === 'fr' ? 'Prix total' : 'Total price'}</div>
            <div className="col-span-2">{lang === 'fr' ? 'Acompte' : 'Deposit'}</div>
            <div className="col-span-2">{lang === 'fr' ? 'Solde' : 'Balance'}</div>
            <div className="col-span-1"></div>
          </div>

          {filtered.map((p, i) => {
            const status = getPaymentStatus(p);
            const badge = paymentBadge[status];
            const solde = Math.max(0, p.prix - p.acompte);
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card p-4 md:grid md:grid-cols-12 md:gap-2 md:items-center"
              >
                <div className="col-span-3">
                  <p className="font-satoshi font-medium text-sm">{p.client}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium md:hidden ${badge.color}`}>{badge.label[lang]}</span>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">{typeLabel[p.type]?.[lang]}</div>
                <div className="col-span-2 font-clash font-bold text-sm">{p.prix.toLocaleString()} {p.devise}</div>
                <div className="col-span-2 text-sm text-emerald-400">{p.acompte.toLocaleString()} {p.devise}</div>
                <div className={`col-span-2 font-clash font-bold text-sm ${solde > 0 ? 'text-or' : 'text-emerald-400'}`}>
                  {solde.toLocaleString()} {p.devise}
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium hidden md:inline ${badge.color}`}>{badge.label[lang]}</span>
                </div>
                <div className="col-span-1 flex justify-end">
                  {p.phone && solde > 0 && (
                    <a href={`https://wa.me/${p.phone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(lang === 'fr' ? `Bonjour ${p.client}, un rappel concernant le solde restant de ${solde.toLocaleString()} ${p.devise} pour votre projet.` : `Hello ${p.client}, a reminder about the remaining balance of ${solde.toLocaleString()} ${p.devise} for your project.`)}`}
                      target="_blank" className="p-2 rounded-lg hover:bg-emerald-500/15 text-emerald-400"><Phone size={16} /></a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DesignPayments;
