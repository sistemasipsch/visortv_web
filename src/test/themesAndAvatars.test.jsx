import { describe, it, expect } from 'vitest';
import { VISOR_THEMES, getThemeById } from '../themes/visorThemes';
import { ADMIN_THEMES, getAdminTheme } from '../themes/adminThemes';
import { PRESET_AVATARS, renderUserAvatar } from '../utils/avatarUtils';

describe('Visor TV Themes', () => {
  it('defines the unified Visor TV Kiosk aesthetic', () => {
    expect(VISOR_THEMES).toHaveLength(1);
    const theme = VISOR_THEMES[0];
    expect(theme.id).toBe('visor-kiosk');
    expect(theme.classes.container).toBe('bg-black text-white');
    expect(theme.colors.primary).toBe('#0049EA');
  });

  it('retrieves theme by ID and normalizes any legacy IDs', () => {
    const theme = getThemeById('visor-kiosk');
    expect(theme.id).toBe('visor-kiosk');
    expect(theme.classes.container).toBe('bg-black text-white');

    // Legacy IDs gracefully resolve to the unified kiosk aesthetic
    expect(getThemeById('light-blue').id).toBe('visor-kiosk');
    expect(getThemeById('cyberdeck').id).toBe('visor-kiosk');
    expect(getThemeById('retro-arcade').id).toBe('visor-kiosk');
    expect(getThemeById('non-existent-theme-id').id).toBe('visor-kiosk');
  });

  it('contains required styling class tokens and colors', () => {
    VISOR_THEMES.forEach((theme) => {
      expect(theme.classes).toBeDefined();
      expect(theme.classes.container).toBe('bg-black text-white');
      expect(theme.classes.topHud).toBeDefined();
      expect(theme.classes.badge).toBeDefined();
      expect(theme.classes.clock).toBeDefined();
      expect(theme.classes.controlBtn).toBeDefined();
      expect(theme.classes.progressBar).toBeDefined();
      expect(theme.colors.primary).toBeDefined();
    });
  });
});

describe('Avatar Utilities', () => {
  it('defines 5 vibrant preset avatars', () => {
    expect(PRESET_AVATARS).toHaveLength(5);
    const ids = PRESET_AVATARS.map((a) => a.id);
    expect(ids).toContain('avatar-code');
    expect(ids).toContain('avatar-bot');
    expect(ids).toContain('avatar-energy');
    expect(ids).toContain('avatar-cyber');
    expect(ids).toContain('avatar-crown');
  });

  it('renders fallback initial when avatarString is null', () => {
    const vnode = renderUserAvatar(null, 'Ashly Nicole');
    expect(vnode).toBeDefined();
    expect(vnode.props.children).toBe('A');
  });

  it('renders preset avatar correctly', () => {
    const vnode = renderUserAvatar('avatar-code', 'Ashly');
    expect(vnode).toBeDefined();
    expect(vnode.props.title).toBe('Terminal Coder');
  });

  it('renders legacy preset avatar through fallback map', () => {
    const vnode = renderUserAvatar('avatar-dev', 'Ashly');
    expect(vnode).toBeDefined();
    expect(vnode.props.title).toBe('Terminal Coder');
  });

  it('renders image avatar with resolved URL', () => {
    const vnode = renderUserAvatar('/api/media/stream/avatar_1_123.jpg', 'Ashly');
    expect(vnode).toBeDefined();
    expect(vnode.type).toBe('img');
    expect(vnode.props.src).toContain('/api/media/stream/avatar_1_123.jpg');
    expect(vnode.props.alt).toBe('Ashly');
  });
});

describe('Admin Interface Themes', () => {
  it('defines the unified Royal Blue & Cyan admin theme', () => {
    expect(ADMIN_THEMES).toHaveLength(1);
    const theme = ADMIN_THEMES[0];
    expect(theme.id).toBe('royal-blue');
    expect(theme.name).toBe('Azul Real & Cyan');
    expect(theme.previewColors.primary).toBe('#0049EA');
  });

  it('retrieves admin theme and normalizes legacy IDs', () => {
    const theme = getAdminTheme('royal-blue');
    expect(theme.name).toBe('Azul Real & Cyan');
    expect(theme.admin.sidebar).toContain('#BCD1CB');

    expect(getAdminTheme('retro-arcade').id).toBe('royal-blue');
    expect(getAdminTheme('cyberdeck').id).toBe('royal-blue');
    expect(getAdminTheme('invalid-theme').id).toBe('royal-blue');
  });

  it('provides layout, sidebar, card, and tv timeline tokens with box-shadow', () => {
    ADMIN_THEMES.forEach((theme) => {
      expect(theme.admin).toBeDefined();
      expect(theme.admin.layout).toBeDefined();
      expect(theme.admin.sidebar).toBeDefined();
      expect(theme.admin.sidebarNavActive).toBeDefined();
      expect(theme.admin.card).toContain('shadow-');
      expect(theme.tv).toBeDefined();
      expect(theme.tv.container).toBe('bg-black text-white');
    });
  });
});
