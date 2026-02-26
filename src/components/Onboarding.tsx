import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { storage } from '@/lib/storage';
import { t } from '@/lib/i18n';
import OceanBackground from './OceanBackground';

interface OnboardingProps {
  lang: 'fr' | 'en';
  onComplete: () => void;
}

const Onboarding = ({ lang, onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pinError, setPinError] = useState('');
  const [company, setCompany] = useState('GALIX SERVICES');
  const [currency, setCurrency] = useState('XOF');
  const [reminderDays, setReminderDays] = useState(3);
  const [selectedLang, setSelectedLang] = useState<'fr' | 'en'>(lang);
  const [autosave, setAutosave] = useState(true);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const direction = 1;

  const handlePinInput = (index: number, value: string, isConfirm: boolean) => {
    if (!/^\d*$/.test(value)) return;
    const arr = isConfirm ? [...confirmPin] : [...pin];
    arr[index] = value.slice(-1);
    isConfirm ? setConfirmPin(arr) : setPin(arr);
    setPinError('');

    if (value && index < 3) {
      const refs = isConfirm ? confirmPinRefs : pinRefs;
      refs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent, isConfirm: boolean) => {
    if (e.key === 'Backspace') {
      const arr = isConfirm ? [...confirmPin] : [...pin];
      if (!arr[index] && index > 0) {
        const refs = isConfirm ? confirmPinRefs : pinRefs;
        refs.current[index - 1]?.focus();
      }
    }
  };

  useEffect(() => {
    if (step === 1 && !isConfirming) pinRefs.current[0]?.focus();
    if (step === 1 && isConfirming) confirmPinRefs.current[0]?.focus();
  }, [step, isConfirming]);

  const canContinue = () => {
    switch (step) {
      case 0: return name.trim().length > 0;
      case 1:
        if (!isConfirming) return pin.every(d => d !== '');
        return confirmPin.every(d => d !== '');
      case 2: return company.trim().length > 0;
      case 3: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step === 0) {
      storage.setUser(name.trim());
      setStep(1);
    } else if (step === 1) {
      if (!isConfirming) {
        setIsConfirming(true);
      } else {
        if (pin.join('') !== confirmPin.join('')) {
          setPinError(lang === 'fr' ? 'Les PINs ne correspondent pas' : 'PINs do not match');
          setConfirmPin(['', '', '', '']);
          return;
        }
        storage.setPin(pin.join(''));
        setStep(2);
      }
    } else if (step === 2) {
      storage.setProfil({ nom: company, logo: '', devise: currency });
      setStep(3);
    } else if (step === 3) {
      storage.setReminderDays(reminderDays);
      storage.setLang(selectedLang);
      storage.setAutosave(autosave);
      onComplete();
    }
  };

  const renderPinInputs = (values: string[], isConfirm: boolean) => (
    <div className="flex gap-4 justify-center">
      {values.map((v, i) => (
        <input
          key={i}
          ref={el => { (isConfirm ? confirmPinRefs : pinRefs).current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={v}
          onChange={e => handlePinInput(i, e.target.value, isConfirm)}
          onKeyDown={e => handlePinKeyDown(i, e, isConfirm)}
          className="w-16 h-16 text-center text-2xl font-bold rounded-2xl bg-secondary border-2 border-border focus:border-primary focus:outline-none transition-colors font-satoshi"
        />
      ))}
    </div>
  );

  const slideVariants = {
    enter: { x: direction > 0 ? 300 : -300, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: direction > 0 ? -300 : 300, opacity: 0 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-background overflow-hidden">
      <OceanBackground />
      <div className="w-full max-w-md mx-auto px-6 z-10">
        <div className="glass-card p-8">
          {/* Progress */}
          <div className="flex gap-2 mb-8 justify-center">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i <= step ? 'w-10 bg-primary' : 'w-6 bg-muted'
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${step}-${isConfirming}`}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {step === 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-clash font-bold text-center uppercase tracking-wider">
                    {t('onboardingStep1Title', lang)}
                  </h2>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('onboardingStep1Placeholder', lang)}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none transition-colors font-satoshi text-lg"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && canContinue() && handleNext()}
                  />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-clash font-bold text-center uppercase tracking-wider">
                    {isConfirming ? t('onboardingStep2Confirm', lang) : t('onboardingStep2Title', lang)}
                  </h2>
                  {renderPinInputs(isConfirming ? confirmPin : pin, isConfirming)}
                  {pinError && (
                    <p className="text-destructive text-center text-sm font-satoshi">{pinError}</p>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-clash font-bold text-center uppercase tracking-wider">
                    {t('onboardingStep3Title', lang)}
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">
                        {t('onboardingStep3Company', lang)}
                      </label>
                      <input
                        type="text"
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none transition-colors font-satoshi"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">
                        {t('onboardingStep3Currency', lang)}
                      </label>
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none transition-colors font-satoshi"
                      >
                        <option value="XOF">XOF (FCFA)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD ($)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-clash font-bold text-center uppercase tracking-wider">
                    {t('onboardingStep4Title', lang)}
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">
                        {t('onboardingStep4Reminder', lang)}
                      </label>
                      <input
                        type="number"
                        value={reminderDays}
                        onChange={e => setReminderDays(Number(e.target.value))}
                        min={1}
                        max={30}
                        className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none transition-colors font-satoshi"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1 font-satoshi">
                        {t('onboardingStep4Lang', lang)}
                      </label>
                      <div className="flex gap-3">
                        {(['fr', 'en'] as const).map(l => (
                          <button
                            key={l}
                            onClick={() => setSelectedLang(l)}
                            className={`flex-1 py-3 rounded-xl font-clash font-bold uppercase tracking-wider transition-all ${
                              selectedLang === l
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-foreground hover:bg-muted'
                            }`}
                          >
                            {l === 'fr' ? 'Français' : 'English'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <label className="text-sm font-medium text-muted-foreground font-satoshi">
                        {t('onboardingStep4Autosave', lang)}
                      </label>
                      <button
                        onClick={() => setAutosave(!autosave)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          autosave ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-primary-foreground transition-transform ${
                          autosave ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <button
            onClick={handleNext}
            disabled={!canContinue()}
            className="w-full mt-8 py-3 rounded-xl font-clash font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {step === 3 ? t('finish', lang) : t('continue', lang)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
