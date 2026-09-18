import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface RetroPixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
  variant?: 'emerald' | 'amber' | 'rose' | 'cyan' | 'obsidian';
  pixelColor?: string;
  baseColor?: string;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RetroPixelButton: React.FC<RetroPixelButtonProps> = ({
  children,
  className = '',
  variant = 'emerald',
  size = 'md',
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const variantStyles = {
    emerald: {
      border: 'border-emerald-500/40 hover:border-emerald-400',
      bg: 'bg-dark-900',
      pixelBg: '#10b981',
      text: 'text-emerald-300',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]',
    },
    amber: {
      border: 'border-amber-500/40 hover:border-amber-400',
      bg: 'bg-dark-900',
      pixelBg: '#f59e0b',
      text: 'text-amber-300',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]',
    },
    rose: {
      border: 'border-rose-500/40 hover:border-rose-400',
      bg: 'bg-dark-900',
      pixelBg: '#f43f5e',
      text: 'text-rose-300',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.2)]',
    },
    cyan: {
      border: 'border-cyan-500/40 hover:border-cyan-400',
      bg: 'bg-dark-900',
      pixelBg: '#06b6d4',
      text: 'text-cyan-300',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.2)]',
    },
    obsidian: {
      border: 'border-indigo-500/40 hover:border-indigo-400',
      bg: 'bg-dark-900',
      pixelBg: '#6366f1',
      text: 'text-indigo-300',
      glow: 'shadow-[0_0_20px_rgba(99,102,241,0.2)]',
    },
  };

  const style = variantStyles[variant];

  const sizeClasses = {
    sm: 'h-10 text-xs px-4',
    md: 'h-12 text-xs sm:text-sm px-6',
    lg: 'h-14 text-sm px-8',
  };

  return (
    <motion.button
      className={`group relative flex cursor-pointer items-center overflow-hidden rounded-xl border font-mono font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${style.border} ${style.bg} ${style.glow} ${sizeClasses[size]} ${className}`}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...(props as any)}
    >
      {/* Sliding Pixel Icon Block */}
      <motion.div
        className="absolute top-1 bottom-1 left-1 z-10 flex items-center justify-center overflow-hidden rounded-lg"
        style={{ backgroundColor: style.pixelBg }}
        animate={{
          width: isHovered ? 'calc(100% - 8px)' : size === 'sm' ? '32px' : '40px',
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 28,
        }}
      >
        <motion.div className="absolute right-0 flex h-full w-10 items-center justify-center">
          <motion.svg
            animate={{ rotate: isHovered ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            width="20"
            height="20"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="text-white"
          >
            <rect x="2" y="2" width="4" height="4" />
            <rect x="6" y="6" width="4" height="4" />
            <rect x="10" y="2" width="4" height="4" />
            <rect x="10" y="10" width="4" height="4" />
            <rect x="2" y="10" width="4" height="4" />
          </motion.svg>
        </motion.div>
      </motion.div>

      {/* Text Label with morph / blur animation */}
      <motion.div
        className="relative z-20 w-full text-center whitespace-nowrap"
        initial={{ paddingLeft: size === 'sm' ? 36 : 46, paddingRight: 0 }}
        animate={{
          paddingLeft: isHovered ? 0 : size === 'sm' ? 36 : 46,
          paddingRight: isHovered ? (size === 'sm' ? 36 : 46) : 0,
          color: isHovered ? '#ffffff' : undefined,
        }}
        transition={{
          type: 'spring',
          stiffness: 220,
          damping: 25,
        }}
      >
        <span className={isHovered ? 'text-white drop-shadow' : style.text}>{children}</span>
      </motion.div>
    </motion.button>
  );
};
