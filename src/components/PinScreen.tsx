import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { storage } from '@/lib/storage';
import { t } from '@/lib/i18n';
import OceanBackground from './OceanBackground';

interface PinScreenProps {
  lang: 'fr' | 'en';
  userName: string;
  onUnlock: () => void;
}

const PinScreen = ({ lang, userName, onUnlock }: PinScreenProps) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const handleInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const arr = [...pin];
    arr[index] = value.slice(-1);
    setPin(arr);
    setError(false);

    if (value && index < 3) {
      refs.current[index + 1]?.focus();
    }

    // Auto-check when all filled
    if (value && index === 3) {
      const fullPin = arr.join('');
      if (fullPin.length === 4) {
        setTimeout(() => {
          if (storage.checkPin(fullPin)) {
            onUnlock();
          } else {
            setError(true);
            setPin(['', '', '', '']);
            refs.current[0]?.focus();
          }
        }, 150);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-background overflow-hidden">
      <OceanBackground />
      <motion.div
        className="glass-card p-10 w-full max-w-sm mx-6 z-10"
        animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
            <span className="text-2xl font-clash font-bold text-primary">MG</span>
          </div>
          <p className="text-muted-foreground font-satoshi">
            {t('pinWelcome', lang)} <span className="text-primary font-bold">{userName}</span>
          </p>
          <h2 className="text-xl font-clash font-bold uppercase tracking-wider mt-1">
            {t('pinTitle', lang)}
          </h2>
        </div>

        <div className="flex gap-4 justify-center mt-8">
          {pin.map((v, i) => (
            <input
              key={i}
              ref={el => { refs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={v}
              onChange={e => handleInput(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-16 h-16 text-center text-2xl font-bold rounded-2xl bg-secondary border-2 focus:outline-none transition-all font-satoshi ${
                error ? 'border-destructive' : 'border-border focus:border-primary'
              }`}
            />
          ))}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-destructive text-center text-sm mt-4 font-satoshi"
          >
            {t('pinError', lang)}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
};

export default PinScreen;
