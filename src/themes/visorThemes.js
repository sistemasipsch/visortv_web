export const VISOR_THEMES = [
  {
    id: 'visor-kiosk',
    name: 'Visor TV Kiosk',
    description: 'Reproductor minimalista a pantalla completa en fondo negro puro con acentos azul y cian.',
    category: 'dark',
    switcherDot: '#0049EA',
    colors: {
      bg: '#000000',
      primary: '#0049EA',
      accent: '#4CCAFA',
      neutral: '#BCD1CB',
    },
    classes: {
      container: 'bg-black text-white',
      topHud: 'bg-gradient-to-b from-black/90 via-black/50 to-transparent text-white',
      bottomHud: 'bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white',
      title: 'text-white font-extrabold',
      badge: 'bg-gradient-to-r from-[#0049EA] to-[#4CCAFA] text-white border border-[#4CCAFA]/50 shadow-lg shadow-blue-600/30 font-bold',
      liveDot: 'bg-[#4CCAFA]',
      clock: 'bg-slate-900/85 border-[#BCD1CB]/40 text-white backdrop-blur-xl shadow-xl',
      counter: 'bg-slate-900/85 border-[#BCD1CB]/40 text-white backdrop-blur-xl shadow-xl',
      controlBtn: 'bg-slate-900/85 hover:bg-slate-800 text-slate-200 hover:text-white border-[#BCD1CB]/40 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all',
      accentBtn: 'bg-gradient-to-r from-[#0049EA] to-[#4CCAFA] hover:from-[#003bbd] hover:to-[#38bde8] text-white shadow-xl shadow-blue-600/40 font-bold',
      progressBar: 'bg-gradient-to-r from-[#0049EA] via-[#4CCAFA] to-[#0049EA]',
      ambientProgress: 'bg-[#0049EA]',
    },
  },
];

export const getThemeById = (_themeId) => {
  return VISOR_THEMES[0];
};
