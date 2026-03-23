import { motion } from 'framer-motion';
import { t } from '@/lib/i18n';
import { designStorage } from '@/lib/designStorage';
import { getTypeLabel } from '@/components/DesignProjects';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Briefcase, DollarSign, Clock, CheckCircle } from 'lucide-react';

interface Props {
  lang: 'fr' | 'en';
  onNavigate: (tab: string) => void;
}

const DesignDashboard = ({ lang, onNavigate }: Props) => {
  const projects = designStorage.getProjects().filter(p => !p.archived);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const enCours = projects.filter(p => p.statut === 'en-cours' || p.statut === 'discussion').length;
  const monthRevenue = projects
    .filter(p => p.createdAt.startsWith(thisMonth))
    .reduce((s, p) => s + p.acompte, 0);
  const awaitingPayment = projects.filter(p => p.statut === 'livre' && p.acompte < p.prix).length;
  const deliveredMonth = projects.filter(p => p.statut === 'livre' && p.createdAt.startsWith(thisMonth)).length
    + projects.filter(p => p.statut === 'paye' && p.createdAt.startsWith(thisMonth)).length;

  // Chart: last 6 months revenue
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' });
    const revenue = projects.filter(p => p.createdAt.startsWith(key)).reduce((s, p) => s + p.acompte, 0);
    return { name: label, revenue };
  });

  const recent = [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const statusColor: Record<string, string> = {
    discussion: 'bg-muted-foreground/20 text-muted-foreground',
    'en-cours': 'bg-purple-500/15 text-purple-400',
    livre: 'bg-or/15 text-or',
    paye: 'bg-emerald-500/15 text-emerald-400',
  };

  const statusLabel: Record<string, string> = {
    discussion: lang === 'fr' ? 'Discussion' : 'Discussion',
    'en-cours': lang === 'fr' ? 'En cours' : 'In progress',
    livre: lang === 'fr' ? 'Livré' : 'Delivered',
    paye: lang === 'fr' ? 'Payé' : 'Paid',
  };

  const stats = [
    { icon: Briefcase, label: lang === 'fr' ? 'Projets en cours' : 'Active projects', value: enCours, color: 'text-or' },
    { icon: DollarSign, label: t('thisMonth', lang), value: `${monthRevenue.toLocaleString()} XOF`, color: 'text-emerald-400' },
    { icon: Clock, label: lang === 'fr' ? 'En attente paiement' : 'Awaiting payment', value: awaitingPayment, color: 'text-orange-400' },
    { icon: CheckCircle, label: lang === 'fr' ? 'Livrés ce mois' : 'Delivered this month', value: deliveredMonth, color: 'text-primary' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 md:pt-20 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-clash font-bold uppercase tracking-wider mb-1">{t('navDashboard', lang)}</h1>
        <p className="text-muted-foreground font-satoshi mb-6">Mr.G Design</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }} className="glass-card p-4">
            <s.icon size={20} className={`${s.color} mb-2`} />
            <p className="text-2xl font-clash font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground font-satoshi">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 mb-8">
        <h3 className="font-clash font-bold mb-4">{t('last6Months', lang)}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontFamily: 'Satoshi' }} />
            <Bar dataKey="revenue" fill="hsl(var(--or))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Recent projects */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-clash font-bold">{lang === 'fr' ? 'Projets récents' : 'Recent projects'}</h3>
          <button onClick={() => onNavigate('design-projects')} className="text-or text-sm font-satoshi hover:underline">
            {lang === 'fr' ? 'Voir tout' : 'See all'}
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="text-muted-foreground font-satoshi text-sm">{lang === 'fr' ? 'Aucun projet' : 'No projects'}</p>
        ) : (
          <div className="space-y-3">
            {recent.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="font-satoshi font-medium text-sm">{p.client}</p>
                  <p className="text-xs text-muted-foreground">{p.type.replace(/-/g, ' ')}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[p.statut]}`}>
                  {statusLabel[p.statut]}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DesignDashboard;
