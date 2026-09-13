import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { QuickActionsModal } from '../../features/dashboard/QuickActionsModal';
import { TelemetryData, PlayitStatus } from '../../lib/types';

interface MainLayoutProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  telemetry: TelemetryData | null;
  playit: PlayitStatus | null;
  onServerAction: (action: 'start' | 'stop' | 'restart' | 'kill') => Promise<void>;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentTab,
  onSelectTab,
  telemetry,
  playit,
  onServerAction,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPowerModalOpen, setIsPowerModalOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-dark-950 text-slate-100">
      {/* Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        telemetry={telemetry}
        onOpenPowerModal={() => setIsPowerModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <Topbar
          currentTab={currentTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          telemetry={telemetry}
          playit={playit}
          onServerAction={onServerAction}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>

      {/* Mobile Navigation Drawer & Bottom Bar */}
      <MobileNav
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        telemetry={telemetry}
      />

      {/* Global Quick Actions Modal */}
      <QuickActionsModal
        isOpen={isPowerModalOpen}
        onClose={() => setIsPowerModalOpen(false)}
        isRunning={Boolean(telemetry?.isRunning)}
        onExecute={onServerAction}
      />
    </div>
  );
};
