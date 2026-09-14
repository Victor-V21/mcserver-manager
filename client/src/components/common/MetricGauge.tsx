import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface MetricGaugeProps {
  title: string;
  value: string | number;
  subtitle?: string;
  percentage?: number;
  icon: LucideIcon;
  variant?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'indigo';
  extraContent?: React.ReactNode;
}

export const MetricGauge: React.FC<MetricGaugeProps> = ({
  title,
  value,
  subtitle,
  percentage,
  icon: Icon,
  variant = 'emerald',
  extraContent,
}) => {
  const variantStyles = {
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/50',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      barColor: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.08)] hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]',
    },
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/50',
      iconBg: 'bg-cyan-500/10 text-cyan-400',
      barColor: 'bg-gradient-to-r from-cyan-500 to-blue-400',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.08)] hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]',
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/50',
      iconBg: 'bg-amber-500/10 text-amber-400',
      barColor: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.08)] hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]',
    },
    rose: {
      border: 'border-rose-500/20 hover:border-rose-500/50',
      iconBg: 'bg-rose-500/10 text-rose-400',
      barColor: 'bg-gradient-to-r from-rose-500 to-red-400',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.08)] hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]',
    },
    indigo: {
      border: 'border-indigo-500/20 hover:border-indigo-500/50',
      iconBg: 'bg-indigo-500/10 text-indigo-400',
      barColor: 'bg-gradient-to-r from-indigo-500 to-purple-400',
      glow: 'shadow-[0_0_20px_rgba(99,102,241,0.08)] hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]',
    },
  };

  const style = variantStyles[variant];
  const clampedPercentage = percentage !== undefined ? Math.min(Math.max(percentage, 0), 100) : null;

  return (
    <motion.div
      className={`glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-colors duration-200 cursor-default ${style.border} ${style.glow}`}
      whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <motion.div
          className={`p-2 rounded-xl ${style.iconBg}`}
          whileHover={{ scale: 1.1, rotate: 3 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      </div>

      <div className="space-y-1 my-1">
        <div className="text-2xl font-bold text-white tracking-tight font-mono">
          {value}
        </div>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      {clampedPercentage !== null && (
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>Uso</span>
            <span>{clampedPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className={`h-full ${style.barColor} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${clampedPercentage}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      )}

      {extraContent && <div className="mt-3 pt-2 border-t border-slate-800/80">{extraContent}</div>}
    </motion.div>
  );
};
