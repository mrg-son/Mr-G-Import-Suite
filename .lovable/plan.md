# 🧾 Plan — Système de Reçus de Paiement

## 🎯 Décisions validées
- **Style export** : Toggle au moment de l'export → **Dark glass** (digital/WhatsApp) OU **Papier blanc** (impression formelle)
- **Auto-statut** : Pop-up de confirmation "Marquer comme entièrement payé ?" quand le solde tombe à 0

---

## 📦 Nouveaux fichiers

### 1. `src/lib/receiptStorage.ts`
Cache mémoire synchrone + CRUD + numérotation auto `#YYYY-R-XXX`.

```ts
interface MrgReceipt {
  id: string;
  numero: string;              // #2026-R-001
  date: string;                // ISO
  client: string;
  clientPhone: string;
  source: 'order' | 'design-project' | 'formation' | 'devis' | 'manual';
  sourceId?: string;
  sourceLabel: string;         // "Commande #123 — iPhone 15"
  montant: number;             // ce paiement
  devise: 'XOF' | 'EUR' | 'USD';
  modePaiement: 'cash' | 'mobile-money' | 'virement' | 'carte' | 'autre';
  modePaiementCustom?: string;
  type: 'acompte' | 'solde' | 'total' | 'partiel';
  totalAttendu: number;
  totalDejaPaye: number;       // avant ce paiement
  resteAPayer: number;         // après ce paiement
  notes: string;
  createdAt: string;
  archived?: boolean;
}
```

### 2. `src/components/ReceiptMaker.tsx`
Module complet avec 3 vues :

**A. Liste des reçus**
- Stat cards : Encaissé ce mois / Nombre de reçus / Mode de paiement dominant
- Tableau : N° / Date / Client / Source / Montant / Mode / Actions
- Filtres : source, mois, mode de paiement
- Recherche temps réel (client, numéro)
- Actions : Voir / Re-télécharger PNG/PDF / WhatsApp / Supprimer

**B. Formulaire création**
- Sélecteur source (Commande / Projet Design / Devis Import/Design / Formation / Manuel) → auto-remplit client, totalAttendu, totalDejaPaye
- Champs : montant ce paiement, devise, mode de paiement, type (acompte/solde/total/partiel), notes
- Calcul temps réel : `nouveauResteAPayer = totalAttendu - (totalDejaPaye + montant)`
- Validation : montant ≤ resteAPayer
- À la sauvegarde :
  1. Créer le reçu
  2. Mettre à jour `acompte` de la source liée
  3. Si `nouveauResteAPayer === 0` → modal de confirmation "Marquer [source] comme entièrement payé(e) ?"

**C. Aperçu / Export**
- Template avec en-tête (logo + nom entreprise depuis profil) + N° reçu + date
- Bloc client (nom, téléphone)
- Concerne : sourceLabel
- Tableau récap : Total attendu / Déjà reçu / **Ce paiement** (highlight) / Reste à payer
- Mode de paiement + montant en lettres (FR/EN)
- Zone signature
- **Toggle Dark ⇄ White** au moment de l'export
- Boutons : 📥 PNG (html2canvas) / 📥 PDF (jsPDF) / 📱 WhatsApp

---

## 🔄 Fichiers modifiés

### `src/lib/db.ts`
- Bump v3 → **v4**
- Ajouter store `receipts` avec index `by-date`
- Helpers : `getAllReceipts()`, `setAllReceipts()`, `putReceipt()`, `deleteReceipt()`

### `src/lib/fileNaming.ts`
Ajouter :
```ts
receiptPNG: (client, numero) => `MRG-SUITE_RECU_${sanitize(client)}_${numero.replace('#','')}__${dateStr()}.png`
receiptPDF: (client, numero) => `MRG-SUITE_RECU_${sanitize(client)}_${numero.replace('#','')}__${dateStr()}.pdf`
```

### `src/lib/autoBackup.ts`
Inclure `receiptStorage.getReceipts()` dans le snapshot JSON.

### `src/lib/i18n.ts`
~30 clés FR/EN : `navReceipts`, `receipts`, `newReceipt`, `receiptNumber`, `paymentMode`, `paymentType`, `cash`, `mobileMoney`, `transfer`, `card`, `acompte`, `solde`, `total`, `partiel`, `concerning`, `totalExpected`, `alreadyPaid`, `thisPayment`, `remainingBalance`, `markAsFullyPaid`, `confirmMarkPaid`, `receiptFor`, `darkExport`, `whiteExport`, `amountInWords`, `signature`, `monthlyCollected`, `receiptsCount`, `dominantMode`...

### `src/components/AppNavbar.tsx` & `src/components/DesignNavbar.tsx`
Ajouter onglet **"Reçus"** (`receipts` pour Import, `design-receipts` pour Design — même module, filtré par source).

### `src/pages/Index.tsx` & `src/hooks/useAppState.ts`
Routage du nouvel onglet `receipts` → `<ReceiptMaker />`.

### Boutons "💰 Émettre un reçu" intégrés dans :
- `src/components/ImportTracker.tsx` — détail commande (pré-remplit source=order)
- `src/components/DesignProjects.tsx` — détail projet (pré-remplit source=design-project)
- `src/components/DesignPayments.tsx` — chaque ligne (raccourci)
- `src/components/FormationsModule.tsx` — détail formation
- `src/components/Dashboard.tsx` & `src/components/DesignDashboard.tsx` — carte d'accès rapide

---

## 🔐 Synchronisation cross-modules
- Création reçu → `storage.putOrder()` / `designStorage.putProject()` / `formationStorage.putFormation()` mis à jour avec nouvel `acompte`
- Trigger `autoBackup` automatique
- Modal confirmation statut payé : utilise `AlertDialog` shadcn existant
- Cache mémoire rechargé via remount (pattern existant)

---

## 📁 Récap fichiers
**Créés (2)** : `src/lib/receiptStorage.ts`, `src/components/ReceiptMaker.tsx`
**Modifiés (12)** : `db.ts`, `fileNaming.ts`, `i18n.ts`, `autoBackup.ts`, `AppNavbar.tsx`, `DesignNavbar.tsx`, `Index.tsx`, `useAppState.ts`, `Dashboard.tsx`, `DesignDashboard.tsx`, `ImportTracker.tsx`, `DesignProjects.tsx`, `DesignPayments.tsx`, `FormationsModule.tsx`

---

✅ Approuve ce plan pour que je passe en mode édition et implémente tout.
