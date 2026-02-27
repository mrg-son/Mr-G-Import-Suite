import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/lib/i18n';
import { Plus, Trash2, Ship, Plane } from 'lucide-react';

interface PackageItem {
  id: string;
  length: string;
  width: string;
  height: string;
  weight: string;
}

const CURRENCIES = ['XOF', 'EUR', 'USD', 'GBP', 'CAD'];

const formatNumber = (n: number, currency: string) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' ' + currency;

const MultiPackageCalculator = ({ lang }: { lang: 'fr' | 'en' }) => {
  const [currency, setCurrency] = useState('XOF');
  const [tarifCbm, setTarifCbm] = useState('');
  const [tarifKg, setTarifKg] = useState('');
  const [packages, setPackages] = useState<PackageItem[]>([
    { id: '1', length: '', width: '', height: '', weight: '' },
  ]);
  const [results, setResults] = useState<{
    totalVolume: number;
    totalWeight: number;
    costBoat: number;
    costPlane: number;
    perPackage: { volume: number; weight: number; costBoat: number; costPlane: number }[];
  } | null>(null);

  const addPackage = () => {
    setPackages(p => [...p, { id: Date.now().toString(), length: '', width: '', height: '', weight: '' }]);
  };

  const removePackage = (id: string) => {
    if (packages.length <= 1) return;
    setPackages(p => p.filter(pkg => pkg.id !== id));
  };

  const updatePackage = (id: string, field: keyof PackageItem, value: string) => {
    setPackages(p => p.map(pkg => pkg.id === id ? { ...pkg, [field]: value } : pkg));
  };

  const calculate = () => {
    const cbm = parseFloat(tarifCbm);
    const kg = parseFloat(tarifKg);
    if (isNaN(cbm) || isNaN(kg)) return;

    const perPackage = packages.map(pkg => {
      const l = parseFloat(pkg.length) || 0;
      const w = parseFloat(pkg.width) || 0;
      const h = parseFloat(pkg.height) || 0;
      const wt = parseFloat(pkg.weight) || 0;
      const volume = (l * w * h) / 1_000_000;
      return {
        volume,
        weight: wt,
        costBoat: volume * cbm,
        costPlane: wt * kg,
      };
    });

    const totalVolume = perPackage.reduce((s, p) => s + p.volume, 0);
    const totalWeight = perPackage.reduce((s, p) => s + p.weight, 0);
    const costBoat = perPackage.reduce((s, p) => s + p.costBoat, 0);
    const costPlane = perPackage.reduce((s, p) => s + p.costPlane, 0);

    setResults({ totalVolume, totalWeight, costBoat, costPlane, perPackage });
  };

  return (
    <div className="space-y-4">
      {/* Global rates */}
      <div className="grid grid-cols-3 gap-4">
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
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('tarifKg', lang)}</label>
          <input type="number" value={tarifKg} onChange={e => setTarifKg(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi" />
        </div>
      </div>

      {/* Packages list */}
      <div className="space-y-3">
        <AnimatePresence>
          {packages.map((pkg, idx) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-clash font-bold text-sm uppercase tracking-wider">
                  {lang === 'fr' ? `Colis ${idx + 1}` : `Package ${idx + 1}`}
                </span>
                {packages.length > 1 && (
                  <button onClick={() => removePackage(pkg.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 font-satoshi">{t('length', lang)}</label>
                  <input type="number" value={pkg.length} onChange={e => updatePackage(pkg.id, 'length', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 font-satoshi">{t('width', lang)}</label>
                  <input type="number" value={pkg.width} onChange={e => updatePackage(pkg.id, 'width', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 font-satoshi">{t('height', lang)}</label>
                  <input type="number" value={pkg.height} onChange={e => updatePackage(pkg.id, 'height', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 font-satoshi">{t('weight', lang)}</label>
                  <input type="number" value={pkg.weight} onChange={e => updatePackage(pkg.id, 'weight', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi text-sm" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button onClick={addPackage} className="w-full py-2 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary font-satoshi text-sm flex items-center justify-center gap-2 transition-colors">
        <Plus size={16} /> {lang === 'fr' ? 'Ajouter un colis' : 'Add package'}
      </button>

      <button onClick={calculate} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
        {t('calculate', lang)} ({packages.length} {lang === 'fr' ? 'colis' : 'pkg'})
      </button>

      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6 space-y-4"
          >
            <h3 className="font-clash font-bold uppercase tracking-wider text-lg">{t('result', lang)}</h3>

            {/* Per package breakdown */}
            <div className="space-y-2">
              {results.perPackage.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm font-satoshi py-1 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{lang === 'fr' ? `Colis ${i + 1}` : `Pkg ${i + 1}`}</span>
                  <span>{p.volume.toFixed(4)} m³ / {p.weight} kg</span>
                  <div className="flex gap-3">
                    <span className="text-bleu-mer flex items-center gap-1"><Ship size={12} /> {formatNumber(p.costBoat, currency)}</span>
                    <span className="text-or flex items-center gap-1"><Plane size={12} /> {formatNumber(p.costPlane, currency)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
              <div className="glass-card p-4 text-center">
                <Ship size={20} className="text-bleu-mer mx-auto mb-1" />
                <p className="text-xs text-muted-foreground font-satoshi uppercase">{t('totalBoat', lang)}</p>
                <p className="text-xl font-bold font-satoshi text-bleu-mer">{formatNumber(results.costBoat, currency)}</p>
                <p className="text-xs text-muted-foreground font-satoshi">{results.totalVolume.toFixed(4)} m³</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Plane size={20} className="text-or mx-auto mb-1" />
                <p className="text-xs text-muted-foreground font-satoshi uppercase">{t('totalPlane', lang)}</p>
                <p className="text-xl font-bold font-satoshi text-or">{formatNumber(results.costPlane, currency)}</p>
                <p className="text-xs text-muted-foreground font-satoshi">{results.totalWeight} kg</p>
              </div>
            </div>

            {/* Recommendation */}
            <div className="text-center pt-2">
              <p className="text-sm font-satoshi text-muted-foreground">
                {results.costBoat < results.costPlane
                  ? (lang === 'fr' ? '🚢 Le bateau est plus économique' : '🚢 Sea shipping is cheaper')
                  : (lang === 'fr' ? '✈️ L\'avion est plus économique' : '✈️ Air shipping is cheaper')}
              </p>
              <p className="text-lg font-bold font-clash text-primary">
                {lang === 'fr' ? 'Économie: ' : 'Savings: '}
                {formatNumber(Math.abs(results.costBoat - results.costPlane), currency)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MultiPackageCalculator;
