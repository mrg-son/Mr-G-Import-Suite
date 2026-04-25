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
  const [lockedUntil, setLockedUntil] = useState<number>(() => {
    const v = parseInt(localStorage.getItem('mrg_pin_locked_until') || '0', 10);
    return isNaN(v) ? 0 : v;
  });
  const [now, setNow] = useState(Date.now());
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const LOCKOUT_AFTER = 5;
  const BASE_LOCKOUT_MS = 30_000;

  useEffect(() => { refs.current[0]?.focus(); }, []);

  // Tick to refresh countdown while locked
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = lockedUntil > now;
  const remainingSec = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const registerFailure = () => {
    const fails = parseInt(localStorage.getItem('mrg_pin_fails') || '0', 10) + 1;
    localStorage.setItem('mrg_pin_fails', String(fails));
    if (fails >= LOCKOUT_AFTER) {
      // Exponential backoff: 30s, 60s, 120s, ...
      const rounds = Math.floor(fails / LOCKOUT_AFTER);
      const lockMs = BASE_LOCKOUT_MS * Math.pow(2, rounds - 1);
      const until = Date.now() + lockMs;
      localStorage.setItem('mrg_pin_locked_until', String(until));
      setLockedUntil(until);
    }
  };

  const resetFailures = () => {
    localStorage.removeItem('mrg_pin_fails');
    localStorage.removeItem('mrg_pin_locked_until');
    setLockedUntil(0);
  };

  const handleInput = (index: number, value: string) => {
    if (isLocked) return;
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
        setTimeout(async () => {
          const ok = await storage.checkPin(fullPin);
          if (ok) {
            resetFailures();
            onUnlock();
          } else {
            registerFailure();
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
              disabled={isLocked}
              onChange={e => handleInput(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-16 h-16 text-center text-2xl font-bold rounded-2xl bg-secondary border-2 focus:outline-none transition-all font-satoshi disabled:opacity-50 disabled:cursor-not-allowed ${
                error || isLocked ? 'border-destructive' : 'border-border focus:border-primary'
              }`}
            />
          ))}
        </div>

        {isLocked ? (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-destructive text-center text-sm mt-4 font-satoshi"
          >
            {lang === 'fr'
              ? `Trop de tentatives. Réessayez dans ${remainingSec}s.`
              : `Too many attempts. Try again in ${remainingSec}s.`}
          </motion.p>
        ) : error && (
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
