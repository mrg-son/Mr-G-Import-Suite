import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { t } from '@/lib/i18n';
import { storage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { User, Building, Shield, Download, Upload, ToggleLeft, ToggleRight, AlertTriangle, Save, Image } from 'lucide-react';

interface SettingsModuleProps {
  lang: 'fr' | 'en';
  onReset: () => void;
  onProfileUpdate: (name: string) => void;
}

const CURRENCIES = ['XOF', 'EUR', 'USD', 'GBP', 'CAD'];

const SettingsModule = ({ lang, onReset, onProfileUpdate }: SettingsModuleProps) => {
  const { toast } = useToast();
  const profil = storage.getProfil();
  
  const [firstName, setFirstName] = useState(storage.getUser() || '');
  const [companyName, setCompanyName] = useState(profil.nom || '');
  const [logo, setLogo] = useState(profil.logo || '');
  const [devise, setDevise] = useState(profil.devise || 'XOF');
  const [reminderDays, setReminderDays] = useState(storage.getReminderDays());
  const [autosave, setAutosave] = useState(storage.getAutosave());
  
  // PIN change
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  const [resetStep, setResetStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const saveProfile = () => {
    storage.setUser(firstName);
    storage.setProfil({ nom: companyName, logo, devise });
    storage.setReminderDays(reminderDays);
    onProfileUpdate(firstName);
    toast({ title: t('saved', lang) });
  };

  const handlePinChange = () => {
    if (!storage.checkPin(oldPin)) {
      toast({ title: t('pinOldError', lang), variant: 'destructive' });
      return;
    }
    if (newPin.length !== 4 || newPin !== confirmPin) {
      toast({ title: t('pinMismatch', lang), variant: 'destructive' });
      return;
    }
    storage.setPin(newPin);
    setOldPin(''); setNewPin(''); setConfirmPin('');
    toast({ title: t('pinUpdated', lang) });
  };

  const exportJSON = () => {
    const data = {
      user: storage.getUser(),
      profil: storage.getProfil(),
      orders: storage.getOrders(),
      devis: storage.getDevis(),
      lang: storage.getLang(),
      theme: storage.getTheme(),
      reminderDays: storage.getReminderDays(),
      autosave: storage.getAutosave(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mrg-suite-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const orders = storage.getOrders();
    const ws = XLSX.utils.json_to_sheet(orders.map(o => ({
      Client: o.client,
      Téléphone: o.phone,
      Transport: o.transport,
      'Prix réel': o.realPrice,
      'Prix client': o.clientPrice,
      Bénéfice: o.profit,
      'Date commande': o.dateOrder,
      'Date arrivée': o.dateArrival,
      'Date récup.': o.datePickup,
      'Date livraison': o.dateDelivery,
      Statut: o.status,
      Note: o.rating,
      Avis: o.review,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Commandes');
    XLSX.writeFile(wb, `mrg-suite-orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!confirm(t('importConfirm', lang))) return;
        if (data.user) storage.setUser(data.user);
        if (data.profil) storage.setProfil(data.profil);
        if (data.orders) storage.setOrders(data.orders);
        if (data.devis) storage.setDevis(data.devis);
        if (data.lang) storage.setLang(data.lang);
        if (data.theme) storage.setTheme(data.theme);
        if (data.reminderDays) storage.setReminderDays(data.reminderDays);
        toast({ title: t('importSuccess', lang) });
        window.location.reload();
      } catch { toast({ title: 'Invalid JSON', variant: 'destructive' }); }
    };
    reader.readAsText(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    if (resetStep === 0) {
      setResetStep(1);
    } else {
      storage.resetAll();
      onReset();
    }
  };

  const toggleAutosave = () => {
    const next = !autosave;
    setAutosave(next);
    storage.setAutosave(next);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi";

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 md:pt-20 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-clash font-bold uppercase tracking-wider mb-6">
          {t('settingsTitle', lang)}
        </h1>

        {/* Profile Section */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-clash font-bold uppercase tracking-wider text-lg mb-4 flex items-center gap-2">
            <User size={20} className="text-primary" /> {t('profileSection', lang)}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('firstName', lang)}</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('companyName', lang)}</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('companyLogo', lang)}</label>
              <div className="flex items-center gap-4">
                {logo && <img src={logo} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />}
                <button onClick={() => logoInputRef.current?.click()} className="px-4 py-2 rounded-xl bg-secondary border border-border hover:border-primary transition-colors font-satoshi text-sm flex items-center gap-2">
                  <Image size={16} /> {t('uploadLogo', lang)}
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('defaultCurrency', lang)}</label>
                <select value={devise} onChange={e => setDevise(e.target.value)} className={inputClass}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('reminderDays', lang)}</label>
                <input type="number" value={reminderDays} onChange={e => setReminderDays(parseInt(e.target.value) || 3)} className={inputClass} />
              </div>
            </div>
            <button onClick={saveProfile} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <Save size={18} /> {t('saved', lang)}
            </button>
          </div>
        </div>

        {/* Change PIN */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-clash font-bold uppercase tracking-wider text-lg mb-4 flex items-center gap-2">
            <Shield size={20} className="text-or" /> {t('changePin', lang)}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('oldPin', lang)}</label>
              <input type="password" maxLength={4} value={oldPin} onChange={e => setOldPin(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('newPin', lang)}</label>
              <input type="password" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('confirmNewPin', lang)}</label>
              <input type="password" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value)} className={inputClass} />
            </div>
          </div>
          <button onClick={handlePinChange} className="mt-4 px-6 py-2 rounded-xl bg-or text-accent-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity">
            {t('updatePin', lang)}
          </button>
        </div>

        {/* Export / Import */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-clash font-bold uppercase tracking-wider text-lg mb-4 flex items-center gap-2">
            <Download size={20} className="text-bleu-mer" /> {t('exportData', lang)}
          </h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportJSON} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity">
              {t('exportJSON', lang)}
            </button>
            <button onClick={exportExcel} className="px-6 py-3 rounded-xl bg-bleu-mer text-primary-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity">
              {t('exportExcel', lang)}
            </button>
          </div>

          <h2 className="font-clash font-bold uppercase tracking-wider text-lg mt-6 mb-4 flex items-center gap-2">
            <Upload size={20} className="text-primary" /> {t('importData', lang)}
          </h2>
          <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 rounded-xl bg-secondary border border-border hover:border-primary font-clash font-bold uppercase text-sm tracking-wider transition-colors">
            {t('importJSON', lang)}
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={importJSON} />
        </div>

        {/* Auto-save */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-clash font-bold uppercase tracking-wider text-lg">{t('autoSave', lang)}</h2>
              <p className="text-sm text-muted-foreground font-satoshi">{t('autoSaveDesc', lang)}</p>
            </div>
            <button onClick={toggleAutosave} className="text-primary">
              {autosave ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card p-6 border-2 border-destructive/30">
          <h2 className="font-clash font-bold uppercase tracking-wider text-lg mb-4 flex items-center gap-2 text-destructive">
            <AlertTriangle size={20} /> {t('dangerZone', lang)}
          </h2>
          {resetStep === 0 ? (
            <button onClick={handleReset} className="px-6 py-3 rounded-xl bg-destructive text-destructive-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity">
              {t('resetAll', lang)}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-destructive font-satoshi font-medium">{t('resetConfirm', lang)}</p>
              <div className="flex gap-3">
                <button onClick={handleReset} className="px-6 py-3 rounded-xl bg-destructive text-destructive-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity">
                  {t('resetConfirm2', lang)}
                </button>
                <button onClick={() => setResetStep(0)} className="px-6 py-3 rounded-xl bg-secondary font-clash font-bold uppercase text-sm tracking-wider">
                  {lang === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsModule;
