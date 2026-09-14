import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface HoldButtonProps {
  onConfirm: () => void | Promise<void>;
  holdDurationMs?: number;
  label: string;
  holdingLabel?: string;
  completedLabel?: string;
  icon?: React.ReactNode;
  variant?: 'danger' | 'amber' | 'purple' | 'default';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

export const HoldButton: React.FC<HoldButtonProps> = ({
  onConfirm,
  holdDurationMs = 1800,
  label,
  holdingLabel,
  completedLabel,
  icon,
  variant = 'danger',
  size = 'sm',
  disabled = false,
  className = '',
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isExecuting, setIsExecuting] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const clearHold = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimeRef.current = null;
    setIsHolding(false);
    setProgress(0);
  }, []);

  const handleComplete = useCallback(async () => {
    clearHold();
    setIsExecuting(true);
    try {
      await onConfirm();
    } finally {
      setIsExecuting(false);
    }
  }, [clearHold, onConfirm]);

  const step = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const currentPct = Math.min(100, (elapsed / holdDurationMs) * 100);
      setProgress(currentPct);

      if (currentPct >= 100) {
        handleComplete();
      } else {
        animationFrameRef.current = requestAnimationFrame(step);
      }
    },
    [holdDurationMs, handleComplete]
  );

  const startHold = () => {
    if (disabled || isExecuting) return;
    setIsHolding(true);
    startTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Theme variants
  const styles = {
    danger: {
      border: 'border-rose-500/30 hover:border-rose-500/60',
      bg: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300',
      fill: 'bg-rose-600/50 shadow-[0_0_15px_rgba(244,63,94,0.4)]',
      glow: 'shadow-rose-500/20',
      textActive: 'text-rose-100',
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/60',
      bg: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300',
      fill: 'bg-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
      glow: 'shadow-amber-500/20',
      textActive: 'text-amber-100',
    },
    purple: {
      border: 'border-purple-500/30 hover:border-purple-500/60',
      bg: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300',
      fill: 'bg-purple-600/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]',
      glow: 'shadow-purple-500/20',
      textActive: 'text-purple-100',
    },
    default: {
      border: 'border-slate-700 hover:border-slate-600',
      bg: 'bg-slate-800/60 hover:bg-slate-800 text-slate-300',
      fill: 'bg-slate-600/50 shadow-[0_0_15px_rgba(148,163,184,0.3)]',
      glow: 'shadow-slate-500/20',
      textActive: 'text-white',
    },
  }[variant];

  const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  return (
    <div className="relative inline-block select-none">
      <motion.button
        type="button"
        disabled={disabled || isExecuting}
        onMouseDown={startHold}
        onMouseUp={clearHold}
        onMouseLeave={clearHold}
        onTouchStart={startHold}
        onTouchEnd={clearHold}
        onTouchCancel={clearHold}
        onContextMenu={(e) => e.preventDefault()}
        whileTap={!disabled && !isExecuting ? { scale: 0.97 } : undefined}
        className={`relative overflow-hidden rounded-xl border font-medium transition-colors cursor-pointer flex items-center gap-2 ${sizeClasses} ${styles.border} ${styles.bg} ${
          isHolding ? styles.textActive : ''
        } ${disabled || isExecuting ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        title="Mantén presionado para confirmar"
      >
        {/* Progress Fill Bar */}
        <div
          className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-[width] duration-75 ease-linear ${styles.fill}`}
          style={{ width: `${progress}%` }}
        />

        {/* Content */}
        <div className="relative z-10 flex items-center gap-1.5">
          {isExecuting ? (
            <svg className="animate-spin h-3.5 w-3.5 text-current" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            icon
          )}
          <span>
            {isExecuting
              ? completedLabel || 'Ejecutando...'
              : isHolding
              ? holdingLabel || `Mantén presionado... ${Math.round(progress)}%`
              : label}
          </span>
        </div>
      </motion.button>
    </div>
  );
};
