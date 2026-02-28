import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/lib/i18n';
import { storage, MrgDevis, DevisLigne, MrgOrder } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, FileText, ArrowLeft, Download, Eye, Image, RefreshCw, X, Ship, Plane, Calculator, ZoomIn, Crop } from 'lucide-react';

interface DevisMakerProps {
  lang: 'fr' | 'en';
  onNavigate: (tab: string) => void;
}

const CURRENCIES = ['XOF', 'EUR', 'USD', 'GBP', 'CAD'];
const genId = () => Math.random().toString(36).slice(2, 10);

const emptyLine = (): DevisLigne => ({
  id: genId(),
  image: '',
  description: '',
  quantite: 1,
  prixUnitaire: 0,
  fraisExpedition: 0,
  prixTotal: 0,
  fraisRecupBateau: 0,
  fraisRecupAvion: 0,
  modeChoisi: 'bateau',
});

const calcLineTotal = (l: DevisLigne) => (l.quantite * l.prixUnitaire) + l.fraisExpedition;
const formatNum = (n: number, c: string) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' ' + c;

const genDevisNumber = () => {
  const y = new Date().getFullYear();
  const existing = storage.getDevis();
  return `#${y}-${String(existing.length + 1).padStart(3, '0')}`;
};

// Mini freight calculator popup
const MiniFreightCalc = ({ type, lang, onApply, onClose }: { type: 'boat' | 'plane'; lang: 'fr' | 'en'; onApply: (cost: number) => void; onClose: () => void }) => {
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [tarifCbm, setTarifCbm] = useState('');
  const [weight, setWeight] = useState('');
  const [tarifKg, setTarifKg] = useState('');

  const calculate = () => {
    if (type === 'boat') {
      const l = parseFloat(length), w = parseFloat(width), h = parseFloat(height), tarif = parseFloat(tarifCbm);
      if ([l, w, h, tarif].some(isNaN)) return;
      const volume = (l * w * h) / 1_000_000;
      onApply(volume * tarif);
    } else {
      const w = parseFloat(weight), tarif = parseFloat(tarifKg);
      if ([w, tarif].some(isNaN)) return;
      onApply(w * tarif);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi text-sm";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute z-50 top-full left-0 mt-2 w-72 glass-card p-4 shadow-xl border border-primary/30"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-clash font-bold text-sm uppercase flex items-center gap-2">
          {type === 'boat' ? <Ship size={14} className="text-bleu-mer" /> : <Plane size={14} className="text-or" />}
          {type === 'boat' ? t('calcBoatFees', lang) : t('calcPlaneFees', lang)}
        </h4>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
      </div>

      {type === 'boat' ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-muted-foreground mb-0.5">{t('length', lang)}</label>
              <input type="number" value={length} onChange={e => setLength(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-0.5">{t('width', lang)}</label>
              <input type="number" value={width} onChange={e => setWidth(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-0.5">{t('height', lang)}</label>
              <input type="number" value={height} onChange={e => setHeight(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">{t('tarifCbm', lang)}</label>
            <input type="number" value={tarifCbm} onChange={e => setTarifCbm(e.target.value)} className={inputClass} />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">{t('weight', lang)}</label>
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">{t('tarifKg', lang)}</label>
            <input type="number" value={tarifKg} onChange={e => setTarifKg(e.target.value)} className={inputClass} />
          </div>
        </div>
      )}

      <button onClick={calculate} className="w-full mt-3 py-2 rounded-lg bg-primary text-primary-foreground font-clash font-bold uppercase text-xs hover:opacity-90 transition-opacity">
        {t('applyCalc', lang)}
      </button>
    </motion.div>
  );
};

// Image zoom/crop dialog
const ImageDialog = ({ src, lang: dlang, onClose, onCrop }: { src: string; lang: 'fr' | 'en'; onClose: () => void; onCrop: (cropped: string) => void }) => {
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const applyCrop = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    const sScale = scale;
    const sw = size / sScale;
    const sh = size / sScale;
    const sx = (img.naturalWidth / 2) - (sw / 2) - (offsetX * img.naturalWidth / size);
    const sy = (img.naturalHeight / 2) - (sh / 2) - (offsetY * img.naturalHeight / size);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
    onCrop(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="glass-card p-6 max-w-md w-full space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-clash font-bold uppercase tracking-wider text-sm">Image</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-secondary aspect-square flex items-center justify-center">
          <img
            ref={imgRef}
            src={src}
            alt=""
            className="max-w-full max-h-full object-contain transition-transform"
            style={{ transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)` }}
            crossOrigin="anonymous"
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <ZoomIn size={14} className="text-muted-foreground flex-shrink-0" />
            <input type="range" min="0.5" max="3" step="0.1" value={scale} onChange={e => setScale(parseFloat(e.target.value))} className="w-full accent-primary" />
            <span className="text-xs font-satoshi text-muted-foreground w-10">{Math.round(scale * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-4">X</span>
            <input type="range" min="-50" max="50" step="1" value={offsetX} onChange={e => setOffsetX(parseInt(e.target.value))} className="w-full accent-primary" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-4">Y</span>
            <input type="range" min="-50" max="50" step="1" value={offsetY} onChange={e => setOffsetY(parseInt(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>
        <button onClick={applyCrop} className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          <Crop size={14} /> {dlang === 'fr' ? 'Rogner et appliquer' : 'Crop & apply'}
        </button>
      </motion.div>
    </motion.div>
  );
};

const DevisMaker = ({ lang, onNavigate }: DevisMakerProps) => {
  const { toast } = useToast();
  const profil = storage.getProfil();
  const payment = storage.getPayment();
  const [view, setView] = useState<'list' | 'edit' | 'preview'>('list');
  const [allDevis, setAllDevis] = useState<MrgDevis[]>(storage.getDevis());
  const previewRef = useRef<HTMLDivElement>(null);
  const [miniCalc, setMiniCalc] = useState<{ lineId: string; type: 'boat' | 'plane' } | null>(null);
  const [zoomImage, setZoomImage] = useState<{ lineId: string; src: string } | null>(null);

  const [currentDevis, setCurrentDevis] = useState<MrgDevis>({
    id: genId(),
    numero: genDevisNumber(),
    client: '',
    clientPhone: '',
    devise: profil.devise || 'XOF',
    logoEntreprise: profil.logo || '',
    nomEntreprise: profil.nom || '',
    lignes: [emptyLine()],
    totalBateau: 0,
    totalAvion: 0,
    totalPersonnalise: 0,
    statut: 'brouillon',
    orderId: '',
    createdAt: new Date().toISOString(),
  });

  // NEW LOGIC: 
  // totalBateau = ALL lines as if shipped by boat: (qty*price + expedition + fraisRecupBateau)
  // totalAvion = ALL lines as if shipped by plane: (qty*price + expedition + fraisRecupAvion)
  // totalPersonnalise = each line uses its chosen mode
  const recalcTotals = useCallback((lignes: DevisLigne[]) => {
    let totalBateau = 0, totalAvion = 0, totalPersonnalise = 0;
    lignes.forEach(l => {
      const base = (l.quantite * l.prixUnitaire) + l.fraisExpedition;
      // All by boat
      totalBateau += base + l.fraisRecupBateau;
      // All by plane
      totalAvion += base + l.fraisRecupAvion;
      // Personalized based on chosen mode
      if (l.modeChoisi === 'bateau') {
        totalPersonnalise += base + l.fraisRecupBateau;
      } else if (l.modeChoisi === 'avion') {
        totalPersonnalise += base + l.fraisRecupAvion;
      } else {
        // mix/personnalise: use both
        totalPersonnalise += base + l.fraisRecupBateau + l.fraisRecupAvion;
      }
    });
    return { totalBateau, totalAvion, totalPersonnalise };
  }, []);

  const updateLine = (id: string, patch: Partial<DevisLigne>) => {
    setCurrentDevis(prev => {
      const lignes = prev.lignes.map(l => {
        if (l.id !== id) return l;
        const updated = { ...l, ...patch };
        updated.prixTotal = calcLineTotal(updated);
        return updated;
      });
      const totals = recalcTotals(lignes);
      return { ...prev, lignes, ...totals };
    });
  };

  const addLine = () => setCurrentDevis(prev => ({ ...prev, lignes: [...prev.lignes, emptyLine()] }));
  const removeLine = (id: string) => {
    setCurrentDevis(prev => {
      const lignes = prev.lignes.filter(l => l.id !== id);
      return { ...prev, lignes, ...recalcTotals(lignes) };
    });
  };

  const handleImageUpload = (lineId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateLine(lineId, { image: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const saveDevis = () => {
    const existing = storage.getDevis();
    const idx = existing.findIndex(d => d.id === currentDevis.id);
    if (idx >= 0) existing[idx] = currentDevis;
    else existing.push(currentDevis);
    storage.setDevis(existing);
    setAllDevis(existing);
    toast({ title: t('devisSaved', lang) });
  };

  const resetCurrentDevis = () => {
    setCurrentDevis(prev => ({
      ...prev,
      client: '',
      clientPhone: '',
      lignes: [emptyLine()],
      totalBateau: 0,
      totalAvion: 0,
      totalPersonnalise: 0,
    }));
  };

  const convertToOrder = () => {
    if (!confirm(t('convertConfirm', lang))) return;
    const order: MrgOrder = {
      id: genId(),
      client: currentDevis.client,
      phone: currentDevis.clientPhone,
      transport: 'mix',
      realPrice: currentDevis.lignes.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0),
      clientPrice: currentDevis.totalPersonnalise,
      profit: 0,
      dateOrder: new Date().toISOString().slice(0, 10),
      dateArrival: '', datePickup: '', dateDelivery: '',
      status: 'en-cours',
      photos: [], rating: 0, review: '', suggestions: '',
      devisId: currentDevis.id,
      createdAt: new Date().toISOString(),
    };
    order.profit = order.clientPrice - order.realPrice;
    const orders = storage.getOrders();
    orders.push(order);
    storage.setOrders(orders);
    setCurrentDevis(prev => ({ ...prev, statut: 'confirme', orderId: order.id }));
    saveDevis();
    toast({ title: t('devisConverted', lang) });
    onNavigate('orders');
  };

  const exportPDF = () => {
    const el = previewRef.current;
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Devis ${currentDevis.numero}</title><style>body{font-family:Satoshi,sans-serif;padding:40px;color:#1a2a35}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#1a2a35;color:white;text-transform:uppercase;font-size:12px}.total{font-size:18px;font-weight:bold}.payment-section{margin-top:24px;padding:16px;border-top:2px solid #ddd}.payment-row{display:flex;align-items:center;gap:16px;margin-top:8px}img.payment-logo{width:40px;height:auto;border-radius:6px}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const exportPNG = async () => {
    const el = previewRef.current;
    if (!el) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el);
      const link = document.createElement('a');
      link.download = `devis-${currentDevis.numero}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch {
      toast({ title: 'PNG export requires html2canvas', variant: 'destructive' });
    }
  };

  const newDevis = () => {
    setCurrentDevis({
      id: genId(), numero: genDevisNumber(), client: '', clientPhone: '',
      devise: profil.devise || 'XOF', logoEntreprise: profil.logo || '',
      nomEntreprise: profil.nom || '', lignes: [emptyLine()],
      totalBateau: 0, totalAvion: 0, totalPersonnalise: 0,
      statut: 'brouillon', orderId: '', createdAt: new Date().toISOString(),
    });
    setView('edit');
  };

  const editDevis = (d: MrgDevis) => { setCurrentDevis(d); setView('edit'); };
  const deleteDevis = (id: string) => {
    const updated = allDevis.filter(d => d.id !== id);
    storage.setDevis(updated);
    setAllDevis(updated);
  };

  const inputClass = "w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none font-satoshi text-sm";

  // LIST VIEW
  if (view === 'list') {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-24 md:pt-20 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-clash font-bold uppercase tracking-wider">{t('devisTitle', lang)}</h1>
            <button onClick={newDevis} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2">
              <Plus size={18} /> {t('newDevis', lang)}
            </button>
          </div>
          {allDevis.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-satoshi">{t('noDevis', lang)}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allDevis.map(d => (
                <div key={d.id} className="glass-card p-4 flex items-center justify-between">
                  <div>
                    <span className="font-clash font-bold text-primary">{d.numero}</span>
                    <span className="mx-3 text-muted-foreground">—</span>
                    <span className="font-satoshi">{d.client || '—'}</span>
                    <span className={`ml-3 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                      d.statut === 'brouillon' ? 'bg-muted text-muted-foreground' :
                      d.statut === 'envoye' ? 'bg-bleu-mer/20 text-bleu-mer' :
                      'bg-primary/20 text-primary'
                    }`}>
                      {d.statut === 'brouillon' ? t('draft', lang) : d.statut === 'envoye' ? t('sent', lang) : t('confirmed', lang)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editDevis(d)} className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-bold uppercase font-clash hover:bg-primary/25 transition-colors">{t('editDevis', lang)}</button>
                    <button onClick={() => deleteDevis(d.id)} className="px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive text-xs font-bold uppercase font-clash hover:bg-destructive/25 transition-colors">{t('deleteDevis', lang)}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // PREVIEW VIEW
  if (view === 'preview') {
    const methods = payment.methods || [];

    return (
      <div className="max-w-4xl mx-auto px-4 pt-24 md:pt-20 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('edit')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-satoshi text-sm transition-colors">
            <ArrowLeft size={16} /> {t('back', lang)}
          </button>
          <div className="ml-auto flex gap-3">
            <button onClick={exportPDF} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase text-xs tracking-wider hover:opacity-90 flex items-center gap-2">
              <Download size={14} /> {t('exportPDF', lang)}
            </button>
            <button onClick={exportPNG} className="px-4 py-2 rounded-xl bg-or text-accent-foreground font-clash font-bold uppercase text-xs tracking-wider hover:opacity-90 flex items-center gap-2">
              <Download size={14} /> {t('exportPNG', lang)}
            </button>
          </div>
        </div>

        <div ref={previewRef} className="bg-background rounded-2xl p-8 border border-border">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              {currentDevis.logoEntreprise && <img src={currentDevis.logoEntreprise} alt="" className="w-12 h-12 rounded-lg object-cover" />}
              <span className="font-clash font-bold text-xl">{currentDevis.nomEntreprise}</span>
            </div>
            <div className="text-right">
              <p className="font-clash font-bold text-primary text-lg">{currentDevis.numero}</p>
              <p className="font-satoshi text-sm text-muted-foreground">{new Date(currentDevis.createdAt).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {/* Client info */}
          <div className="mb-6">
            <p className="font-satoshi"><strong>{t('clientName', lang)}:</strong> {currentDevis.client}</p>
            <p className="font-satoshi"><strong>{t('clientPhone', lang)}:</strong> {currentDevis.clientPhone}</p>
          </div>

          {/* Table */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-card">
                <th className="p-2 text-left font-clash uppercase text-xs">N°</th>
                <th className="p-2 text-center font-clash uppercase text-xs">IMAGES</th>
                <th className="p-2 text-left font-clash uppercase text-xs">{t('description', lang)}</th>
                <th className="p-2 text-right font-clash uppercase text-xs">{t('quantity', lang)}</th>
                <th className="p-2 text-right font-clash uppercase text-xs">{t('unitPrice', lang)} ({currentDevis.devise})</th>
                <th className="p-2 text-right font-clash uppercase text-xs">{t('lineTotal', lang)} ({currentDevis.devise})</th>
              </tr>
            </thead>
            <tbody>
              {currentDevis.lignes.map((l, i) => (
                <tr key={l.id} className="border-b border-border">
                  <td className="p-2 font-satoshi">{i + 1}</td>
                  <td className="p-2 text-center">
                    {l.image ? (
                      <img src={l.image} alt="" className="w-14 h-14 rounded-lg object-cover inline-block" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted inline-flex items-center justify-center">
                        <Image size={16} className="text-muted-foreground" />
                      </div>
                    )}
                  </td>
                  <td className="p-2 font-satoshi">{l.description}</td>
                  <td className="p-2 text-right font-satoshi">{l.quantite}</td>
                  <td className="p-2 text-right font-satoshi">{formatNum(l.prixUnitaire, currentDevis.devise)}</td>
                  <td className="p-2 text-right font-satoshi font-bold">{formatNum(l.prixTotal, currentDevis.devise)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Shipping details table */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-card">
                <th className="p-2 text-left font-clash uppercase text-xs">N°</th>
                <th className="p-2 text-right font-clash uppercase text-xs">{t('shippingFees', lang)}</th>
                <th className="p-2 text-right font-clash uppercase text-xs">{t('boatRecovery', lang)}</th>
                <th className="p-2 text-right font-clash uppercase text-xs">{t('planeRecovery', lang)}</th>
                <th className="p-2 text-center font-clash uppercase text-xs">{t('modeChoisi', lang)}</th>
              </tr>
            </thead>
            <tbody>
              {currentDevis.lignes.map((l, i) => (
                <tr key={l.id} className="border-b border-border">
                  <td className="p-2 font-satoshi">{i + 1}</td>
                  <td className="p-2 text-right font-satoshi">{formatNum(l.fraisExpedition, currentDevis.devise)}</td>
                  <td className="p-2 text-right font-satoshi">{formatNum(l.fraisRecupBateau, currentDevis.devise)}</td>
                  <td className="p-2 text-right font-satoshi">{formatNum(l.fraisRecupAvion, currentDevis.devise)}</td>
                  <td className="p-2 text-center font-satoshi capitalize">{l.modeChoisi}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-bleu-mer/15 text-center">
              <p className="font-clash uppercase text-xs tracking-wider text-bleu-mer">{t('totalBoat', lang)}</p>
              <p className="font-satoshi text-sm text-muted-foreground mb-1">{lang === 'fr' ? '(Si tout par bateau)' : '(If all by sea)'}</p>
              <p className="font-satoshi font-bold text-xl">{formatNum(currentDevis.totalBateau, currentDevis.devise)}</p>
            </div>
            <div className="p-4 rounded-xl bg-or/15 text-center">
              <p className="font-clash uppercase text-xs tracking-wider text-or">{t('totalPlane', lang)}</p>
              <p className="font-satoshi text-sm text-muted-foreground mb-1">{lang === 'fr' ? '(Si tout par avion)' : '(If all by air)'}</p>
              <p className="font-satoshi font-bold text-xl">{formatNum(currentDevis.totalAvion, currentDevis.devise)}</p>
            </div>
            <div className="p-4 rounded-xl bg-primary/15 text-center">
              <p className="font-clash uppercase text-xs tracking-wider text-primary">{t('totalCustom', lang)}</p>
              <p className="font-satoshi text-sm text-muted-foreground mb-1">{lang === 'fr' ? '(Mix personnalisé)' : '(Custom mix)'}</p>
              <p className="font-satoshi font-bold text-xl">{formatNum(currentDevis.totalPersonnalise, currentDevis.devise)}</p>
            </div>
          </div>

          {/* Payment Info */}
          {methods.length > 0 && (
            <div className="border-t-2 border-primary/20 pt-6 mt-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-0.5 bg-primary rounded-full" />
                <p className="font-clash font-bold uppercase tracking-wider text-sm text-primary">{t('paymentInfo', lang)}</p>
                <div className="flex-1 h-0.5 bg-primary/20 rounded-full" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {methods.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                    {m.logo ? (
                      <img src={m.logo} alt={m.name} className="w-10 h-10 rounded-xl object-cover shadow-sm border border-border" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground font-clash">
                        {m.name?.slice(0, 2).toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-clash font-bold text-xs uppercase tracking-wider text-muted-foreground truncate">{m.name}</p>
                      <p className="font-satoshi font-bold text-sm">{m.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // EDIT VIEW
  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 md:pt-20 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => setView('list')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-satoshi text-sm mb-4 transition-colors">
          <ArrowLeft size={16} /> {t('back', lang)}
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-clash font-bold uppercase tracking-wider">{currentDevis.numero}</h1>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { saveDevis(); setView('preview'); }} className="px-4 py-2 rounded-xl bg-or/15 text-or font-clash font-bold uppercase text-xs hover:bg-or/25 transition-colors flex items-center gap-2">
              <Eye size={14} /> {t('preview', lang)}
            </button>
            <button onClick={saveDevis} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-clash font-bold uppercase text-xs hover:opacity-90 transition-opacity">
              {t('saveDevis', lang)}
            </button>
            <button onClick={resetCurrentDevis} className="px-4 py-2 rounded-xl bg-destructive/15 text-destructive font-clash font-bold uppercase text-xs hover:bg-destructive/25 transition-colors flex items-center gap-2">
              <RefreshCw size={14} /> {t('resetDevis', lang)}
            </button>
            <button onClick={convertToOrder} className="px-4 py-2 rounded-xl bg-bleu-mer text-primary-foreground font-clash font-bold uppercase text-xs hover:opacity-90 transition-opacity flex items-center gap-2">
              <RefreshCw size={14} /> {t('convertToOrder', lang)}
            </button>
          </div>
        </div>

        {/* Header fields */}
        <div className="glass-card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('clientName', lang)}</label>
              <input value={currentDevis.client} onChange={e => setCurrentDevis(p => ({ ...p, client: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('clientPhone', lang)}</label>
              <input value={currentDevis.clientPhone} onChange={e => setCurrentDevis(p => ({ ...p, clientPhone: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">{t('currency', lang)}</label>
              <select value={currentDevis.devise} onChange={e => setCurrentDevis(p => ({ ...p, devise: e.target.value }))} className={inputClass}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="space-y-4 mb-6">
          <AnimatePresence>
            {currentDevis.lignes.map((line, i) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-clash font-bold text-primary text-sm">#{i + 1}</span>
                  {currentDevis.lignes.length > 1 && (
                    <button onClick={() => removeLine(line.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1 font-satoshi">{t('description', lang)}</label>
                    <input value={line.description} onChange={e => updateLine(line.id, { description: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 font-satoshi">{t('quantity', lang)}</label>
                    <input type="number" value={line.quantite} onChange={e => updateLine(line.id, { quantite: parseInt(e.target.value) || 0 })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 font-satoshi">{t('unitPrice', lang)}</label>
                    <input type="number" value={line.prixUnitaire} onChange={e => updateLine(line.id, { prixUnitaire: parseFloat(e.target.value) || 0 })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 font-satoshi">{t('shippingFees', lang)}</label>
                    <input type="number" value={line.fraisExpedition} onChange={e => updateLine(line.id, { fraisExpedition: parseFloat(e.target.value) || 0 })} className={inputClass} />
                  </div>

                  {/* Boat recovery with mini calc */}
                  <div className="relative">
                    <label className="block text-xs text-muted-foreground mb-1 font-satoshi">{t('boatRecovery', lang)}</label>
                    <div className="flex gap-1">
                      <input type="number" value={line.fraisRecupBateau} onChange={e => updateLine(line.id, { fraisRecupBateau: parseFloat(e.target.value) || 0 })} className={inputClass} />
                      <button
                        onClick={() => setMiniCalc(miniCalc?.lineId === line.id && miniCalc.type === 'boat' ? null : { lineId: line.id, type: 'boat' })}
                        className="px-2 rounded-lg bg-bleu-mer/15 text-bleu-mer hover:bg-bleu-mer/25 transition-colors flex-shrink-0"
                        title={t('calcBoatFees', lang)}
                      >
                        <Calculator size={14} />
                      </button>
                    </div>
                    <AnimatePresence>
                      {miniCalc?.lineId === line.id && miniCalc.type === 'boat' && (
                        <MiniFreightCalc
                          type="boat"
                          lang={lang}
                          onClose={() => setMiniCalc(null)}
                          onApply={(cost) => { updateLine(line.id, { fraisRecupBateau: cost }); setMiniCalc(null); }}
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Plane recovery with mini calc */}
                  <div className="relative">
                    <label className="block text-xs text-muted-foreground mb-1 font-satoshi">{t('planeRecovery', lang)}</label>
                    <div className="flex gap-1">
                      <input type="number" value={line.fraisRecupAvion} onChange={e => updateLine(line.id, { fraisRecupAvion: parseFloat(e.target.value) || 0 })} className={inputClass} />
                      <button
                        onClick={() => setMiniCalc(miniCalc?.lineId === line.id && miniCalc.type === 'plane' ? null : { lineId: line.id, type: 'plane' })}
                        className="px-2 rounded-lg bg-or/15 text-or hover:bg-or/25 transition-colors flex-shrink-0"
                        title={t('calcPlaneFees', lang)}
                      >
                        <Calculator size={14} />
                      </button>
                    </div>
                    <AnimatePresence>
                      {miniCalc?.lineId === line.id && miniCalc.type === 'plane' && (
                        <MiniFreightCalc
                          type="plane"
                          lang={lang}
                          onClose={() => setMiniCalc(null)}
                          onApply={(cost) => { updateLine(line.id, { fraisRecupAvion: cost }); setMiniCalc(null); }}
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 font-satoshi">{t('modeChoisi', lang)}</label>
                    <select value={line.modeChoisi} onChange={e => updateLine(line.id, { modeChoisi: e.target.value as DevisLigne['modeChoisi'] })} className={inputClass}>
                      <option value="bateau">{t('bateau', lang)}</option>
                      <option value="avion">{t('avion', lang)}</option>
                      <option value="mix">Mix</option>
                      <option value="personnalise">{lang === 'fr' ? 'Personnalisé' : 'Custom'}</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-2 py-1 rounded-lg bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-xs font-satoshi">
                      <Image size={14} />
                      {line.image ? (lang === 'fr' ? 'Changer' : 'Change') : (lang === 'fr' ? 'Ajouter image' : 'Add image')}
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(line.id, e)} />
                    </label>
                    {line.image && (
                      <div className="flex items-center gap-1">
                        <img src={line.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
                        <button
                          onClick={() => setZoomImage({ lineId: line.id, src: line.image })}
                          className="p-1 rounded-lg bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title={lang === 'fr' ? 'Agrandir / Rogner' : 'Zoom / Crop'}
                        >
                          <ZoomIn size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="font-satoshi font-bold text-primary">{t('lineTotal', lang)}: {formatNum(line.prixTotal, currentDevis.devise)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <button onClick={addLine} className="w-full py-3 rounded-xl border-2 border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors font-clash font-bold uppercase text-sm flex items-center justify-center gap-2">
            <Plus size={18} /> {t('addLine', lang)}
          </button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="font-clash uppercase text-xs tracking-wider text-bleu-mer">{t('totalBoat', lang)}</p>
            <p className="font-satoshi text-[10px] text-muted-foreground">{lang === 'fr' ? 'Si tout par bateau' : 'If all by sea'}</p>
            <p className="font-satoshi font-bold text-2xl mt-1">{formatNum(currentDevis.totalBateau, currentDevis.devise)}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="font-clash uppercase text-xs tracking-wider text-or">{t('totalPlane', lang)}</p>
            <p className="font-satoshi text-[10px] text-muted-foreground">{lang === 'fr' ? 'Si tout par avion' : 'If all by air'}</p>
            <p className="font-satoshi font-bold text-2xl mt-1">{formatNum(currentDevis.totalAvion, currentDevis.devise)}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="font-clash uppercase text-xs tracking-wider text-primary">{t('totalCustom', lang)}</p>
            <p className="font-satoshi text-[10px] text-muted-foreground">{lang === 'fr' ? 'Mix personnalisé' : 'Custom mix'}</p>
            <p className="font-satoshi font-bold text-2xl mt-1">{formatNum(currentDevis.totalPersonnalise, currentDevis.devise)}</p>
          </div>
        </div>
      </motion.div>

      {/* Image zoom/crop dialog */}
      <AnimatePresence>
        {zoomImage && (
          <ImageDialog
            src={zoomImage.src}
            lang={lang}
            onClose={() => setZoomImage(null)}
            onCrop={(cropped) => {
              updateLine(zoomImage.lineId, { image: cropped });
              setZoomImage(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DevisMaker;
