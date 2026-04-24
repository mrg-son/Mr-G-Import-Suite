import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppState } from '@/hooks/useAppState';
import { initDesignStorage } from '@/lib/designStorage';
import { initFormationStorage } from '@/lib/formationStorage';
import { initReceiptStorage } from '@/lib/receiptStorage';
import OceanBackground from '@/components/OceanBackground';
import Onboarding from '@/components/Onboarding';
import PinScreen from '@/components/PinScreen';
import SplashScreen from '@/components/SplashScreen';
import HubScreen from '@/components/HubScreen';
import AppNavbar from '@/components/AppNavbar';
import DesignNavbar from '@/components/DesignNavbar';
import Dashboard from '@/components/Dashboard';
import FreightCalculator from '@/components/FreightCalculator';
import DevisMaker from '@/components/DevisMaker';
import ImportTracker from '@/components/ImportTracker';
import SettingsModule from '@/components/SettingsModule';
import ArchivesModule from '@/components/ArchivesModule';
import FormationsModule from '@/components/FormationsModule';
import DesignDashboard from '@/components/DesignDashboard';
import DesignProjects from '@/components/DesignProjects';
import DesignDevisMaker from '@/components/DesignDevisMaker';
import DesignPayments from '@/components/DesignPayments';
import ModuleTransition from '@/components/ModuleTransition';
import ReceiptMaker from '@/components/ReceiptMaker';

const Index = () => {
  const {
    screen, lang, theme, userName, activeApp,
    setLang, setTheme,
    completeOnboarding, unlockPin, enterApp,
    selectApp, goToHub,
    setUserName,
  } = useAppState();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [tabKey, setTabKey] = useState(0);

  // Init design storage
  useEffect(() => { initDesignStorage(); initFormationStorage(); }, []);

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
  if (screen === 'hub') {
    return <HubScreen lang={lang} userName={userName} onSelect={(app) => { setActiveTab(app === 'design' ? 'design-dashboard' : 'dashboard'); selectApp(app); }} />;
  }

  const handleReset = () => { window.location.reload(); };

  // DESIGN APP
  if (activeApp === 'design') {
    return (
      <div className="min-h-screen bg-background relative">
        <OceanBackground />
        <DesignNavbar
          lang={lang} theme={theme} userName={userName}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onToggleLang={() => setLang(lang === 'fr' ? 'en' : 'fr')}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onSwitchApp={goToHub}
        />
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'design-dashboard' && (
              <ModuleTransition key={`dd-${tabKey}`} type="dashboard">
                <DesignDashboard lang={lang} onNavigate={handleTabChange} />
              </ModuleTransition>
            )}
            {activeTab === 'design-projects' && (
              <ModuleTransition key={`dp-${tabKey}`} type="orders">
                <DesignProjects lang={lang} />
              </ModuleTransition>
            )}
            {activeTab === 'design-devis' && (
              <ModuleTransition key={`dv-${tabKey}`} type="devis">
                <DesignDevisMaker lang={lang} onNavigate={handleTabChange} />
              </ModuleTransition>
            )}
            {activeTab === 'design-payments' && (
              <ModuleTransition key={`pay-${tabKey}`} type="settings">
                <DesignPayments lang={lang} />
              </ModuleTransition>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // IMPORT APP
  return (
    <div className="min-h-screen bg-background relative">
      <OceanBackground />
      <AppNavbar
        lang={lang} theme={theme} userName={userName}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onToggleLang={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onSwitchApp={goToHub}
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
          {activeTab === 'formations' && (
            <ModuleTransition key={`formations-${tabKey}`} type="orders">
              <FormationsModule lang={lang} />
            </ModuleTransition>
          )}
          {activeTab === 'archives' && (
            <ModuleTransition key={`archives-${tabKey}`} type="orders">
              <ArchivesModule lang={lang} />
            </ModuleTransition>
          )}
          {activeTab === 'settings' && (
            <ModuleTransition key={`settings-${tabKey}`} type="settings">
              <SettingsModule lang={lang} onReset={handleReset} onProfileUpdate={(name) => setUserName(name)} />
            </ModuleTransition>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
