import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/lib/i18n';
import { Ship, Plane, Scale, Package, ArrowLeft } from 'lucide-react';
import MultiPackageCalculator from './MultiPackageCalculator';

interface FreightCalculatorProps {
  lang: 'fr' | 'en';
}

type FreightMode = 'home' | 'boat' | 'plane' | 'compare' | 'multi';

const modes = [
  { key: 'boat' as const, labelKey: 'boatCalc' as const, descKey: 'boatDesc' as const, icon: Ship, color: 'bg-bleu-mer/15 text-bleu-mer' },
  { key: 'plane' as const, labelKey: 'planeCalc' as const, descKey: 'planeDesc' as const, icon: Plane, color: 'bg-or/15 text-or' },
  { key: 'compare' as const, labelKey: 'compareCalc' as const, descKey: 'compareDesc' as const, icon: Scale, color: 'bg-primary/15 text-primary' },
  { key: 'multi' as const, labelKey: 'multiCalc' as const, descKey: 'multiDesc' as const, icon: Package, color: 'bg-muted text-muted-foreground' },
];

const CURRENCIES = ['XOF', 'EUR', 'USD', 'GBP', 'CAD'];

const formatNumber = (n: number, currency: string) => {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' ' + currency;
};

const BoatCalculator = ({ lang }: { lang: 'fr' | 'en' }) => {
  const [currency, setCurrency] = useState('XOF');
  const [tarifCbm, setTarifCbm] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [result, setResult] = useState<{ volume: number; cost: number } | null>(null);

  const calculate = () => {
    const l = parseFloat(length), w = parseFloat(width), h = parseFloat(height), tarif = parseFloat(tarifCbm);
    if ([l, w, h, tarif].some(isNaN)) return;
    const volume = (l * w * h) / 1_000_000;
    const cost = volume * tarif;
    setResult({ volume, cost });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('currency', lang)}</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi">
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('tarifCbm', lang)}</label>
          <input type="number" value={tarifCbm} onChange={e => setTarifCbm(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('length', lang)}</label>
          <input type="number" value={length} onChange={e => setLength(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('width', lang)}</label>
          <input type="number" value={width} onChange={e => setWidth(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('height', lang)}</label>
          <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi" />
        </div>
      </div>

      <button onClick={calculate} className="w-full py-3 rounded-xl bg-bleu-mer text-primary-foreground font-clash font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
        {t('calculate', lang)}
      </button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6 space-y-3"
          >
            <h3 className="font-clash font-bold uppercase tracking-wider text-lg">{t('result', lang)}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-satoshi uppercase">{t('volume', lang)}</p>
                <p className="text-xl font-bold font-satoshi">{result.volume.toFixed(4)} m³</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-satoshi uppercase">{t('totalCost', lang)}</p>
                <p className="text-xl font-bold font-satoshi text-primary">{formatNumber(result.cost, currency)}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground font-satoshi uppercase">{t('deliveryTime', lang)}</p>
              <p className="text-sm font-satoshi flex items-center gap-2">
                <Ship size={14} className="text-bleu-mer" /> {t('days45_60', lang)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PlaneCalculator = ({ lang }: { lang: 'fr' | 'en' }) => {
  const [currency, setCurrency] = useState('XOF');
  const [weight, setWeight] = useState('');
  const [tarifKg, setTarifKg] = useState('');
  const [result, setResult] = useState<{ cost: number } | null>(null);

  const calculate = () => {
    const w = parseFloat(weight), tarif = parseFloat(tarifKg);
    if ([w, tarif].some(isNaN)) return;
    setResult({ cost: w * tarif });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('currency', lang)}</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi">
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('weight', lang)}</label>
          <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('tarifKg', lang)}</label>
          <input type="number" value={tarifKg} onChange={e => setTarifKg(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi" />
        </div>
      </div>

      <button onClick={calculate} className="w-full py-3 rounded-xl bg-or text-accent-foreground font-clash font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
        {t('calculate', lang)}
      </button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6 space-y-3"
          >
            <h3 className="font-clash font-bold uppercase tracking-wider text-lg">{t('result', lang)}</h3>
            <div>
              <p className="text-xs text-muted-foreground font-satoshi uppercase">{t('totalCost', lang)}</p>
              <p className="text-xl font-bold font-satoshi text-or">{formatNumber(result.cost, currency)}</p>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground font-satoshi uppercase">{t('deliveryTime', lang)}</p>
              <p className="text-sm font-satoshi flex items-center gap-2">
                <Plane size={14} className="text-or" /> {t('days7_14', lang)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FreightCalculator = ({ lang }: FreightCalculatorProps) => {
  const [mode, setMode] = useState<FreightMode>('home');

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 md:pt-20 pb-8">
      <AnimatePresence mode="wait">
        {mode === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h1 className="text-3xl font-clash font-bold uppercase tracking-wider mb-6">
              {t('freightTitle', lang)}
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {modes.map((m, i) => {
                const Icon = m.icon;
                return (
                  <motion.button
                    key={m.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setMode(m.key)}
                    className="glass-card p-6 text-left hover:scale-[1.02] transition-transform group"
                  >
                    <div className={`w-12 h-12 rounded-xl ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon size={24} />
                    </div>
                    <h3 className="font-clash font-bold uppercase tracking-wider">{t(m.labelKey, lang)}</h3>
                    <p className="text-sm text-muted-foreground font-satoshi mt-1">{t(m.descKey, lang)}</p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <button
              onClick={() => setMode('home')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-satoshi text-sm mb-6 transition-colors"
            >
              <ArrowLeft size={16} />
              {lang === 'fr' ? 'Retour' : 'Back'}
            </button>

            <h2 className="text-2xl font-clash font-bold uppercase tracking-wider mb-6 flex items-center gap-3">
              {mode === 'boat' && <><Ship size={28} className="text-bleu-mer" /> {t('boatCalc', lang)}</>}
              {mode === 'plane' && <><Plane size={28} className="text-or" /> {t('planeCalc', lang)}</>}
              {mode === 'compare' && <><Scale size={28} className="text-primary" /> {t('compareCalc', lang)}</>}
              {mode === 'multi' && <><Package size={28} /> {t('multiCalc', lang)}</>}
            </h2>

            <div className="glass-card p-6">
              {mode === 'boat' && <BoatCalculator lang={lang} />}
              {mode === 'plane' && <PlaneCalculator lang={lang} />}
              {mode === 'compare' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-clash font-bold uppercase text-sm tracking-wider mb-4 flex items-center gap-2">
                      <Ship size={16} className="text-bleu-mer" /> {t('boatCalc', lang)}
                    </h3>
                    <BoatCalculator lang={lang} />
                  </div>
                  <div>
                    <h3 className="font-clash font-bold uppercase text-sm tracking-wider mb-4 flex items-center gap-2">
                      <Plane size={16} className="text-or" /> {t('planeCalc', lang)}
                    </h3>
                    <PlaneCalculator lang={lang} />
                  </div>
                </div>
              )}
              {mode === 'multi' && <MultiPackageCalculator lang={lang} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FreightCalculator;
