/**
 * Visor TV Enterprise Themes System - Custom Royal Blue & Cyan Edition
 * Palette: #0049EA (Electric Royal Blue), #4CCAFA (Cyan Sky), #BCD1CB (Soft Sage/Slate), #FFFFFF (Pure White)
 */

export const ADMIN_THEMES = [
  {
    id: 'royal-blue',
    name: 'Azul Real & Cyan',
    description: 'Paleta moderna y luminosa con azul eléctrico (#0049EA), acentos cian (#4CCAFA), blanco (#FFFFFF) y bordes niebla sage (#BCD1CB).',
    category: 'light',
    previewColors: {
      bg: '#ffffff',
      primary: '#0049EA',
      accent: '#4CCAFA',
      neutral: '#BCD1CB',
    },
    admin: {
      layout: 'text-slate-900',
      sidebar: 'bg-white border-r border-[#BCD1CB]/60 text-slate-700 shadow-[4px_0_24px_rgba(0,73,234,0.03)]',
      sidebarBrand: 'border-b border-[#BCD1CB]/40 text-slate-900',
      sidebarNavActive: 'bg-gradient-to-r from-[#0049EA] to-[#0d59f2] text-white shadow-lg shadow-blue-600/25 font-semibold',
      sidebarNavHover: 'text-slate-600 hover:text-[#0049EA] hover:bg-blue-50/70',
      sidebarFooter: 'border-t border-[#BCD1CB]/40 bg-slate-50/60',
      mainContent: 'bg-transparent',
      card: 'bg-white/95 backdrop-blur-md border border-[#BCD1CB]/50 text-slate-800 shadow-[0_10px_30px_-5px_rgba(0,73,234,0.06),0_4px_12px_-2px_rgba(0,0,0,0.02)]',
      cardHeader: 'border-b border-[#BCD1CB]/30',
      textPrimary: 'text-slate-900',
      textSecondary: 'text-slate-500',
      accentText: 'text-[#0049EA] font-semibold',
      btnPrimary: 'bg-gradient-to-r from-[#0049EA] to-[#0284c7] hover:from-[#003bbd] hover:to-[#0275b1] text-white shadow-md shadow-blue-600/25',
      badge: 'bg-blue-50 text-[#0049EA] border border-[#BCD1CB]/80',
    },
    tv: {
      container: 'bg-black text-white',
      timeline: 'bg-gradient-to-r from-[#0049EA] via-[#4CCAFA] to-[#0049EA]',
      badge: 'bg-gradient-to-r from-[#0049EA] to-[#4CCAFA] text-white border border-[#4CCAFA]/40',
    },
  },
];

export const getAdminTheme = (_themeId) => {
  return ADMIN_THEMES[0];
};
