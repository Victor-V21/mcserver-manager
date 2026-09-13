import React from 'react';
import { LucideIcon } from 'lucide-react';

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
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      barColor: 'bg-emerald-500',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.08)]',
    },
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400',
      barColor: 'bg-cyan-500',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.08)]',
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400',
      barColor: 'bg-amber-500',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.08)]',
    },
    rose: {
      border: 'border-rose-500/20 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 text-rose-400',
      barColor: 'bg-rose-500',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.08)]',
    },
    indigo: {
      border: 'border-indigo-500/20 hover:border-indigo-500/40',
      iconBg: 'bg-indigo-500/10 text-indigo-400',
      barColor: 'bg-indigo-500',
      glow: 'shadow-[0_0_20px_rgba(99,102,241,0.08)]',
    },
  };

  const style = variantStyles[variant];
  const clampedPercentage = percentage !== undefined ? Math.min(Math.max(percentage, 0), 100) : null;

  return (
    <div
      className={`glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all ${style.border} ${style.glow}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded-xl ${style.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
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
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${style.barColor} transition-all duration-500 ease-out`}
              style={{ width: `${clampedPercentage}%` }}
            />
          </div>
        </div>
      )}

      {extraContent && <div className="mt-3 pt-2 border-t border-slate-800/80">{extraContent}</div>}
    </div>
  );
};
