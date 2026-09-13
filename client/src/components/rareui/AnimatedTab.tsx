import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface AnimatedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  layoutId?: string;
}

export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  layoutId = 'active-pill',
}) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  return (
    <div
      className={`flex flex-row flex-nowrap items-center gap-1 rounded-2xl p-1.5 bg-dark-900/90 border border-slate-800/80 backdrop-blur-xl shadow-lg max-w-full overflow-x-auto ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isHovered = hoveredTab === tab.id;

        return (
          <motion.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
            whileTap={{ scale: 0.96 }}
            className={`relative z-10 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors duration-200 outline-none flex items-center gap-2 ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {/* Active Pill with Glowing Border */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 z-[-1] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/30"
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 30,
                  mass: 0.8,
                }}
              />
            )}

            {/* Hover Background */}
            {isHovered && !isActive && (
              <motion.div
                layoutId={`${layoutId}-hover`}
                className="absolute inset-0 z-[-1] rounded-xl bg-slate-800/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            )}

            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span className="relative z-10">{tab.label}</span>

            {tab.badge !== undefined && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-black/30 text-white'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
