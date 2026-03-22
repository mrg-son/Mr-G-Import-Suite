import { motion } from 'framer-motion';
import { Package, Palette } from 'lucide-react';
import { t } from '@/lib/i18n';
import OceanBackground from './OceanBackground';

interface HubScreenProps {
  lang: 'fr' | 'en';
  userName: string;
  onSelect: (app: 'import' | 'design') => void;
}

const HubScreen = ({ lang, userName, onSelect }: HubScreenProps) => {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <OceanBackground />
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-clash font-bold mb-2">
            {t('hubWelcome', lang)}{' '}
            <span className="text-gradient-teal">{userName}</span>
          </h1>
          <p className="text-muted-foreground font-satoshi text-lg">
            {t('hubSubtitle', lang)}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Mr. G Import */}
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            onClick={() => onSelect('import')}
            className="glass-card p-8 text-center group hover:scale-[1.03] transition-all duration-300 cursor-pointer"
          >
            <div className="w-20 h-20 rounded-2xl bg-bleu-mer/15 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
              <Package size={40} className="text-bleu-mer" />
            </div>
            <h2 className="font-clash font-bold text-2xl uppercase tracking-wider mb-2">
              {t('hubImportTitle', lang)}
            </h2>
            <p className="text-muted-foreground font-satoshi text-sm">
              {t('hubImportDesc', lang)}
            </p>
          </motion.button>

          {/* Mr. G Design */}
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            onClick={() => onSelect('design')}
            className="glass-card p-8 text-center group hover:scale-[1.03] transition-all duration-300 cursor-pointer"
          >
            <div className="w-20 h-20 rounded-2xl bg-or/15 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
              <Palette size={40} className="text-or" />
            </div>
            <h2 className="font-clash font-bold text-2xl uppercase tracking-wider mb-2">
              {t('hubDesignTitle', lang)}
            </h2>
            <p className="text-muted-foreground font-satoshi text-sm">
              {t('hubDesignDesc', lang)}
            </p>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default HubScreen;
