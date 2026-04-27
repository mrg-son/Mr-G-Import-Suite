import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Download, MessageCircle, Eye, ArrowLeft, Receipt as ReceiptIcon, Search, Ban, Upload, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { receiptStorage, type MrgReceipt } from '@/lib/receiptStorage';
import type { ReceiptSource, PaymentMode, ReceiptType, ReceiptTemplate } from '@/lib/db';
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

// ============== Templates de design ==============
interface TemplateTheme {
  id: ReceiptTemplate;
  name: { fr: string; en: string };
  bg: string;          // background color
  text: string;        // base text color
  textMuted: string;
  accent: string;      // accent / amount color
  border: string;
  surface: string;     // sub-block bg
  fontFamily: string;
  amountBg: string;
  isDark: boolean;
}

const TEMPLATES: Record<ReceiptTemplate, TemplateTheme> = {
  classique: {
    id: 'classique',
    name: { fr: 'Classique', en: 'Classic' },
    bg: '#ffffff',
    text: '#1a1a1a',
    textMuted: '#6b7280',
    accent: '#a88a3b',
    border: '#e5e7eb',
    surface: '#f9fafb',
    fontFamily: '"Satoshi", system-ui, sans-serif',
    amountBg: 'linear-gradient(135deg, rgba(168,138,59,0.10), rgba(168,138,59,0.03))',
    isDark: false,
  },
  minimal: {
    id: 'minimal',
    name: { fr: 'Minimal', en: 'Minimal' },
    bg: '#ffffff',
    text: '#0a0a0a',
    textMuted: '#737373',
    accent: '#0a0a0a',
    border: '#000000',
    surface: '#fafafa',
    fontFamily: '"Inter", system-ui, sans-serif',
    amountBg: 'transparent',
    isDark: false,
  },
  royal: {
    id: 'royal',
    name: { fr: 'Royal', en: 'Royal' },
    bg: '#fdfbf5',
    text: '#3a2e1a',
    textMuted: '#8b7350',
    accent: '#b8860b',
    border: '#d4b76a',
    surface: '#f5edd6',
    fontFamily: '"Playfair Display", Georgia, serif',
    amountBg: 'linear-gradient(135deg, rgba(184,134,11,0.18), rgba(184,134,11,0.05))',
    isDark: false,
  },
  noir: {
    id: 'noir',
    name: { fr: 'Noir', en: 'Noir' },
    bg: '#0d1117',
    text: '#f5f5f5',
    textMuted: 'rgba(245,245,245,0.55)',
    accent: '#c8a84b',
    border: 'rgba(255,255,255,0.10)',
    surface: 'rgba(255,255,255,0.05)',
    fontFamily: '"Satoshi", system-ui, sans-serif',
    amountBg: 'linear-gradient(135deg, rgba(200,168,75,0.18), rgba(200,168,75,0.05))',
    isDark: true,
  },
  papier: {
    id: 'papier',
    name: { fr: 'Papier blanc', en: 'White paper' },
    bg: '#ffffff',
    text: '#111827',
    textMuted: '#4b5563',
    accent: '#111827',
    border: '#d1d5db',
    surface: '#f3f4f6',
    fontFamily: 'Georgia, "Times New Roman", serif',
    amountBg: '#ffffff',
    isDark: false,
  },
  mrg: {
    id: 'mrg',
    name: { fr: 'Mr.G Suite', en: 'Mr.G Suite' },
    bg: '#0a1628',
    text: '#e6f1ff',
    textMuted: 'rgba(230,241,255,0.6)',
    accent: '#14b8a6',
    border: 'rgba(20,184,166,0.25)',
    surface: 'rgba(20,184,166,0.08)',
    fontFamily: '"Clash Display", "Satoshi", system-ui, sans-serif',
    amountBg: 'linear-gradient(135deg, rgba(20,184,166,0.20), rgba(200,168,75,0.10))',
    isDark: true,
  },
};

