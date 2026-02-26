import { useState } from 'react';
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

const Index = () => {
  const {
    screen, lang, theme, userName,
    setLang, setTheme,
    completeOnboarding, unlockPin, enterApp,
    setUserName,
  } = useAppState();

  const [activeTab, setActiveTab] = useState('dashboard');

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
        onTabChange={setActiveTab}
        onToggleLang={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
      <div className="relative z-10">
        {activeTab === 'dashboard' && <Dashboard lang={lang} onNavigate={setActiveTab} />}
        {activeTab === 'freight' && <FreightCalculator lang={lang} />}
        {activeTab === 'devis' && <DevisMaker lang={lang} onNavigate={setActiveTab} />}
        {activeTab === 'orders' && <ImportTracker lang={lang} />}
        {activeTab === 'settings' && (
          <SettingsModule
            lang={lang}
            onReset={handleReset}
            onProfileUpdate={(name) => setUserName(name)}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
