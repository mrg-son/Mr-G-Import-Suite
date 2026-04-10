import { motion } from 'framer-motion';
import { t } from '@/lib/i18n';
import { storage } from '@/lib/storage';
import { Ship, Plane, FileText, Package, Settings, GraduationCap } from 'lucide-react';

interface DashboardProps {
  lang: 'fr' | 'en';
  onNavigate: (tab: string) => void;
}

const allModules = [
  { key: 'freight', labelKey: 'freightCalc' as const, descKey: 'freightDesc' as const, icon: Ship, color: 'bg-primary/15 text-primary', tab: 'freight' },
  { key: 'devis', labelKey: 'devisMaker' as const, descKey: 'devisDesc' as const, icon: FileText, color: 'bg-or/15 text-or', tab: 'devis' },
  { key: 'tracker', labelKey: 'importTracker' as const, descKey: 'trackerDesc' as const, icon: Package, color: 'bg-bleu-mer/15 text-bleu-mer', tab: 'orders' },
  { key: 'formations', labelKey: 'formationsTitle' as const, descKey: 'formationsDesc' as const, icon: GraduationCap, color: 'bg-or/15 text-or', tab: 'formations' },
  { key: 'settings', labelKey: 'settings' as const, descKey: 'settingsDesc' as const, icon: Settings, color: 'bg-muted text-muted-foreground', tab: 'settings' },
];

const Dashboard = ({ lang, onNavigate }: DashboardProps) => {
  const modules = storage.getOrdersDisabled() ? allModules.filter(m => m.tab !== 'orders') : allModules;
  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 md:pt-20 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl md:text-4xl font-clash font-bold uppercase tracking-wider mb-2">
          {t('dashboardTitle', lang)}
        </h1>
        <p className="text-muted-foreground font-satoshi mb-8">
          Mr.G Suite — {lang === 'fr' ? 'Calculez. Devisez. Suivez.' : 'Calculate. Quote. Track.'}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <motion.button
              key={mod.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
              onClick={() => onNavigate(mod.tab)}
              className="glass-card p-6 text-left hover:scale-[1.02] transition-transform duration-200 group"
            >
              <div className={`w-12 h-12 rounded-xl ${mod.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
              </div>
              <h3 className="font-clash font-bold text-lg uppercase tracking-wider mb-1">
                {t(mod.labelKey, lang)}
              </h3>
              <p className="text-sm text-muted-foreground font-satoshi">
                {t(mod.descKey, lang)}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