// Number to words (FR + EN)
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
  const [previewTemplate, setPreviewTemplate] = useState<ReceiptTemplate>('classique');

  const profil = storage.getProfil();

  // Form state
  const [form, setForm] = useState({
    source: 'manual' as ReceiptSource,
    sourceId: '',
    client: '',
    clientPhone: '',
    sourceLabel: '',
    montant: 0,
    devise: profil.devise || 'XOF',
    modePaiement: 'mobile-money' as PaymentMode,
    modePaiementCustom: '',
    type: 'acompte' as ReceiptType,
    totalAttendu: 0,
    totalDejaPaye: 0,
    notes: '',
    date: new Date().toISOString().slice(0, 10),
    produits: '',
    lieu: '',
    signatureImage: '',
    template: 'classique' as ReceiptTemplate,
  });

  const [confirmFullyPaid, setConfirmFullyPaid] = useState<{ open: boolean; sourceType: ReceiptSource; sourceId: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cancellingReceipt, setCancellingReceipt] = useState<MrgReceipt | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);
  const signatureFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reload = () => setReceipts([...receiptStorage.getReceipts()]);

  // Build source options — exclude cancelled receipts from sums
  const sourceOptions: SourceOption[] = useMemo(() => {
    const opts: SourceOption[] = [];
    const activeReceipts = receipts.filter(r => !r.cancelled);
    if (scope !== 'design') {
      storage.getOrders().filter(o => !o.archived).forEach(o => {
        opts.push({
          source: 'order', id: o.id,
          label: `${t('sourceOrder', lang)} — ${o.client}`,
          client: o.client, clientPhone: o.phone,
          totalAttendu: o.clientPrice || 0,
          totalDejaPaye: activeReceipts.filter(r => r.source === 'order' && r.sourceId === o.id).reduce((s, r) => s + r.montant, 0),
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
          totalDejaPaye: activeReceipts.filter(r => r.source === 'devis' && r.sourceId === d.id).reduce((s, r) => s + r.montant, 0),
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
          totalDejaPaye: activeReceipts.filter(r => r.source === 'design-devis' && r.sourceId === d.id).reduce((s, r) => s + r.montant, 0),
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

  // Stats — exclude cancelled
  const stats = useMemo(() => {
    const now = new Date();
    const active = receipts.filter(r => !r.cancelled);
    const thisMonth = active.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const collected = thisMonth.reduce((s, r) => s + r.montant, 0);
    const modeCount: Record<string, number> = {};
    active.forEach(r => { modeCount[r.modePaiement] = (modeCount[r.modePaiement] || 0) + 1; });
    const dominant = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    return { collected, count: active.length, dominant, devise: profil.devise || 'XOF' };
  }, [receipts, profil.devise]);

  const newReceipt = (preselect?: Partial<typeof form>) => {
    setForm({
      source: 'manual', sourceId: '', client: '', clientPhone: '', sourceLabel: '',
      montant: 0, devise: profil.devise || 'XOF',
      modePaiement: 'mobile-money', modePaiementCustom: '',
      type: 'acompte', totalAttendu: 0, totalDejaPaye: 0, notes: '',
      date: new Date().toISOString().slice(0, 10),
      produits: '', lieu: '', signatureImage: '', template: 'classique',
      ...preselect,
    });
    setEditing(null);
    setView('create');
  };

  const handleSelectSource = (key: string) => {
    if (key === 'manual') {
      setForm(f => ({ ...f, source: 'manual', sourceId: '', sourceLabel: '', client: '', clientPhone: '', totalAttendu: 0, totalDejaPaye: 0, montant: 0, type: 'total' }));
      return;
    }
    const opt = sourceOptions.find(o => `${o.source}:${o.id}` === key);
    if (!opt) return;
    const reste = Math.max(0, opt.totalAttendu - opt.totalDejaPaye);
    // Si déjà des paiements antérieurs → c'est forcément un paiement partiel (continuation)
    // Sinon, par défaut "total" (la personne paye tout d'un coup) — l'utilisateur peut basculer en partiel.
    const hasPrevPayments = opt.totalDejaPaye > 0;
    setForm(f => ({
      ...f,
      source: opt.source, sourceId: opt.id, sourceLabel: opt.label,
      client: opt.client, clientPhone: opt.clientPhone,
      totalAttendu: opt.totalAttendu, totalDejaPaye: opt.totalDejaPaye,
      devise: opt.devise,
      montant: reste, // pré-rempli avec ce qui reste, modifiable
      type: hasPrevPayments ? 'partiel' : 'total',
    }));
  };

  // Logique : "Déjà reçu" ne s'applique que si paiement de type "partiel".
  // Sinon, le reçu représente uniquement le paiement du jour → reste = total - montant.
  const isPartiel = form.type === 'partiel';
  const effectiveDejaPaye = isPartiel ? form.totalDejaPaye : 0;
  const resteAPayer = Math.max(0, form.totalAttendu - effectiveDejaPaye - form.montant);

  // Signature upload handler
  const onSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: lang === 'fr' ? 'Fichier image requis' : 'Image required', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: lang === 'fr' ? 'Image trop lourde (max 2MB)' : 'File too large (max 2MB)', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({ ...f, signatureImage: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const saveReceipt = () => {
    if (!form.client.trim()) {
      toast({ title: lang === 'fr' ? 'Nom du client requis' : 'Client name required', variant: 'destructive' });
      return;
    }
    if (form.montant <= 0) {
      toast({ title: lang === 'fr' ? 'Montant invalide' : 'Invalid amount', variant: 'destructive' });
      return;
    }
    if (form.source !== 'manual' && form.totalAttendu > 0 && form.montant > (form.totalAttendu - effectiveDejaPaye)) {
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
      totalDejaPaye: effectiveDejaPaye,
      resteAPayer,
      notes: form.notes,
      createdAt: editing?.createdAt || new Date().toISOString(),
      produits: form.produits,
      lieu: form.lieu,
      signatureImage: form.signatureImage,
      template: form.template,
    };

    if (editing) receiptStorage.updateReceipt(r);
    else receiptStorage.addReceipt(r);

    // Update source acompte (cumul = déjà reçu effectif + paiement du jour)
    if (form.source === 'design-project' && form.sourceId) {
      const ps = designStorage.getProjects().map(p =>
        p.id === form.sourceId ? { ...p, acompte: effectiveDejaPaye + form.montant } : p
      );
      designStorage.setProjects(ps);
    } else if (form.source === 'formation' && form.sourceId) {
      const f = formationStorage.getFormations().find(x => x.id === form.sourceId);
      if (f) formationStorage.updateFormation({ ...f, acompte: effectiveDejaPaye + form.montant });
    }

    reload();
    setPreviewTemplate(form.template);
    toast({ title: t('receiptSaved', lang) });

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
    const last = [...receiptStorage.getReceipts()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (last) { setPreviewing(last); setPreviewTemplate(last.template || 'classique'); setView('preview'); }
  };

  const handleDelete = (id: string) => {
    receiptStorage.deleteReceipt(id);
    reload();
    setDeletingId(null);
    toast({ title: t('receiptDeleted', lang) });
  };

  // ============== ANNULATION (REVERSAL) ==============
  const handleCancelReceipt = () => {
    if (!cancellingReceipt) return;
    const r = cancellingReceipt;
    const updated: MrgReceipt = {
      ...r,
      cancelled: true,
      cancelledAt: new Date().toISOString(),
      cancelReason: cancelReason || undefined,
    };
    receiptStorage.updateReceipt(updated);

    // Recalcul du total déjà payé sur la source liée (montant retiré)
    if (r.sourceId) {
      const newAcompte = Math.max(0, r.totalDejaPaye); // totalDejaPaye = avant ce paiement
      if (r.source === 'design-project') {
        const ps = designStorage.getProjects().map(p =>
          p.id === r.sourceId ? { ...p, acompte: newAcompte, statut: p.statut === 'paye' ? 'en-cours' as const : p.statut } : p
        );
        designStorage.setProjects(ps);
      } else if (r.source === 'formation') {
        const f = formationStorage.getFormations().find(x => x.id === r.sourceId);
        if (f) formationStorage.updateFormation({ ...f, acompte: newAcompte, statut: f.statut === 'payee' ? 'terminee' : f.statut });
      }
      // Pour 'order', le système recalcule automatiquement via la somme des reçus actifs
    }

    reload();
    setCancellingReceipt(null);
    setCancelReason('');
    toast({ title: t('receiptCancelled', lang) });
  };

  const exportPNG = async () => {
    if (!exportRef.current || !previewing) return;
    try {
      const theme = TEMPLATES[previewTemplate];
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: theme.bg,
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = fileNames.receiptPNG(previewing.client, previewing.numero);
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  const exportPDF = async () => {
    if (!exportRef.current || !previewing) return;
    try {
      const theme = TEMPLATES[previewTemplate];
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: theme.bg,
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
    } catch {
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
                        className={`border-b border-border/20 hover:bg-or/5 transition-colors ${r.cancelled ? 'opacity-60' : ''}`}
                      >
                        <td className="p-4 font-mono font-semibold">
                          <span className={r.cancelled ? 'line-through text-muted-foreground' : 'text-or'}>{r.numero}</span>
                          {r.cancelled && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-destructive/15 text-destructive font-bold tracking-wider">
                              {t('cancelledLabel', lang)}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">{new Date(r.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}</td>
                        <td className="p-4 font-medium text-foreground">{r.client}</td>
                        <td className="p-4 text-xs">
                          <span className="px-2 py-1 rounded-md bg-primary/10 text-primary">
                            {t(`source${r.source === 'design-project' ? 'DesignProject' : r.source === 'design-devis' ? 'DesignDevis' : r.source.charAt(0).toUpperCase() + r.source.slice(1)}` as any, lang)}
                          </span>
                        </td>
                        <td className={`p-4 text-right font-clash font-bold ${r.cancelled ? 'line-through text-muted-foreground' : 'text-or'}`}>{fmt(r.montant, r.devise)}</td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {t((r.modePaiement === 'mobile-money' ? 'mobileMoney' : r.modePaiement === 'cash' ? 'cash' : r.modePaiement === 'virement' ? 'transfer' : r.modePaiement === 'carte' ? 'card' : 'other') as any, lang)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setPreviewing(r); setPreviewTemplate(r.template || 'classique'); setView('preview'); }} className="p-2 rounded-lg hover:bg-or/10 text-or" title={t('preview', lang)}>
                              <Eye size={16} />
                            </button>
                            {!r.cancelled && (
                              <button onClick={() => { setCancellingReceipt(r); setCancelReason(''); }} className="p-2 rounded-lg hover:bg-amber-500/10 text-amber-500" title={t('cancelReceipt', lang)}>
                                <Ban size={16} />
                              </button>
                            )}
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

        {/* Cancel reversal dialog */}
        <AlertDialog open={!!cancellingReceipt} onOpenChange={(o) => { if (!o) { setCancellingReceipt(null); setCancelReason(''); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('cancelReceipt', lang)} {cancellingReceipt?.numero}</AlertDialogTitle>
              <AlertDialogDescription>{t('cancelReceiptConfirm', lang)}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('cancelReason', lang)}</label>
              <textarea
                value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-lg bg-background/40 border border-border/40 font-satoshi text-sm resize-none"
                placeholder={lang === 'fr' ? 'Erreur de saisie, remboursement client...' : 'Input error, customer refund...'}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('back', lang)}</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelReceipt} className="bg-amber-500 text-background hover:bg-amber-600">
                {t('cancelReceipt', lang)}
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

            {/* Produits commandés */}
            <div>
              <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('products', lang)}</label>
              <textarea
                value={form.produits} onChange={e => setForm({ ...form, produits: e.target.value })} rows={3}
                placeholder={t('productsPlaceholder', lang)}
                className="w-full px-3 py-2 rounded-lg bg-background/40 border border-border/40 font-satoshi resize-none text-sm"
              />
            </div>

            {/* Recap totals (live) */}
            {form.source !== 'manual' && (
              <div className={`grid ${isPartiel ? 'grid-cols-3' : 'grid-cols-2'} gap-3 p-3 rounded-lg bg-or/5 border border-or/20`}>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('totalExpected', lang)}</p>
                  <p className="font-clash font-bold text-foreground mt-1">{fmt(form.totalAttendu, form.devise)}</p>
                </div>
                {isPartiel && (
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('alreadyPaid', lang)}</p>
                    <p className="font-clash font-bold text-muted-foreground mt-1">{fmt(form.totalDejaPaye, form.devise)}</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('remainingBalance', lang)}</p>
                  <p className="font-clash font-bold text-or mt-1">{fmt(resteAPayer, form.devise)}</p>
                </div>
              </div>
            )}

            {/* Total attendu (toujours) + Déjà reçu (UNIQUEMENT si partiel) */}
            <div className={`grid grid-cols-1 ${isPartiel ? 'md:grid-cols-2' : ''} gap-4`}>
              <div>
                <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('totalExpected', lang)}</label>
                <input
                  type="number" min="0" value={form.totalAttendu || ''}
                  onChange={e => setForm({ ...form, totalAttendu: parseFloat(e.target.value) || 0 })}
                  className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi"
                />
              </div>
              {isPartiel && (
                <div>
                  <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    {t('alreadyPaidEditable', lang)}
                    <span className="ml-1 text-or normal-case tracking-normal">({lang === 'fr' ? 'partiel uniquement' : 'partial only'})</span>
                  </label>
                  <input
                    type="number" min="0" value={form.totalDejaPaye || ''}
                    onChange={e => setForm({ ...form, totalDejaPaye: parseFloat(e.target.value) || 0 })}
                    className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi"
                  />
                </div>
              )}
            </div>

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

            {/* Date + Lieu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('receiptDate', lang)}</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi" />
              </div>
              <div>
                <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('place', lang)}</label>
                <input
                  value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })}
                  placeholder={t('placePlaceholder', lang)}
                  className="w-full h-11 px-3 rounded-lg bg-background/40 border border-border/40 font-satoshi"
                />
              </div>
            </div>

            {/* Signature upload */}
            <div>
              <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('signature', lang)}</label>
              <div className="flex items-center gap-3 flex-wrap">
                <input ref={signatureFileRef} type="file" accept="image/png,image/*" onChange={onSignatureUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => signatureFileRef.current?.click()}
                  className="flex items-center gap-2 px-4 h-11 rounded-lg border border-border/40 bg-background/40 font-satoshi text-sm hover:bg-or/5 hover:border-or/40 transition-colors"
                >
                  <Upload size={16} /> {t('uploadSignature', lang)}
                </button>
                {form.signatureImage && (
                  <>
                    <div className="h-11 px-3 rounded-lg bg-background/40 border border-border/40 flex items-center">
                      <img src={form.signatureImage} alt="signature" className="h-8 object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, signatureImage: '' })}
                      className="flex items-center gap-1 px-3 h-11 rounded-lg text-destructive hover:bg-destructive/10 font-satoshi text-sm"
                    >
                      <X size={14} /> {t('removeSignature', lang)}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Template selector */}
            <div>
              <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('template', lang)}</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(Object.keys(TEMPLATES) as ReceiptTemplate[]).map(key => {
                  const tpl = TEMPLATES[key];
                  const selected = form.template === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, template: key })}
                      className={`relative rounded-lg border-2 transition-all overflow-hidden ${selected ? 'border-or shadow-lg shadow-or/20 scale-[1.02]' : 'border-border/30 hover:border-or/40'}`}
                    >
                      <div
                        className="p-3 h-20 flex flex-col justify-between"
                        style={{ background: tpl.bg, fontFamily: tpl.fontFamily }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: tpl.accent }}>Mr.G</span>
                          <span className="text-[8px] font-mono" style={{ color: tpl.accent }}>#R-001</span>
                        </div>
                        <div className="text-center">
                          <span className="text-sm font-bold" style={{ color: tpl.accent }}>48 625</span>
                        </div>
                      </div>
                      <div className={`px-2 py-1.5 text-[10px] font-satoshi font-medium ${selected ? 'bg-or/15 text-or' : 'bg-surface-sombre/40 text-muted-foreground'}`}>
                        {t(`template${key.charAt(0).toUpperCase() + key.slice(1)}` as any, lang)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg bg-background/40 border border-border/40 font-satoshi resize-none" />
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
                if (last) { setPreviewing(last); setPreviewTemplate(last.template || 'classique'); setView('preview'); }
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
    const theme = TEMPLATES[previewTemplate];
    const modeName = r.modePaiement === 'autre' && r.modePaiementCustom
      ? r.modePaiementCustom
      : t((r.modePaiement === 'mobile-money' ? 'mobileMoney' : r.modePaiement === 'cash' ? 'cash' : r.modePaiement === 'virement' ? 'transfer' : r.modePaiement === 'carte' ? 'card' : 'other') as any, lang);

    return (
      <div className="pt-20 pb-12 px-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-satoshi text-sm">
            <ArrowLeft size={16} /> {t('back', lang)}
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={exportPNG} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 text-primary text-sm font-satoshi hover:bg-primary/25"><Download size={14} /> PNG</button>
            <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-or/15 text-or text-sm font-satoshi hover:bg-or/25"><Download size={14} /> PDF</button>
            <button onClick={sendWhatsApp} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-satoshi hover:bg-emerald-500/25"><MessageCircle size={14} /> WhatsApp</button>
          </div>
        </div>

        {/* Template selector in preview */}
        <div className="mb-5 p-3 rounded-xl bg-surface-sombre/60 backdrop-blur-xl border border-border/40">
          <p className="font-satoshi text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('template', lang)}</p>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(TEMPLATES) as ReceiptTemplate[]).map(key => {
              const tpl = TEMPLATES[key];
              const selected = previewTemplate === key;
              return (
                <button
                  key={key}
                  onClick={() => setPreviewTemplate(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-satoshi font-medium border-2 transition-all flex items-center gap-2 ${selected ? 'border-or bg-or/10 text-or' : 'border-border/30 text-muted-foreground hover:border-or/40'}`}
                >
                  <span className="w-3 h-3 rounded-full border" style={{ background: tpl.bg, borderColor: tpl.accent }} />
                  {t(`template${key.charAt(0).toUpperCase() + key.slice(1)}` as any, lang)}
                </button>
              );
            })}
          </div>
        </div>

        {r.cancelled && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-center font-satoshi text-sm text-destructive">
            <strong>{t('cancelledLabel', lang)}</strong>
            {r.cancelReason && <span className="ml-2 italic opacity-80">— {r.cancelReason}</span>}
          </div>
        )}

        {/* Receipt template */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="mx-auto rounded-2xl overflow-hidden shadow-2xl"
          style={{ maxWidth: '720px' }}
        >
          <div
            ref={exportRef}
            className="p-10 relative"
            style={{ background: theme.bg, color: theme.text, fontFamily: theme.fontFamily }}
          >
            {r.cancelled && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                aria-hidden="true"
              >
                <div
                  className="text-7xl font-black opacity-15 select-none"
                  style={{ color: '#dc2626', transform: 'rotate(-20deg)', letterSpacing: '0.1em' }}
                >
                  {t('cancelledLabel', lang)}
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between pb-6" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <div className="flex items-center gap-3">
                {profil.logo && <img src={profil.logo} alt="logo" className="h-14 w-14 object-contain rounded-lg" />}
                <div>
                  <h2 className="font-bold text-2xl" style={{ color: theme.accent }}>{profil.nom || 'Mr.G Suite'}</h2>
                  <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: theme.textMuted }}>{lang === 'fr' ? 'Reçu de paiement' : 'Payment receipt'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-bold" style={{ color: theme.accent }}>{r.numero}</p>
                <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                  {new Date(r.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Client */}
            <div className="mt-6">
              <p className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>{t('receivedFrom', lang)}</p>
              <p className="font-bold text-xl mt-1">{r.client}</p>
              {r.clientPhone && <p className="text-sm mt-0.5" style={{ color: theme.textMuted }}>{r.clientPhone}</p>}
            </div>

            {/* Concerning */}
            <div className="mt-5 p-4 rounded-lg" style={{ background: theme.surface }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>{t('concerning', lang)}</p>
              <p className="font-medium mt-1">{r.sourceLabel}</p>
            </div>

            {/* Produits commandés */}
            {r.produits && (
              <div className="mt-4 p-4 rounded-lg" style={{ background: theme.surface, borderLeft: `3px solid ${theme.accent}` }}>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>{t('products', lang)}</p>
                <p className="text-sm whitespace-pre-line">{r.produits}</p>
              </div>
            )}

            {/* Amount highlight */}
            <div
              className="mt-6 p-6 rounded-xl text-center"
              style={{
                background: theme.amountBg,
                border: theme.amountBg === 'transparent' ? `2px solid ${theme.accent}` : `1px solid ${theme.accent}40`,
              }}
            >
              <p className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>{t('theSum', lang)}</p>
              <p className="font-bold text-4xl mt-2" style={{ color: theme.accent }}>
                {fmt(r.montant, r.devise)}
              </p>
              <p className="text-xs italic mt-2" style={{ color: theme.textMuted }}>
                ({numberToWords(r.montant, lang)} {r.devise})
              </p>
            </div>

            {/* Recap table — colonne "déjà reçu" uniquement pour paiement partiel */}
            {r.totalAttendu > 0 && (() => {
              const showDeja = r.type === 'partiel' && r.totalDejaPaye > 0;
              const cols = showDeja ? 'grid-cols-4' : 'grid-cols-3';
              return (
                <div className="mt-6 rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                  <div className={`grid ${cols} text-xs`} style={{ background: theme.surface }}>
                    <div className="p-3 font-semibold uppercase tracking-wider">{t('totalExpected', lang)}</div>
                    {showDeja && <div className="p-3 font-semibold uppercase tracking-wider">{t('alreadyPaid', lang)}</div>}
                    <div className="p-3 font-semibold uppercase tracking-wider" style={{ color: theme.accent }}>{t('thisPayment', lang)}</div>
                    <div className="p-3 font-semibold uppercase tracking-wider">{t('remainingBalance', lang)}</div>
                  </div>
                  <div className={`grid ${cols} text-sm`}>
                    <div className="p-3">{fmt(r.totalAttendu, r.devise)}</div>
                    {showDeja && <div className="p-3">{fmt(r.totalDejaPaye, r.devise)}</div>}
                    <div className="p-3 font-bold" style={{ color: theme.accent }}>{fmt(r.montant, r.devise)}</div>
                    <div className={`p-3 font-bold ${r.resteAPayer === 0 ? 'text-emerald-500' : ''}`}>{fmt(r.resteAPayer, r.devise)}</div>
                  </div>
                </div>
              );
            })()}

            {/* Meta */}
            <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>{t('paymentMode', lang)}</p>
                <p className="font-medium mt-1">{modeName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>{t('paymentType', lang)}</p>
                <p className="font-medium mt-1">{t((r.type === 'acompte' ? 'typeAcompte' : r.type === 'solde' ? 'typeSolde' : r.type === 'total' ? 'typeTotal' : 'typePartiel') as any, lang)}</p>
              </div>
            </div>

            {r.notes && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>Notes</p>
                <p className="text-sm mt-1 italic" style={{ color: theme.textMuted }}>{r.notes}</p>
              </div>
            )}

            {/* Signature + Lieu */}
            <div className="mt-10 pt-6 flex items-end justify-between" style={{ borderTop: `1px solid ${theme.border}` }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>
                <p>
                  {t('issuedAt', lang)}{' '}
                  {r.lieu ? (
                    <span className="font-bold underline underline-offset-4" style={{ color: theme.text }}>{r.lieu}</span>
                  ) : (
                    <span className="inline-block w-24 border-b" style={{ borderColor: theme.border }}>&nbsp;</span>
                  )}
                  {' '}{t('on', lang)} {new Date(r.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                </p>
              </div>
              <div className="text-right">
                <div className="w-44 mb-1 flex items-end justify-end" style={{ height: '50px' }}>
                  {r.signatureImage ? (
                    <img src={r.signatureImage} alt="signature" className="max-h-[50px] max-w-full object-contain" />
                  ) : null}
                </div>
                <div className="w-44 border-b" style={{ borderColor: theme.border }} />
                <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{t('signature', lang)} — {profil.nom || 'Mr.G'}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
