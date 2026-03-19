import { t } from '@/lib/i18n';
import { Moon, Sun } from 'lucide-react';

interface AppNavbarProps {
  lang: 'fr' | 'en';
  theme: 'dark' | 'light';
  userName: string;
  activeTab: string;
  onTabChange: (tab: string, orderId?: string) => void;
  onToggleLang: () => void;
  onToggleTheme: () => void;
}

const tabs = ['dashboard', 'freight', 'devis', 'orders', 'settings'] as const;
const tabLabelKeys = {
  dashboard: 'navDashboard',
  freight: 'navFreight',
  devis: 'navDevis',
  orders: 'navOrders',
  settings: 'navSettings',
} as const;

const AppNavbar = ({ lang, theme, userName, activeTab, onTabChange, onToggleLang, onToggleTheme }: AppNavbarProps) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-sombre/90 backdrop-blur-[40px] saturate-[180%] border-b border-border/30">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <span className="font-clash font-bold text-xl text-primary">MG</span>
          <div className="hidden md:flex items-center gap-1">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`px-3 py-1.5 rounded-lg font-satoshi text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-or/15 text-or'
                    : 'text-foreground/70 hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {t(tabLabelKeys[tab], lang)}
              </button>
            ))}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleLang}
            className="px-2 py-1 rounded-lg text-xs font-clash font-bold uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="ml-2 px-3 py-1 rounded-lg bg-primary/15 text-primary font-satoshi text-sm font-medium">
            {userName}
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-3 py-1.5 rounded-lg font-satoshi text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-or/15 text-or'
                : 'text-foreground/70 hover:text-foreground'
            }`}
          >
            {t(tabLabelKeys[tab], lang)}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default AppNavbar;
