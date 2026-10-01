import React from 'react';
import {
  Sparkles,
  Terminal,
  Cpu,
  Shield,
  Zap,
  Radio,
  Rocket,
  Palette,
  Gamepad2,
  Crown,
  Bot,
  User,
} from 'lucide-react';

export const PRESET_AVATARS = [
  {
    id: 'avatar-code',
    name: 'Terminal Coder',
    icon: Terminal,
    bg: 'from-[#0049EA] via-blue-600 to-[#4CCAFA]',
    border: 'border-cyan-300',
    color: '#0049EA',
  },
  {
    id: 'avatar-bot',
    name: 'Cerebro IA',
    icon: Bot,
    bg: 'from-emerald-400 via-teal-500 to-cyan-500',
    border: 'border-emerald-300',
    color: '#10b981',
  },
  {
    id: 'avatar-energy',
    name: 'Rayo Neón',
    icon: Zap,
    bg: 'from-amber-400 via-orange-500 to-rose-600',
    border: 'border-amber-300',
    color: '#f59e0b',
  },
  {
    id: 'avatar-cyber',
    name: 'Estrella Neón',
    icon: Sparkles,
    bg: 'from-fuchsia-500 via-pink-500 to-rose-500',
    border: 'border-fuchsia-300',
    color: '#d946ef',
  },
  {
    id: 'avatar-crown',
    name: 'Corona Imperial',
    icon: Crown,
    bg: 'from-violet-600 via-purple-600 to-indigo-700',
    border: 'border-purple-300',
    color: '#8b5cf6',
  },
];

// Mapping for legacy avatar IDs to the 5 modern presets
const LEGACY_AVATAR_MAP = {
  'avatar-dev': 'avatar-code',
  'avatar-ai': 'avatar-bot',
  'avatar-admin': 'avatar-crown',
  'avatar-creative': 'avatar-cyber',
  'avatar-sparkle': 'avatar-cyber',
  'avatar-astronaut': 'avatar-crown',
  'avatar-gamer': 'avatar-cyber',
  'avatar-security': 'avatar-crown',
  'avatar-broadcast': 'avatar-energy',
  'avatar-user': 'avatar-code',
};

export const getCleanAvatarId = (avatarString) => {
  if (!avatarString || typeof avatarString !== 'string') return avatarString;
  const trimmed = avatarString.trim();
  // Extract preset avatar if wrapped in a URL or path like /api/media/stream/avatar-code
  const streamMatch = trimmed.match(/(?:^|\/)(avatar-[a-z0-9-]+)(?:\?.*)?$/i);
  if (streamMatch) {
    return streamMatch[1];
  }
  return trimmed;
};

export const resolveAvatarUrl = (url) => {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  if (apiBase.startsWith('http')) {
    const backendRoot = apiBase.replace(/\/api\/?$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${backendRoot}${cleanPath}`;
  }
  return url;
};

export const renderUserAvatar = (avatarString, name = 'Usuario', className = 'w-10 h-10') => {
  if (!avatarString) {
    return (
      <div
        className={`${className} rounded-2xl bg-gradient-to-tr from-[#0049EA] to-[#4CCAFA] text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  // Clean and resolve legacy or stream-wrapped preset IDs
  const cleanId = getCleanAvatarId(avatarString);
  const effectiveId = LEGACY_AVATAR_MAP[cleanId] || cleanId;

  // Check if it's a preset avatar
  const preset = PRESET_AVATARS.find((p) => p.id === effectiveId);
  if (preset) {
    const Icon = preset.icon;
    return (
      <div
        className={`${className} rounded-2xl bg-gradient-to-tr ${preset.bg} border ${preset.border}/40 text-white flex items-center justify-center shadow-lg shrink-0`}
        title={preset.name}
      >
        <Icon className="w-1/2 h-1/2" />
      </div>
    );
  }

  // Otherwise, it's a custom image URL or uploaded file stream
  const resolvedSrc = resolveAvatarUrl(avatarString);

  return (
    <img
      src={resolvedSrc}
      alt={name}
      onError={(e) => {
        // Fallback to letter on image loading failure
        e.currentTarget.style.display = 'none';
        if (e.currentTarget.nextSibling) {
          e.currentTarget.nextSibling.style.display = 'flex';
        }
      }}
      className={`${className} rounded-2xl object-cover border border-white/20 shadow-md shrink-0`}
    />
  );
};
