import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './lib/api';
import { useAuth } from './features/auth/AuthContext';
import { LoginView } from './features/auth/LoginView';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardView } from './features/dashboard/DashboardView';
import { VersionsView } from './features/versions/VersionsView';
import { ConsoleView } from './features/console/ConsoleView';
import { PropertiesView } from './features/properties/PropertiesView';
import { PlayersView } from './features/players/PlayersView';
import { ModsView } from './features/mods/ModsView';
import { FilesView } from './features/files/FilesView';
import { PlayitView } from './features/playit/PlayitView';
import { SettingsView } from './features/settings/SettingsView';

export const App: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const queryClient = useQueryClient();

  // Telemetry query (polls every 3.5 seconds)
  const { data: telemetry } = useQuery({
    queryKey: ['telemetry'],
    queryFn: api.getStatus,
    refetchInterval: 3500,
    enabled: isAuthenticated,
  });

  // Playit status query (polls every 6 seconds)
  const { data: playit } = useQuery({
    queryKey: ['playit'],
    queryFn: api.getPlayitStatus,
    refetchInterval: 6000,
    enabled: isAuthenticated,
  });

  // Server Action mutation
  const serverActionMutation = useMutation({
    mutationFn: (action: 'start' | 'stop' | 'restart' | 'kill') =>
      api.executeServerAction(action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemetry'] });
    },
  });

  const handleServerAction = async (
    action: 'start' | 'stop' | 'restart' | 'kill'
  ) => {
    await serverActionMutation.mutateAsync(action);
  };

  const handleKickPlayer = async (name: string, reason?: string) => {
    await api.kickPlayer(name, reason);
    queryClient.invalidateQueries({ queryKey: ['telemetry'] });
  };

  const handleBanPlayer = async (name: string, reason?: string) => {
    await api.kickPlayer(name, reason);
    queryClient.invalidateQueries({ queryKey: ['telemetry'] });
    queryClient.invalidateQueries({ queryKey: ['bans'] });
  };

  const handleToggleOp = async (name: string, isOp: boolean) => {
    if (!isOp) {
      await api.addOp(name, 4);
    } else {
      const ops = await api.getOps();
      const op = ops.find((o) => o.name.toLowerCase() === name.toLowerCase());
      if (op) {
        await api.removeOp(op.uuid);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['telemetry'] });
    queryClient.invalidateQueries({ queryKey: ['ops'] });
  };

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <MainLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      telemetry={telemetry || null}
      playit={playit || null}
      onServerAction={handleServerAction}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          {currentTab === 'dashboard' && (
            <DashboardView
              telemetry={telemetry || null}
              playit={playit || null}
              onServerAction={handleServerAction}
              onNavigateTab={setCurrentTab}
              onKickPlayer={handleKickPlayer}
              onBanPlayer={handleBanPlayer}
              onToggleOp={handleToggleOp}
            />
          )}

          {currentTab === 'versions' && <VersionsView />}

          {currentTab === 'console' && <ConsoleView />}

          {currentTab === 'properties' && <PropertiesView />}

          {currentTab === 'players' && <PlayersView />}

          {currentTab === 'mods' && <ModsView telemetry={telemetry || null} />}

          {currentTab === 'files' && <FilesView />}

          {currentTab === 'playit' && <PlayitView />}

          {currentTab === 'settings' && <SettingsView />}
        </motion.div>
      </AnimatePresence>
    </MainLayout>
  );
};
