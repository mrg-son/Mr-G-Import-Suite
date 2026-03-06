import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/lib/i18n';
import { storage, PaymentMethod } from '@/lib/storage';
import { addExport, getAllExports, deleteExport, clearExports, type ExportRecord } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { User, Shield, Download, Upload, ToggleLeft, ToggleRight, AlertTriangle, Save, Image, Wallet, Plus, Trash2, X, Clock, FileJson, FileSpreadsheet } from 'lucide-react';

interface SettingsModuleProps {
  lang: 'fr' | 'en';
  onReset: () => void;
  onProfileUpdate: (name: string) => void;
}

const CURRENCIES = ['XOF', 'EUR', 'USD', 'GBP', 'CAD'];
const genId = () => Math.random().toString(36).slice(2, 10);

const SettingsModule = ({ lang, onReset, onProfileUpdate }: SettingsModuleProps) => {
  const { toast } = useToast();
  const profil = storage.getProfil();
  const paymentData = storage.getPayment();

  const [firstName, setFirstName] = useState(storage.getUser() || '');
  const [companyName, setCompanyName] = useState(profil.nom || '');
  const [logo, setLogo] = useState(profil.logo || '');
  const [devise, setDevise] = useState(profil.devise || 'XOF');
  const [reminderDays, setReminderDays] = useState(storage.getReminderDays());
  const [autosave, setAutosave] = useState(storage.getAutosave());
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(paymentData.methods || []);

  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetStep, setResetStep] = useState(0);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const payLogoRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});


  useEffect(() => {
    getAllExports().then(setExportHistory).catch(() => {});
  }, []);

  const refreshExportHistory = () => {
    getAllExports().then(setExportHistory).catch(() => {});
  };

  const saveProfile = () => {
    storage.setUser(firstName);
    storage.setProfil({ nom: companyName, logo, devise });
    storage.setReminderDays(reminderDays);
    storage.setPayment({ moovPhone: '', yasPhone: '', methods: paymentMethods });
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

  const exportJSON = async () => {
    const data = {
      user: storage.getUser(), profil: storage.getProfil(), orders: storage.getOrders(),
      devis: storage.getDevis(), lang: storage.getLang(), theme: storage.getTheme(),
      reminderDays: storage.getReminderDays(), autosave: storage.getAutosave(),
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const filename = `mrg-suite-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = filename;
    a.click(); URL.revokeObjectURL(url);

    // Save to IndexedDB history
    await addExport({
      id: Math.random().toString(36).slice(2, 10),
      date: new Date().toISOString(),
      type: 'json',
      filename,
      data: jsonStr,
      size: new Blob([jsonStr]).size,
    });
    refreshExportHistory();
    toast({ title: lang === 'fr' ? 'Export sauvegardé dans l\'historique' : 'Export saved to history' });
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const orders = storage.getOrders();
    const ws = XLSX.utils.json_to_sheet(orders.map(o => ({
      Client: o.client, Téléphone: o.phone, Transport: o.transport,
      'Prix réel': o.realPrice, 'Prix client': o.clientPrice, Bénéfice: o.profit,
      'Date commande': o.dateOrder, Statut: o.status, Note: o.rating, Avis: o.review,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Commandes');
    const filename = `mrg-suite-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);

    // Save metadata to history (not the binary)
    const jsonBackup = JSON.stringify({ orders, exportedAt: new Date().toISOString() });
    await addExport({
      id: Math.random().toString(36).slice(2, 10),
      date: new Date().toISOString(),
      type: 'excel',
      filename,
      data: jsonBackup,
      size: new Blob([jsonBackup]).size,
    });
    refreshExportHistory();
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
    if (resetStep === 0) { setResetStep(1); }
    else { storage.resetAll(); onReset(); }
  };

  const toggleAutosave = () => {
    const next = !autosave;
    setAutosave(next);
    storage.setAutosave(next);
  };

  // Payment methods management
  const addPaymentMethod = () => {
    setPaymentMethods(prev => [...prev, { id: genId(), name: '', phone: '', logo: '' }]);
  };

  const updatePaymentMethod = (id: string, patch: Partial<PaymentMethod>) => {
    setPaymentMethods(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const removePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(m => m.id !== id));
  };

  const handlePayLogoUpload = (methodId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updatePaymentMethod(methodId, { logo: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi transition-colors duration-200";

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } }),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 md:pt-20 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-clash font-bold uppercase tracking-wider mb-6">
          {t('settingsTitle', lang)}
        </h1>

        {/* Profile Section */}
        <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible" className="glass-card p-6 mb-6">
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
                <AnimatePresence mode="wait">
                  {logo ? (
                    <motion.div
                      key="logo"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="relative group"
                    >
                      <img src={logo} alt="Logo" className="w-14 h-14 rounded-xl object-cover border-2 border-primary/30 shadow-lg" />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setLogo('')}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <X size={12} />
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="no-logo"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-14 h-14 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center"
                    >
                      <Image size={20} className="text-muted-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => logoInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-secondary border border-border hover:border-primary transition-all duration-200 font-satoshi text-sm flex items-center gap-2"
                >
                  <Image size={16} /> {logo ? (lang === 'fr' ? 'Changer' : 'Change') : t('uploadLogo', lang)}
                </motion.button>
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
          </div>
        </motion.div>

        {/* Payment Methods */}
        <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-clash font-bold uppercase tracking-wider text-lg flex items-center gap-2">
              <Wallet size={20} className="text-bleu-mer" /> {t('paymentInfo', lang)}
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={addPaymentMethod}
              className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary font-clash font-bold uppercase text-xs flex items-center gap-1.5 hover:bg-primary/25 transition-colors"
            >
              <Plus size={14} /> {lang === 'fr' ? 'Ajouter' : 'Add'}
            </motion.button>
          </div>

          <AnimatePresence>
            {paymentMethods.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-muted-foreground font-satoshi text-sm text-center py-6"
              >
                {lang === 'fr' ? 'Aucun moyen de paiement. Cliquez sur Ajouter.' : 'No payment methods. Click Add.'}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            <AnimatePresence>
              {paymentMethods.map((method, i) => (
                <motion.div
                  key={method.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 transition-colors duration-200"
                >
                  <div className="flex items-start gap-3">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                      <input
                        ref={el => { payLogoRefs.current[method.id] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handlePayLogoUpload(method.id, e)}
                      />
                      {method.logo ? (
                        <div className="relative group cursor-pointer" onClick={() => payLogoRefs.current[method.id]?.click()}>
                          <img src={method.logo} alt="" className="w-12 h-12 rounded-xl object-cover border border-border shadow-sm" />
                          <div className="absolute inset-0 rounded-xl bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Image size={16} className="text-foreground" />
                          </div>
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => payLogoRefs.current[method.id]?.click()}
                          className="w-12 h-12 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors"
                        >
                          <Image size={16} className="text-muted-foreground" />
                        </motion.button>
                      )}
                    </div>

                    {/* Fields */}
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        value={method.name}
                        onChange={e => updatePaymentMethod(method.id, { name: e.target.value })}
                        placeholder={lang === 'fr' ? 'Nom (ex: Orange Money)' : 'Name (e.g. Orange Money)'}
                        className="px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none font-satoshi text-sm transition-colors"
                      />
                      <input
                        value={method.phone}
                        onChange={e => updatePaymentMethod(method.id, { phone: e.target.value })}
                        placeholder={lang === 'fr' ? 'Numéro' : 'Number'}
                        className="px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none font-satoshi text-sm transition-colors"
                      />
                    </div>

                    {/* Delete */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removePaymentMethod(method.id)}
                      className="flex-shrink-0 w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Save button */}
        <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible" className="mb-6">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveProfile}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-bleu-mer text-primary-foreground font-clash font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
          >
            <Save size={18} /> {t('saved', lang)}
          </motion.button>
        </motion.div>

        {/* Change PIN */}
        <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible" className="glass-card p-6 mb-6">
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
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePinChange}
            className="mt-4 px-6 py-2 rounded-xl bg-or text-accent-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity"
          >
            {t('updatePin', lang)}
          </motion.button>
        </motion.div>

        {/* Export / Import */}
        <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible" className="glass-card p-6 mb-6">
          <h2 className="font-clash font-bold uppercase tracking-wider text-lg mb-4 flex items-center gap-2">
            <Download size={20} className="text-bleu-mer" /> {t('exportData', lang)}
          </h2>
          <div className="flex flex-wrap gap-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportJSON} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity">
              {t('exportJSON', lang)}
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportExcel} className="px-6 py-3 rounded-xl bg-bleu-mer text-primary-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity">
              {t('exportExcel', lang)}
            </motion.button>
          </div>

          <h2 className="font-clash font-bold uppercase tracking-wider text-lg mt-6 mb-4 flex items-center gap-2">
            <Upload size={20} className="text-primary" /> {t('importData', lang)}
          </h2>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => fileInputRef.current?.click()} className="px-6 py-3 rounded-xl bg-secondary border border-border hover:border-primary font-clash font-bold uppercase text-sm tracking-wider transition-colors">
            {t('importJSON', lang)}
          </motion.button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={importJSON} />
        </motion.div>

        {/* Auto-save */}
        <motion.div custom={5} variants={sectionVariants} initial="hidden" animate="visible" className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-clash font-bold uppercase tracking-wider text-lg">{t('autoSave', lang)}</h2>
              <p className="text-sm text-muted-foreground font-satoshi">{t('autoSaveDesc', lang)}</p>
            </div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={toggleAutosave} className="text-primary">
              {autosave ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-muted-foreground" />}
            </motion.button>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div custom={6} variants={sectionVariants} initial="hidden" animate="visible" className="glass-card p-6 border-2 border-destructive/30">
          <h2 className="font-clash font-bold uppercase tracking-wider text-lg mb-4 flex items-center gap-2 text-destructive">
            <AlertTriangle size={20} /> {t('dangerZone', lang)}
          </h2>
          <AnimatePresence mode="wait">
            {resetStep === 0 ? (
              <motion.button key="step0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleReset} className="px-6 py-3 rounded-xl bg-destructive text-destructive-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity">
                {t('resetAll', lang)}
              </motion.button>
            ) : (
              <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <p className="text-destructive font-satoshi font-medium">{t('resetConfirm', lang)}</p>
                <div className="flex gap-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleReset} className="px-6 py-3 rounded-xl bg-destructive text-destructive-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity">
                    {t('resetConfirm2', lang)}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setResetStep(0)} className="px-6 py-3 rounded-xl bg-secondary font-clash font-bold uppercase text-sm tracking-wider">
                    {lang === 'fr' ? 'Annuler' : 'Cancel'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SettingsModule;
