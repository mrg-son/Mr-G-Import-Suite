import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/lib/i18n';

interface SplashScreenProps {
  lang: 'fr' | 'en';
  userName: string;
  onEnter: () => void;
}

const SplashScreen = ({ lang, userName, onEnter }: SplashScreenProps) => {
  const [exiting, setExiting] = useState(false);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(onEnter, 800);
  };

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-ocean"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Left panel */}
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 bg-gradient-ocean z-20"
            animate={exiting ? { x: '-100%' } : { x: 0 }}
            transition={{ duration: 0.7, ease: [0.77, 0, 0.18, 1] }}
          />
          {/* Right panel */}
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 bg-gradient-ocean z-20"
            animate={exiting ? { x: '100%' } : { x: 0 }}
            transition={{ duration: 0.7, ease: [0.77, 0, 0.18, 1] }}
          />

          <div className="relative z-30 text-center px-6">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-teal font-clash font-bold text-sm uppercase tracking-[0.2em] mb-4"
            >
              {t('splashTagline', lang)}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-foreground/70 font-satoshi text-lg mb-1">
                {t('splashWelcome', lang)}
              </p>
              <h1 className="text-5xl md:text-7xl font-clash font-bold text-foreground">
                Mr.G Suite{' '}
                <span className="text-gradient-teal">{userName}</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-muted-foreground font-satoshi text-lg mt-4 tracking-wide"
            >
              {t('splashSubtitle', lang)}
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              onClick={handleEnter}
              className="mt-10 px-10 py-3 rounded-xl border-2 border-primary text-primary font-clash font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all duration-300"
            >
              {t('splashEnter', lang)}
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <motion.div className="min-h-screen relative overflow-hidden">
          {/* Splitting panels */}
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 bg-gradient-ocean z-50"
            initial={{ x: 0 }}
            animate={{ x: '-100%' }}
            transition={{ duration: 0.7, ease: [0.77, 0, 0.18, 1] }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 bg-gradient-ocean z-50"
            initial={{ x: 0 }}
            animate={{ x: '100%' }}
            transition={{ duration: 0.7, ease: [0.77, 0, 0.18, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
