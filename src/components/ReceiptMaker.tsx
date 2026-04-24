import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Download, MessageCircle, Eye, ArrowLeft, Receipt as ReceiptIcon, Search, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { receiptStorage, type MrgReceipt } from '@/lib/receiptStorage';
import type { ReceiptSource, PaymentMode, ReceiptType } from '@/lib/db';
import { storage } from '@/lib/storage';
import { designStorage } from '@/lib/designStorage';
import { formationStorage } from '@/lib/formationStorage';
import { t } from '@/lib/i18n';
import { fileNames } from '@/lib/fileNaming';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface Props {
  lang: 'fr' | 'en';
  scope?: 'import' | 'design' | 'all';
}

type View = 'list' | 'create' | 'preview';

interface SourceOption {
  source: ReceiptSource;
  id: string;
  label: string;
  client: string;
  clientPhone: string;
  totalAttendu: number;
  totalDejaPaye: number;
  devise: string;
}

const fmt = (n: number, devise: string) => {
  const safe = isFinite(n) ? n : 0;
  return `${safe.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${devise}`;
};

// Number to words (FR + EN, simple version up to 999 999 999)
function numberToWords(n: number, lang: 'fr' | 'en'): string {
  if (n === 0) return lang === 'fr' ? 'zéro' : 'zero';
  const intPart = Math.floor(Math.abs(n));
  const fr = {
    units: ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'],
    tens: ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'],
  };
  const en = {
    units: ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'],
    tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
  };
  const dict = lang === 'fr' ? fr : en;

  function below1000(num: number): string {
    if (num === 0) return '';
    let s = '';
    const h = Math.floor(num / 100);
    const r = num % 100;
    if (h > 0) {
      if (lang === 'fr') s += (h === 1 ? 'cent' : `${dict.units[h]} cent${h > 1 && r === 0 ? 's' : ''}`);
      else s += `${dict.units[h]} hundred`;
      if (r > 0) s += ' ';
    }
    if (r < 20) s += dict.units[r];
    else {
      const t10 = Math.floor(r / 10);
      const u = r % 10;
      if (lang === 'fr') {
        if (t10 === 7 || t10 === 9) {
          s += dict.tens[t10] + (u === 1 && t10 === 7 ? ' et ' : '-') + dict.units[10 + u];
        } else {
          s += dict.tens[t10];
          if (u === 1 && t10 < 8) s += ' et un';
          else if (u > 0) s += '-' + dict.units[u];
          else if (t10 === 8) s += 's';
        }
      } else {
        s += dict.tens[t10];
        if (u > 0) s += '-' + dict.units[u];
      }
    }
    return s.trim();
  }

  let result = '';
  const billions = Math.floor(intPart / 1_000_000_000);
  const millions = Math.floor((intPart % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((intPart % 1_000_000) / 1000);
  const rest = intPart % 1000;

  if (billions > 0) result += below1000(billions) + (lang === 'fr' ? ' milliard' + (billions > 1 ? 's ' : ' ') : ' billion ');
  if (millions > 0) result += below1000(millions) + (lang === 'fr' ? ' million' + (millions > 1 ? 's ' : ' ') : ' million ');
  if (thousands > 0) result += (thousands === 1 && lang === 'fr' ? '' : below1000(thousands) + ' ') + (lang === 'fr' ? 'mille ' : 'thousand ');
  if (rest > 0) result += below1000(rest);
  return result.trim();
}

export default function ReceiptMaker({ lang, scope = 'all' }: Props) {
  const [view, setView] = useState<View>('list');
  const [receipts, setReceipts] = useState<MrgReceipt[]>(receiptStorage.getReceipts());
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [editing, setEditing] = useState<MrgReceipt | null>(null);
  const [previewing, setPreviewing] = useState<MrgReceipt | null>(null);
  const [exportStyle, setExportStyle] = useState<'dark' | 'white'>('dark');

  // Form state
  const [form, setForm] = useState({
    source: 'manual' as ReceiptSource,
    sourceId: '',
    client: '',
    clientPhone: '',
    sourceLabel: '',
    montant: 0,
    devise: storage.getProfil().devise || 'XOF',
    modePaiement: 'mobile-money' as PaymentMode,
    modePaiementCustom: '',
    type: 'acompte' as ReceiptType,
    totalAttendu: 0,
    totalDejaPaye: 0,
    notes: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const [confirmFullyPaid, setConfirmFullyPaid] = useState<{ open: boolean; sourceType: ReceiptSource; sourceId: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const profil = storage.getProfil();

  // Reload from cache when needed
  const reload = () => setReceipts([...receiptStorage.getReceipts()]);

  // Build source options
  const sourceOptions: SourceOption[] = useMemo(() => {
    const opts: SourceOption[] = [];
    if (scope !== 'design') {
      storage.getOrders().filter(o => !o.archived).forEach(o => {
        opts.push({
          source: 'order', id: o.id,
          label: `${t('sourceOrder', lang)} — ${o.client}`,
          client: o.client, clientPhone: o.phone,
          totalAttendu: o.clientPrice || 0,
          totalDejaPaye: receipts.filter(r => r.source === 'order' && r.sourceId === o.id).reduce((s, r) => s + r.montant, 0),
          devise: storage.getProfil().devise || 'XOF',
        });
      });
      storage.getDevis().forEach(d => {
        const total = d.totalPersonnalise || d.totalBateau || d.totalAvion || 0;
        opts.push({
          source: 'devis', id: d.id,
          label: `${t('sourceDevis', lang)} ${d.numero} — ${d.client}`,
          client: d.client, clientPhone: d.clientPhone,
          totalAttendu: total,
          totalDejaPaye: receipts.filter(r => r.source === 'devis' && r.sourceId === d.id).reduce((s, r) => s + r.montant, 0),
          devise: d.devise || 'XOF',
        });
      });
      formationStorage.getFormations().filter(f => !f.archived).forEach(f => {
        opts.push({
          source: 'formation', id: f.id,
          label: `${t('sourceFormation', lang)} — ${f.client}`,
          client: f.client, clientPhone: f.phone,
          totalAttendu: f.prix || 0,
          totalDejaPaye: f.acompte || 0,
          devise: f.devise || 'XOF',
        });
      });
    }
    if (scope !== 'import') {
      designStorage.getProjects().filter(p => !p.archived).forEach(p => {
        opts.push({
          source: 'design-project', id: p.id,
          label: `${t('sourceDesignProject', lang)} — ${p.client}`,
          client: p.client, clientPhone: p.phone,
          totalAttendu: p.prix || 0,
          totalDejaPaye: p.acompte || 0,
          devise: p.devise || 'XOF',
        });
      });
      designStorage.getDevis().forEach(d => {
        opts.push({
          source: 'design-devis', id: d.id,
          label: `${t('sourceDesignDevis', lang)} ${d.numero} — ${d.client}`,
          client: d.client, clientPhone: d.clientPhone,
          totalAttendu: d.total || 0,
          totalDejaPaye: receipts.filter(r => r.source === 'design-devis' && r.sourceId === d.id).reduce((s, r) => s + r.montant, 0),
          devise: d.devise || 'XOF',
        });
      });
    }
    return opts;
  }, [receipts, lang, scope]);

  const filtered = useMemo(() => {
    return receipts
      .filter(r => scope === 'all' ||
        (scope === 'import' && (r.source === 'order' || r.source === 'devis' || r.source === 'formation' || r.source === 'manual')) ||
        (scope === 'design' && (r.source === 'design-project' || r.source === 'design-devis')))
      .filter(r => filterSource === 'all' || r.source === filterSource)
      .filter(r => filterMode === 'all' || r.modePaiement === filterMode)
      .filter(r => !search || r.client.toLowerCase().includes(search.toLowerCase()) || r.numero.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [receipts, search, filterSource, filterMode, scope]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = receipts.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const collected = thisMonth.reduce((s, r) => s + r.montant, 0);
    const modeCount: Record<string, number> = {};
    receipts.forEach(r => { modeCount[r.modePaiement] = (modeCount[r.modePaiement] || 0) + 1; });
    const dominant = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    return { collected, count: receipts.length, dominant, devise: profil.devise || 'XOF' };
  }, [receipts, profil.devise]);

  const newReceipt = (preselect?: Partial<typeof form>) => {
    setForm({
      source: 'manual', sourceId: '', client: '', clientPhone: '', sourceLabel: '',
      montant: 0, devise: profil.devise || 'XOF',
      modePaiement: 'mobile-money', modePaiementCustom: '',
      type: 'acompte', totalAttendu: 0, totalDejaPaye: 0, notes: '',
      date: new Date().toISOString().slice(0, 10),
      ...preselect,
    });
    setEditing(null);
    setView('create');
  };

  const handleSelectSource = (key: string) => {
    if (key === 'manual') {
      setForm(f => ({ ...f, source: 'manual', sourceId: '', sourceLabel: '', client: '', clientPhone: '', totalAttendu: 0, totalDejaPaye: 0 }));
      return;
    }
    const opt = sourceOptions.find(o => `${o.source}:${o.id}` === key);
    if (!opt) return;
    setForm(f => ({
      ...f,
      source: opt.source, sourceId: opt.id, sourceLabel: opt.label,
      client: opt.client, clientPhone: opt.clientPhone,
      totalAttendu: opt.totalAttendu, totalDejaPaye: opt.totalDejaPaye,
      devise: opt.devise,
      montant: Math.max(0, opt.totalAttendu - opt.totalDejaPaye),
      type: opt.totalDejaPaye > 0 ? 'solde' : (opt.totalAttendu > 0 ? 'total' : 'acompte'),
    }));
  };

  const resteAPayer = Math.max(0, form.totalAttendu - form.totalDejaPaye - form.montant);

  const saveReceipt = () => {
    if (!form.client.trim()) {
      toast({ title: lang === 'fr' ? 'Nom du client requis' : 'Client name required', variant: 'destructive' });
      return;
    }
    if (form.montant <= 0) {
      toast({ title: lang === 'fr' ? 'Montant invalide' : 'Invalid amount', variant: 'destructive' });
      return;
    }
    if (form.source !== 'manual' && form.totalAttendu > 0 && form.montant > (form.totalAttendu - form.totalDejaPaye)) {
      toast({ title: t('amountExceedsBalance', lang), variant: 'destructive' });
      return;
    }

    const r: MrgReceipt = {
      id: editing?.id || Math.random().toString(36).slice(2, 10),
      numero: editing?.numero || receiptStorage.nextNumero(),
      date: form.date,
      client: form.client,
      clientPhone: form.clientPhone,
      source: form.source,
      sourceId: form.sourceId || undefined,
      sourceLabel: form.sourceLabel || (lang === 'fr' ? 'Paiement libre' : 'Free payment'),
      montant: form.montant,
      devise: form.devise,
      modePaiement: form.modePaiement,
      modePaiementCustom: form.modePaiementCustom,
      type: form.type,
      totalAttendu: form.totalAttendu,
      totalDejaPaye: form.totalDejaPaye,
      resteAPayer,
      notes: form.notes,
      createdAt: editing?.createdAt || new Date().toISOString(),
    };

    if (editing) receiptStorage.updateReceipt(r);
    else receiptStorage.addReceipt(r);

    // Update source acompte
    if (form.source === 'order' && form.sourceId) {
      const orders = storage.getOrders().map(o => o.id === form.sourceId ? { ...o } : o);
      storage.setOrders(orders);
    } else if (form.source === 'design-project' && form.sourceId) {
      const ps = designStorage.getProjects().map(p =>
        p.id === form.sourceId ? { ...p, acompte: form.totalDejaPaye + form.montant } : p
      );
      designStorage.setProjects(ps);
    } else if (form.source === 'formation' && form.sourceId) {
      const f = formationStorage.getFormations().find(x => x.id === form.sourceId);
      if (f) formationStorage.updateFormation({ ...f, acompte: form.totalDejaPaye + form.montant });
    }

    reload();
    toast({ title: t('receiptSaved', lang) });

    // Auto-mark fully paid?
    if (resteAPayer === 0 && form.source !== 'manual' && form.source !== 'devis' && form.source !== 'design-devis' && form.sourceId) {
      setConfirmFullyPaid({ open: true, sourceType: form.source, sourceId: form.sourceId });
    } else {
      setPreviewing(r);
      setView('preview');
    }
  };

  const handleConfirmFullyPaid = () => {
    if (!confirmFullyPaid) return;
    const { sourceType, sourceId } = confirmFullyPaid;
    if (sourceType === 'order') {
      const orders = storage.getOrders().map(o => o.id === sourceId ? { ...o, status: 'livre' as const } : o);
      storage.setOrders(orders);
    } else if (sourceType === 'design-project') {
      const ps = designStorage.getProjects().map(p => p.id === sourceId ? { ...p, statut: 'paye' as const, acompte: p.prix } : p);
      designStorage.setProjects(ps);
    } else if (sourceType === 'formation') {
      const f = formationStorage.getFormations().find(x => x.id === sourceId);
      if (f) formationStorage.updateFormation({ ...f, statut: 'payee', acompte: f.prix });
    }
    setConfirmFullyPaid(null);
    reload();
    // Open preview of the just-saved receipt
    const last = [...receiptStorage.getReceipts()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (last) { setPreviewing(last); setView('preview'); }
  };

  const handleDelete = (id: string) => {
    receiptStorage.deleteReceipt(id);
    reload();
    setDeletingId(null);
    toast({ title: t('receiptDeleted', lang) });
  };

  const exportPNG = async () => {
    if (!exportRef.current || !previewing) return;
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: exportStyle === 'white' ? '#ffffff' : '#0d1117',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = fileNames.receiptPNG(previewing.client, previewing.numero);
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  const exportPDF = async () => {
    if (!exportRef.current || !previewing) return;
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: exportStyle === 'white' ? '#ffffff' : '#0d1117',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let w = pageW - 20;
      let h = w / ratio;
      if (h > pageH - 20) { h = pageH - 20; w = h * ratio; }
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      pdf.addImage(imgData, 'PNG', x, y, w, h);
      pdf.save(fileNames.receiptPDF(previewing.client, previewing.numero));
    } catch (e) {
      toast({ title: 'PDF export failed', variant: 'destructive' });
    }
  };

  const sendWhatsApp = () => {
    if (!previewing) return;
    const phone = previewing.clientPhone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      lang === 'fr'
        ? `Bonjour ${previewing.client},\n\nVotre reçu de paiement ${previewing.numero} d'un montant de ${fmt(previewing.montant, previewing.devise)} a été émis.\n\nMerci de votre confiance.\n— ${profil.nom || 'Mr.G'}`
        : `Hello ${previewing.client},\n\nYour payment receipt ${previewing.numero} for ${fmt(previewing.montant, previewing.devise)} has been issued.\n\nThank you for your trust.\n— ${profil.nom || 'Mr.G'}`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  // ============= LIST VIEW =============
  if (view === 'list') {
    return (
      <div className="pt-20 pb-12 px-4 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
            <div>
              <h1 className="font-clash text-4xl font-bold text-foreground">{t('receiptsTitle', lang)}</h1>
              <p className="font-satoshi text-muted-foreground mt-1">{t('receiptsDesc', lang)}</p>
            </div>
            <button
              onClick={() => newReceipt()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-or to-or/80 text-background font-satoshi font-semibold hover:scale-[1.02] transition-transform shadow-lg shadow-or/20"
            >
              <Plus size={18} /> {t('newReceipt', lang)}
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: t('monthlyCollected', lang), value: fmt(stats.collected, stats.devise), accent: true },
            { label: t('receiptsCount', lang), value: String(stats.count) },
            { label: t('dominantMode', lang), value: stats.dominant === '—' ? '—' : t((stats.dominant === 'mobile-money' ? 'mobileMoney' : stats.dominant === 'cash' ? 'cash' : stats.dominant === 'virement' ? 'transfer' : stats.dominant === 'carte' ? 'card' : 'other') as any, lang) },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-5 bg-surface-sombre/60 backdrop-blur-xl border border-border/40"
            >
              <p className="font-satoshi text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`font-clash text-2xl font-bold mt-2 ${s.accent ? 'text-or' : 'text-foreground'}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('searchClient', lang)}
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-sombre/60 border border-border/40 font-satoshi text-sm focus:outline-none focus:border-or/50"
            />
          </div>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="h-10 px-3 rounded-lg bg-surface-sombre/60 border border-border/40 font-satoshi text-sm">
            <option value="all">{t('paymentSource', lang)}</option>
            <option value="order">{t('sourceOrder', lang)}</option>
            <option value="devis">{t('sourceDevis', lang)}</option>
            <option value="design-project">{t('sourceDesignProject', lang)}</option>
            <option value="design-devis">{t('sourceDesignDevis', lang)}</option>
            <option value="formation">{t('sourceFormation', lang)}</option>
            <option value="manual">{t('sourceManual', lang)}</option>
          </select>
          <select value={filterMode} onChange={e => setFilterMode(e.target.value)} className="h-10 px-3 rounded-lg bg-surface-sombre/60 border border-border/40 font-satoshi text-sm">
            <option value="all">{t('paymentMode', lang)}</option>
            <option value="cash">{t('cash', lang)}</option>
            <option value="mobile-money">{t('mobileMoney', lang)}</option>
            <option value="virement">{t('transfer', lang)}</option>
            <option value="carte">{t('card', lang)}</option>
            <option value="autre">{t('other', lang)}</option>
          </select>
        </div>

        {/* List */}
        <div className="rounded-2xl bg-surface-sombre/60 backdrop-blur-xl border border-border/40 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <ReceiptIcon size={48} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-satoshi text-muted-foreground">{t('noReceipts', lang)}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-or/5 border-b border-border/40">
                  <tr className="text-left font-satoshi font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">N°</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">{t('client', lang)}</th>
                    <th className="p-4">{t('paymentSource', lang)}</th>
                    <th className="p-4 text-right">{t('thisPayment', lang)}</th>
                    <th className="p-4">{t('paymentMode', lang)}</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map(r => (
                      <motion.tr
                        key={r.id}
                        layout
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="border-b border-border/20 hover:bg-or/5 transition-colors"
                      >
                        <td className="p-4 font-mono text-or font-semibold">{r.numero}</td>
                        <td className="p-4 text-muted-foreground">{new Date(r.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}</td>
                        <td className="p-4 font-medium text-foreground">{r.client}</td>
                        <td className="p-4 text-xs">
                          <span className="px-2 py-1 rounded-md bg-primary/10 text-primary">
                            {t(`source${r.source === 'design-project' ? 'DesignProject' : r.source === 'design-devis' ? 'DesignDevis' : r.source.charAt(0).toUpperCase() + r.source.slice(1)}` as any, lang)}
                          </span>
                        </td>
                        <td className="p-4 text-right font-clash font-bold text-or">{fmt(r.montant, r.devise)}</td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {t((r.modePaiement === 'mobile-money' ? 'mobileMoney' : r.modePaiement === 'cash' ? 'cash' : r.modePaiement === 'virement' ? 'transfer' : r.modePaiement === 'carte' ? 'card' : 'other') as any, lang)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setPreviewing(r); setView('preview'); }} className="p-2 rounded-lg hover:bg-or/10 text-or" title={t('preview', lang)}>
                              <Eye size={16} />
                            </button>
                            <button onClick={() => setDeletingId(r.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive" title={t('deleteOrder', lang)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteConfirm', lang)}</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('back', lang)}</AlertDialogCancel>
              <AlertDialogAction onClick={() => deletingId && handleDelete(deletingId)} className="bg-destructive text-destructive-foreground">
                {t('deleteOrder', lang)}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ============= CREATE VIEW =============
  if (view === 'create') {
    return (
      <div className="pt-20 pb-12 px-4 max-w-3xl mx-auto">
        <button onClick={() => setView('list')} className="flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground font-satoshi text-sm">
          <ArrowLeft size={16} /> {t('back', lang)}
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-clash text-3xl font-bold mb-6 text-foreground">{t('newReceipt', lang)}</h1>

          <div className="rounded-2xl p-6 bg-surface-sombre/60 backdrop-blur-xl border border-border/40 space-y-5">
            {/* Source */}
            <div>
              <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('paymentSource', lang)}</label>
              <select
                value={form.source === 'manual' ? 'manual' : `${form.source}:${form.sourceId}`}
                onChange={e => handleSelectSource(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi"
              >
                <option value="manual">{t('sourceManual', lang)}</option>
                {sourceOptions.map(o => (
                  <option key={`${o.source}:${o.id}`} value={`${o.source}:${o.id}`}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Client info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('clientName', lang)}</label>
                <input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi" />
              </div>
              <div>
                <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('clientPhone', lang)}</label>
                <input value={form.clientPhone} onChange={e => setForm({ ...form, clientPhone: e.target.value })} className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi" />
              </div>
            </div>

            {/* Recap totals */}
            {form.source !== 'manual' && (
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-or/5 border border-or/20">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('totalExpected', lang)}</p>
                  <p className="font-clash font-bold text-foreground mt-1">{fmt(form.totalAttendu, form.devise)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('alreadyPaid', lang)}</p>
                  <p className="font-clash font-bold text-muted-foreground mt-1">{fmt(form.totalDejaPaye, form.devise)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('remainingBalance', lang)}</p>
                  <p className="font-clash font-bold text-or mt-1">{fmt(resteAPayer, form.devise)}</p>
                </div>
              </div>
            )}

            {/* Amount + currency */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('thisPayment', lang)}</label>
                <input type="number" min="0" value={form.montant || ''} onChange={e => setForm({ ...form, montant: parseFloat(e.target.value) || 0 })} className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi font-semibold text-or" />
              </div>
              <div>
                <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('currency', lang)}</label>
                <select value={form.devise} onChange={e => setForm({ ...form, devise: e.target.value })} className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi">
                  <option value="XOF">XOF</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            {/* Mode + Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('paymentMode', lang)}</label>
                <select value={form.modePaiement} onChange={e => setForm({ ...form, modePaiement: e.target.value as PaymentMode })} className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi">
                  <option value="cash">{t('cash', lang)}</option>
                  <option value="mobile-money">{t('mobileMoney', lang)}</option>
                  <option value="virement">{t('transfer', lang)}</option>
                  <option value="carte">{t('card', lang)}</option>
                  <option value="autre">{t('other', lang)}</option>
                </select>
              </div>
              <div>
                <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('paymentType', lang)}</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ReceiptType })} className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi">
                  <option value="acompte">{t('typeAcompte', lang)}</option>
                  <option value="solde">{t('typeSolde', lang)}</option>
                  <option value="total">{t('typeTotal', lang)}</option>
                  <option value="partiel">{t('typePartiel', lang)}</option>
                </select>
              </div>
            </div>

            {form.modePaiement === 'autre' && (
              <input value={form.modePaiementCustom} onChange={e => setForm({ ...form, modePaiementCustom: e.target.value })} placeholder={t('customMode', lang)} className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi" />
            )}

            <div>
              <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('receiptDate', lang)}</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi" />
            </div>

            <div>
              <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg bg-background/40 border border-border/40 font-satoshi resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setView('list')} className="flex-1 h-11 rounded-lg border border-border/40 font-satoshi font-medium hover:bg-secondary/50 transition-colors">{t('back', lang)}</button>
              <button onClick={saveReceipt} className="flex-1 h-11 rounded-lg bg-gradient-to-r from-or to-or/80 text-background font-satoshi font-semibold hover:scale-[1.02] transition-transform shadow-lg shadow-or/20">
                {t('saveOrder', lang)}
              </button>
            </div>
          </div>
        </motion.div>

        <AlertDialog open={!!confirmFullyPaid} onOpenChange={(o) => !o && setConfirmFullyPaid(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('markAsFullyPaid', lang)}</AlertDialogTitle>
              <AlertDialogDescription>{t('confirmMarkPaid', lang)}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setConfirmFullyPaid(null);
                const last = [...receiptStorage.getReceipts()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                if (last) { setPreviewing(last); setView('preview'); }
              }}>{t('back', lang)}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmFullyPaid} className="bg-or text-background">
                {t('markAsFullyPaid', lang)}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ============= PREVIEW VIEW =============
  if (view === 'preview' && previewing) {
    const r = previewing;
    const isDark = exportStyle === 'dark';
    const modeName = r.modePaiement === 'autre' && r.modePaiementCustom
      ? r.modePaiementCustom
      : t((r.modePaiement === 'mobile-money' ? 'mobileMoney' : r.modePaiement === 'cash' ? 'cash' : r.modePaiement === 'virement' ? 'transfer' : r.modePaiement === 'carte' ? 'card' : 'other') as any, lang);

    return (
      <div className="pt-20 pb-12 px-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-satoshi text-sm">
            <ArrowLeft size={16} /> {t('back', lang)}
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Style toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-sombre/60 border border-border/40">
              <button onClick={() => setExportStyle('dark')} className={`px-3 py-1.5 rounded-md text-xs font-satoshi ${isDark ? 'bg-or/20 text-or' : 'text-muted-foreground'}`}>{t('darkExport', lang)}</button>
              <button onClick={() => setExportStyle('white')} className={`px-3 py-1.5 rounded-md text-xs font-satoshi ${!isDark ? 'bg-or/20 text-or' : 'text-muted-foreground'}`}>{t('whiteExport', lang)}</button>
            </div>
            <button onClick={exportPNG} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 text-primary text-sm font-satoshi hover:bg-primary/25"><Download size={14} /> PNG</button>
            <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-or/15 text-or text-sm font-satoshi hover:bg-or/25"><Download size={14} /> PDF</button>
            <button onClick={sendWhatsApp} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-satoshi hover:bg-emerald-500/25"><MessageCircle size={14} /> WhatsApp</button>
          </div>
        </div>

        {/* Receipt template */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="mx-auto rounded-2xl overflow-hidden shadow-2xl"
          style={{ maxWidth: '720px' }}
        >
          <div
            ref={exportRef}
            className={`p-10 ${isDark ? 'bg-[#0d1117] text-white' : 'bg-white text-gray-900'}`}
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {/* Header */}
            <div className={`flex items-start justify-between pb-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                {profil.logo && <img src={profil.logo} alt="logo" className="h-14 w-14 object-contain rounded-lg" />}
                <div>
                  <h2 className="font-bold text-2xl" style={{ color: isDark ? '#c8a84b' : '#a88a3b' }}>{profil.nom || 'Mr.G Suite'}</h2>
                  <p className={`text-xs uppercase tracking-widest mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{lang === 'fr' ? 'Reçu de paiement' : 'Payment receipt'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-bold" style={{ color: isDark ? '#c8a84b' : '#a88a3b' }}>{r.numero}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  {new Date(r.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Client */}
            <div className="mt-6">
              <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{t('receivedFrom', lang)}</p>
              <p className="font-bold text-xl mt-1">{r.client}</p>
              {r.clientPhone && <p className={`text-sm mt-0.5 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>{r.clientPhone}</p>}
            </div>

            {/* Concerning */}
            <div className={`mt-5 p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{t('concerning', lang)}</p>
              <p className="font-medium mt-1">{r.sourceLabel}</p>
            </div>

            {/* Amount highlight */}
            <div
              className="mt-6 p-6 rounded-xl text-center"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(200,168,75,0.15), rgba(200,168,75,0.05))'
                  : 'linear-gradient(135deg, rgba(168,138,59,0.12), rgba(168,138,59,0.04))',
                border: `1px solid ${isDark ? 'rgba(200,168,75,0.3)' : 'rgba(168,138,59,0.25)'}`,
              }}
            >
              <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{t('theSum', lang)}</p>
              <p className="font-bold text-4xl mt-2" style={{ color: isDark ? '#c8a84b' : '#a88a3b' }}>
                {fmt(r.montant, r.devise)}
              </p>
              <p className={`text-xs italic mt-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                ({numberToWords(r.montant, lang)} {r.devise})
              </p>
            </div>

            {/* Recap table */}
            {r.totalAttendu > 0 && (
              <div className={`mt-6 rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className={`grid grid-cols-4 text-xs ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <div className="p-3 font-semibold uppercase tracking-wider">{t('totalExpected', lang)}</div>
                  <div className="p-3 font-semibold uppercase tracking-wider">{t('alreadyPaid', lang)}</div>
                  <div className="p-3 font-semibold uppercase tracking-wider" style={{ color: isDark ? '#c8a84b' : '#a88a3b' }}>{t('thisPayment', lang)}</div>
                  <div className="p-3 font-semibold uppercase tracking-wider">{t('remainingBalance', lang)}</div>
                </div>
                <div className="grid grid-cols-4 text-sm">
                  <div className="p-3">{fmt(r.totalAttendu, r.devise)}</div>
                  <div className="p-3">{fmt(r.totalDejaPaye, r.devise)}</div>
                  <div className="p-3 font-bold" style={{ color: isDark ? '#c8a84b' : '#a88a3b' }}>{fmt(r.montant, r.devise)}</div>
                  <div className={`p-3 font-bold ${r.resteAPayer === 0 ? 'text-emerald-500' : ''}`}>{fmt(r.resteAPayer, r.devise)}</div>
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
              <div>
                <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{t('paymentMode', lang)}</p>
                <p className="font-medium mt-1">{modeName}</p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{t('paymentType', lang)}</p>
                <p className="font-medium mt-1">{t((r.type === 'acompte' ? 'typeAcompte' : r.type === 'solde' ? 'typeSolde' : r.type === 'total' ? 'typeTotal' : 'typePartiel') as any, lang)}</p>
              </div>
            </div>

            {r.notes && (
              <div className="mt-5">
                <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Notes</p>
                <p className={`text-sm mt-1 italic ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{r.notes}</p>
              </div>
            )}

            {/* Signature */}
            <div className={`mt-10 pt-6 border-t ${isDark ? 'border-white/10' : 'border-gray-200'} flex items-end justify-between`}>
              <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                <p>{t('issuedAt', lang)} _____________ {t('on', lang)} {new Date(r.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}</p>
              </div>
              <div className="text-right">
                <div className={`w-44 border-b ${isDark ? 'border-white/30' : 'border-gray-400'} mb-1`} style={{ height: '40px' }}></div>
                <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{t('signature', lang)} — {profil.nom || 'Mr.G'}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
