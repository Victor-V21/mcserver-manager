import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// 1. RareServerIcon: Blade server rack with blinking LED activity lights
export const RareServerIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <rect x="2" y="3" width="20" height="7" rx="2" stroke="currentColor" strokeWidth="1.75" />
    <rect x="2" y="14" width="20" height="7" rx="2" stroke="currentColor" strokeWidth="1.75" />
    <circle cx="6" cy="6.5" r="1.5" fill="#10b981" className="animate-pulse" />
    <circle cx="10" cy="6.5" r="1.5" fill="#06b6d4" />
    <line x1="14" y1="6.5" x2="18" y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <circle cx="6" cy="17.5" r="1.5" fill="#10b981" className="animate-ping" />
    <circle cx="10" cy="17.5" r="1.5" fill="#f59e0b" />
    <line x1="14" y1="17.5" x2="18" y2="17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
  </svg>
);

// 2. RareTerminalIcon: CRT Console with animated blinking cursor
export const RareTerminalIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <rect x="2.5" y="3.5" width="19" height="17" rx="3" stroke="currentColor" strokeWidth="1.75" />
    <polyline points="6 9 10 12 6 15" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="15" x2="16" y2="15" stroke="#34d399" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
  </svg>
);

// 3. RareVersionsIcon: 3D Isometric Minecraft Block / NeoForge Engine
export const RareVersionsIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Top Face */}
    <path d="M12 2L21 7L12 12L3 7L12 2Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    {/* Left Face */}
    <path d="M3 7L12 12V22L3 17V7Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    {/* Right Face */}
    <path d="M21 7L12 12V22L21 17V7Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    {/* Center Core Pixel */}
    <rect x="10.5" y="5.5" width="3" height="3" fill="#10b981" className="animate-pulse" />
  </svg>
);

// 4. RarePropertiesIcon: Equalizer / Dynamic sliders
export const RarePropertiesIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <line x1="4" y1="21" x2="4" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="4" y1="10" x2="4" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="21" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="8" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="20" y1="21" x2="20" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="20" y1="12" x2="20" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="2" y="10" width="4" height="4" rx="1" fill="#f59e0b" />
    <rect x="10" y="8" width="4" height="4" rx="1" fill="#10b981" />
    <rect x="18" y="12" width="4" height="4" rx="1" fill="#06b6d4" />
  </svg>
);

// 5. RarePlayersIcon: Pixelated Steve Head with floating crown
export const RarePlayersIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <rect x="4" y="6" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="1.75" />
    <rect x="7" y="11" width="3" height="3" fill="#10b981" />
    <rect x="14" y="11" width="3" height="3" fill="#10b981" />
    <rect x="9" y="16" width="6" height="2" fill="currentColor" fillOpacity="0.8" />
    {/* Crown */}
    <path d="M6 3L8.5 5L12 2L15.5 5L18 3V6H6V3Z" fill="#f59e0b" className="animate-pulse" />
  </svg>
);

// 6. RareModsIcon: Mod Package with Diamond ore gems
export const RareModsIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="1.5" fill="#38bdf8" className="animate-pulse" />
    <circle cx="7" cy="14.5" r="1" fill="#38bdf8" />
    <circle cx="17" cy="14.5" r="1" fill="#38bdf8" />
  </svg>
);

// 7. RarePlayitIcon: Radar Antenna broadcast with animated waves
export const RarePlayitIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <path d="M4.93 4.93C1.02 8.84 1.02 15.16 4.93 19.07" stroke="#06b6d4" strokeWidth="1.75" strokeLinecap="round" className="animate-pulse" />
    <path d="M19.07 4.93C22.98 8.84 22.98 15.16 19.07 19.07" stroke="#06b6d4" strokeWidth="1.75" strokeLinecap="round" className="animate-pulse" />
    <path d="M7.76 7.76C5.02 10.49 5.02 14.91 7.76 17.64" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M16.24 7.76C18.98 10.49 18.98 14.91 16.24 17.64" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <circle cx="12" cy="12.7" r="2.5" fill="#38bdf8" />
    <line x1="12" y1="15.2" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 8. RareSettingsIcon: Dual interlocking mechanical gears
export const RareSettingsIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 group-hover:rotate-45 transition-transform duration-500 ${className}`}
  >
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 9. RarePowerIcon: Electric lightning spark
export const RarePowerIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <path
      d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
      fill="#f59e0b"
      stroke="#d97706"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="animate-pulse"
    />
  </svg>
);

// 10. RareCpuIcon
export const RareCpuIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
    <rect x="8.5" y="8.5" width="7" height="7" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1.5" />
    <path d="M9 1V4M15 1V4M9 20V23M15 20V23M20 9H23M20 15H23M1 9H4M1 15H4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

// 11. RareRamIcon
export const RareRamIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
    <line x1="6" y1="19" x2="6" y2="15" stroke="currentColor" strokeWidth="1.5" />
    <line x1="10" y1="19" x2="10" y2="15" stroke="currentColor" strokeWidth="1.5" />
    <line x1="14" y1="19" x2="14" y2="15" stroke="currentColor" strokeWidth="1.5" />
    <line x1="18" y1="19" x2="18" y2="15" stroke="currentColor" strokeWidth="1.5" />
    <rect x="5" y="8" width="14" height="4" fill="#06b6d4" fillOpacity="0.3" stroke="#06b6d4" strokeWidth="1.2" />
  </svg>
);

// 12. RareDiskIcon
export const RareDiskIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <line x1="22" y1="12" x2="2" y2="12" stroke="currentColor" strokeWidth="1.75" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    <line x1="6" y1="16" x2="6.01" y2="16" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="10" y1="16" x2="10.01" y2="16" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// 13. RareTpsIcon
export const RareTpsIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <polyline points="2 12 6 12 9 4 15 20 18 12 22 12" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse" />
  </svg>
);

// 14. RareFilesIcon: Folder hierarchy with floating document sheet
export const RareFilesIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <path
      d="M4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.1"
    />
    <rect x="8" y="10" width="8" height="6" rx="1" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1.2" className="animate-pulse" />
    <line x1="10" y1="12" x2="14" y2="12" stroke="#34d399" strokeWidth="1" strokeLinecap="round" />
    <line x1="10" y1="14" x2="13" y2="14" stroke="#34d399" strokeWidth="1" strokeLinecap="round" />
  </svg>
);
