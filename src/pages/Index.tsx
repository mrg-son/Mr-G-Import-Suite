import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppState } from '@/hooks/useAppState';
import { t } from '@/lib/i18n';
import OceanBackground from '@/components/OceanBackground';
import Onboarding from '@/components/Onboarding';
import PinScreen from '@/components/PinScreen';
import SplashScreen from '@/components/SplashScreen';
import AppNavbar from '@/components/AppNavbar';
import Dashboard from '@/components/Dashboard';
import FreightCalculator from '@/components/FreightCalculator';
import DevisMaker from '@/components/DevisMaker';
import ImportTracker from '@/components/ImportTracker';
import SettingsModule from '@/components/SettingsModule';
import ArchivesModule from '@/components/ArchivesModule';
import ModuleTransition from '@/components/ModuleTransition';

const Index = () => {
  const {
    screen, lang, theme, userName,
    setLang, setTheme,
    completeOnboarding, unlockPin, enterApp,
    setUserName,
  } = useAppState();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [tabKey, setTabKey] = useState(0);

  // Wrapper to force remount on tab change for fresh data
  const handleTabChange = (tab: string, orderId?: string) => {
    setEditOrderId(orderId || null);
    setActiveTab(tab);
    setTabKey(k => k + 1);
  };

  if (screen === 'onboarding') {
    return <Onboarding lang={lang} onComplete={completeOnboarding} />;
  }

  if (screen === 'pin') {
    return <PinScreen lang={lang} userName={userName} onUnlock={unlockPin} />;
  }

  if (screen === 'splash') {
    return <SplashScreen lang={lang} userName={userName} onEnter={enterApp} />;
  }

  const handleReset = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background relative">
      <OceanBackground />
      <AppNavbar
        lang={lang}
        theme={theme}
        userName={userName}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onToggleLang={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <ModuleTransition key={`dashboard-${tabKey}`} type="dashboard">
              <Dashboard lang={lang} onNavigate={handleTabChange} />
            </ModuleTransition>
          )}
          {activeTab === 'freight' && (
            <ModuleTransition key={`freight-${tabKey}`} type="freight">
              <FreightCalculator lang={lang} />
            </ModuleTransition>
          )}
          {activeTab === 'devis' && (
            <ModuleTransition key={`devis-${tabKey}`} type="devis">
              <DevisMaker lang={lang} onNavigate={handleTabChange} />
            </ModuleTransition>
          )}
          {activeTab === 'orders' && (
            <ModuleTransition key={`orders-${tabKey}`} type="orders">
              <ImportTracker lang={lang} editOrderId={editOrderId} />
            </ModuleTransition>
          )}
          {activeTab === 'archives' && (
            <ModuleTransition key={`archives-${tabKey}`} type="orders">
              <ArchivesModule lang={lang} />
            </ModuleTransition>
          {activeTab === 'settings' && (
            <ModuleTransition key={`settings-${tabKey}`} type="settings">
              <SettingsModule
                lang={lang}
                onReset={handleReset}
                onProfileUpdate={(name) => setUserName(name)}
              />
            </ModuleTransition>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
