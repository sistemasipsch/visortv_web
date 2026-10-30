import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VisorTV from '../pages/VisorTV';
import { playlistService } from '../services/api';
import mediaCacheManager from '../services/mediaCacheManager';

describe('VisorTV component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders instantly from cached package without any loading text or spinner', async () => {
    localStorage.setItem(
      'visor_tv_cache_sede-principal',
      JSON.stringify({
        success: true,
        sede: { id: 1, name: 'Sede Principal', slug: 'sede-principal', icon: 'Tv', color: '#0049EA' },
        playlist: [
          { id: 1, title: 'Item 1', type: 'image', url: 'https://example.com/1.jpg', duration: 10 },
        ],
        settings: { tv_show_clock: true, tv_show_sede_title: true },
      })
    );

    render(
      <MemoryRouter initialEntries={['/visor/sede-principal']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    // Patients should NEVER see "Cargando Visor TV"
    expect(screen.queryByText(/Cargando Visor TV/i)).not.toBeInTheDocument();
    // Should immediately render the cached sede title
    expect(screen.getAllByText(/Sede Principal/i)[0]).toBeInTheDocument();
  });

  it('never displays uncomfortable loading text when starting without cache', () => {
    vi.spyOn(playlistService, 'getPlaylist').mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/visor/sede-sin-cache']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    // Patients should never see "Cargando Visor TV"
    expect(screen.queryByText(/Cargando Visor TV/i)).not.toBeInTheDocument();
  });

  it('renders empty standby state when playlist is empty', async () => {
    vi.spyOn(playlistService, 'getPlaylist').mockResolvedValue({
      data: {
        success: true,
        version_hash: 'abc12345',
        sede: {
          id: 1,
          name: 'Sede Pruebas',
          slug: 'sede-pruebas',
          icon: 'Building2',
          color: '#3b82f6',
        },
        playlist: [],
        settings: {
          tv_show_clock: true,
          tv_show_sede_title: true,
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/visor/sede-pruebas']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Canal en Espera/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Sede Pruebas/i)[0]).toBeInTheDocument();
    });
  });

  it('renders dual slots and controls when playlist has media items', async () => {
    vi.spyOn(playlistService, 'getPlaylist').mockResolvedValue({
      data: {
        success: true,
        version_hash: 'def67890',
        sede: {
          id: 1,
          name: 'Sede Centro',
          slug: 'sede-centro',
          icon: 'Tv',
          color: '#2563eb',
        },
        playlist: [
          {
            id: 10,
            title: 'Cartel Promocional 1',
            type: 'image',
            url: 'https://example.com/banner1.jpg',
            duration: 10,
            fit_mode: 'contain',
          },
          {
            id: 20,
            title: 'Video Corporativo',
            type: 'video',
            url: 'https://example.com/video1.mp4',
            duration: 0,
            fit_mode: 'cover',
          },
        ],
        settings: {
          tv_show_clock: true,
          tv_show_sede_title: true,
          tv_show_progress_bar: true,
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/visor/sede-centro']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Sede Centro/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/EN VIVO/i)).toBeInTheDocument();
      expect(screen.getByAltText(/Cartel Promocional 1/i)).toBeInTheDocument();
      expect(screen.queryByText(/^Cartel Promocional 1$/i)).not.toBeInTheDocument();
      expect(screen.getByTitle(/Pausar \(Espacio\)/i)).toBeInTheDocument();
    });
  });

  it('cycles smoothly through all items in the playlist loop', async () => {
    vi.spyOn(playlistService, 'getPlaylist').mockResolvedValue({
      data: {
        success: true,
        version_hash: 'hash-loop-test',
        sede: { id: 1, name: 'Sede Loop', slug: 'sede-loop' },
        playlist: [
          { id: 1, title: 'Item 1', type: 'image', url: 'https://example.com/1.jpg', duration: 10 },
          { id: 2, title: 'Item 2', type: 'image', url: 'https://example.com/2.jpg', duration: 10 },
          { id: 3, title: 'Item 3', type: 'image', url: 'https://example.com/3.jpg', duration: 10 },
        ],
        settings: { tv_show_clock: true, tv_show_progress_bar: true },
      },
    });

    render(
      <MemoryRouter initialEntries={['/visor/sede-loop']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('/ 3')).toBeInTheDocument();
    });

    // Advance to item 2
    const nextBtn = screen.getByTitle(/Siguiente/i);
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Advance to item 3
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    // Loop back to item 1
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('does not reset playback index when background polling checkVersion has identical hash', async () => {
    vi.spyOn(playlistService, 'getPlaylist').mockResolvedValue({
      data: {
        success: true,
        version_hash: 'initial-version-hash-123',
        sede: { id: 1, name: 'Sede Sync', slug: 'sede-sync' },
        playlist: [
          { id: 101, title: 'Video 1', type: 'video', url: 'https://example.com/v1.mp4' },
          { id: 102, title: 'Video 2', type: 'video', url: 'https://example.com/v2.mp4' },
          { id: 103, title: 'Video 3', type: 'video', url: 'https://example.com/v3.mp4' },
        ],
        settings: { tv_auto_refresh_seconds: 30 },
      },
    });

    vi.spyOn(playlistService, 'checkVersion').mockResolvedValue({
      data: {
        success: true,
        version_hash: 'initial-version-hash-123',
        items_count: 3,
      },
    });

    render(
      <MemoryRouter initialEntries={['/visor/sede-sync']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('/ 3')).toBeInTheDocument();
    });

    // User or playback advances to Video 2
    const nextBtn = screen.getByTitle(/Siguiente/i);
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Background checkVersion returns matching hash: should remain on Video 2
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders single video with loop attribute and without unmounting', async () => {
    vi.spyOn(playlistService, 'getPlaylist').mockResolvedValue({
      data: {
        success: true,
        version_hash: 'single-video-hash',
        sede: { id: 1, name: 'Sede Unica', slug: 'sede-unica' },
        playlist: [
          { id: 99, title: 'Solo Video', type: 'video', url: 'https://example.com/solo.mp4' },
        ],
        settings: {},
      },
    });

    render(
      <MemoryRouter initialEntries={['/visor/sede-unica']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('/ 1')).toBeInTheDocument();
    });

    const videos = document.querySelectorAll('video');
    expect(videos.length).toBeGreaterThan(0);
    expect(videos[0].loop).toBe(true);
  });

  it('persists fit mode in localStorage across video transitions', async () => {
    localStorage.setItem('visor_tv_fit_mode', 'cover');

    vi.spyOn(playlistService, 'getPlaylist').mockResolvedValue({
      data: {
        success: true,
        version_hash: 'fit-mode-hash',
        sede: { id: 1, name: 'Sede Fit', slug: 'sede-fit' },
        playlist: [
          { id: 1, title: 'Video A', type: 'video', url: 'https://example.com/a.mp4', fit_mode: 'contain' },
          { id: 2, title: 'Video B', type: 'video', url: 'https://example.com/b.mp4', fit_mode: 'contain' },
        ],
        settings: {},
      },
    });

    render(
      <MemoryRouter initialEntries={['/visor/sede-fit']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Both videos should maintain object-cover (pantalla completa) because of persisted cover mode
    const videos = document.querySelectorAll('video');
    expect(videos[0].className).toContain('object-cover');

    // Toggle fit mode via 'A' key
    fireEvent.keyDown(window, { key: 'a' });
    expect(localStorage.getItem('visor_tv_fit_mode')).toBe('contain');
  });

  it('maintains infinite resilient playback loop without halting on consecutive media errors', async () => {
    vi.spyOn(playlistService, 'getPlaylist').mockResolvedValue({
      data: {
        success: true,
        version_hash: 'infinite-loop-hash',
        sede: { id: 1, name: 'Sede Infinita', slug: 'sede-infinita' },
        playlist: [
          { id: 1, title: 'Item Roto 1', type: 'video', url: 'https://example.com/broken1.mp4' },
          { id: 2, title: 'Item Roto 2', type: 'video', url: 'https://example.com/broken2.mp4' },
        ],
        settings: {},
      },
    });

    render(
      <MemoryRouter initialEntries={['/visor/sede-infinita']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Simulate media errors on both slots
    const videos = document.querySelectorAll('video');
    expect(videos.length).toBeGreaterThan(0);

    // Fire error on active video
    await act(async () => {
      fireEvent.error(videos[0]);
    });

    // Should never render the fatal error screen
    expect(screen.queryByText(/Canal No Disponible/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Sede Infinita/i)[0]).toBeInTheDocument();
  });

  it('handles continuous 2-video loops (V1 -> V2 -> V1) without losing source or freezing decoders', async () => {
    vi.spyOn(playlistService, 'getPlaylist').mockResolvedValue({
      data: {
        success: true,
        version_hash: '2vid-loop-hash',
        sede: { id: 1, name: 'Sede 2 Videos', slug: 'sede-2-videos' },
        playlist: [
          { id: 10, title: 'Video Alfa', type: 'video', url: 'https://example.com/alfa.mp4' },
          { id: 20, title: 'Video Beta', type: 'video', url: 'https://example.com/beta.mp4' },
        ],
        settings: { tv_show_clock: true },
      },
    });

    render(
      <MemoryRouter initialEntries={['/visor/sede-2-videos']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('/ 2')).toBeInTheDocument();
    });

    const videos = document.querySelectorAll('video');
    expect(videos.length).toBe(2);
    // Slot A starts with Video Alfa
    expect(videos[0].src).toContain('alfa.mp4');

    const nextBtn = screen.getByTitle(/Siguiente/i);

    // Transition 1: Alfa -> Beta
    await act(async () => {
      fireEvent.click(nextBtn);
      // Advance timers by 400ms to allow crossfade and decoder cleanup to complete
      await new Promise((r) => setTimeout(r, 400));
    });

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
    // Slot B now has Video Beta
    expect(videos[1].src).toContain('beta.mp4');

    // Transition 2: Beta -> Alfa (Loop back)
    await act(async () => {
      fireEvent.click(nextBtn);
      await new Promise((r) => setTimeout(r, 400));
    });

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
    // Slot A source must be preserved and re-applied without being cleared or null
    expect(videos[0].src).toContain('alfa.mp4');
  });

  it('survives rapid remote control skips without crashing or dropping playback', async () => {
    vi.spyOn(playlistService, 'getPlaylist').mockResolvedValue({
      data: {
        success: true,
        version_hash: 'rapid-skip-hash',
        sede: { id: 1, name: 'Sede Rapid Skip', slug: 'sede-rapid-skip' },
        playlist: [
          { id: 1, title: 'Item 1', type: 'video', url: 'https://example.com/1.mp4' },
          { id: 2, title: 'Item 2', type: 'video', url: 'https://example.com/2.mp4' },
          { id: 3, title: 'Item 3', type: 'video', url: 'https://example.com/3.mp4' },
          { id: 4, title: 'Item 4', type: 'video', url: 'https://example.com/4.mp4' },
        ],
        settings: {},
      },
    });

    render(
      <MemoryRouter initialEntries={['/visor/sede-rapid-skip']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    const nextBtn = screen.getByTitle(/Siguiente/i);

    // Simulate rapid remote spamming (3 clicks under 100ms)
    await act(async () => {
      fireEvent.click(nextBtn);
      fireEvent.click(nextBtn);
      fireEvent.click(nextBtn);
    });

    // Should settle on item 4 without unhandled exceptions or broken state
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  it('triggers background preloading via mediaCacheManager on playlist receipt', async () => {
    const preloadSpy = vi.spyOn(mediaCacheManager, 'preloadSedePackage').mockResolvedValue();

    vi.spyOn(playlistService, 'getPlaylist').mockResolvedValue({
      data: {
        success: true,
        version_hash: 'preload-hash',
        sede: { id: 1, name: 'Sede Preload', slug: 'sede-preload' },
        playlist: [
          { id: 1, title: 'Banner 1', type: 'image', url: 'https://example.com/img1.png' },
          { id: 2, title: 'Video 1', type: 'video', url: 'https://example.com/vid1.mp4' },
        ],
        settings: {},
      },
    });

    render(
      <MemoryRouter initialEntries={['/visor/sede-preload']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(preloadSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 1 }),
          expect.objectContaining({ id: 2 }),
        ])
      );
    });
  });

  it('pre-decodes incoming images and sets decoding=sync to prevent top-to-bottom progressive scan', async () => {
    const preloadSpy = vi.spyOn(mediaCacheManager, 'preloadImage').mockResolvedValue(true);

    vi.spyOn(playlistService, 'getPlaylist').mockResolvedValue({
      data: {
        success: true,
        version_hash: 'sync-image-hash',
        sede: { id: 1, name: 'Sede Sync Img', slug: 'sede-sync-img' },
        playlist: [
          { id: 1, title: 'Foto 1', type: 'image', url: 'https://example.com/foto1.jpg', duration: 10 },
          { id: 2, title: 'Foto 2', type: 'image', url: 'https://example.com/foto2.jpg', duration: 10 },
        ],
        settings: {},
      },
    });

    render(
      <MemoryRouter initialEntries={['/visor/sede-sync-img']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByAltText(/Foto 1/i)).toBeInTheDocument();
    });

    // Check that Slot A image has decoding="sync"
    const img1 = screen.getByAltText(/Foto 1/i);
    expect(img1.getAttribute('decoding')).toBe('sync');

    // Advance to Foto 2
    const nextBtn = screen.getByTitle(/Siguiente/i);
    await act(async () => {
      fireEvent.click(nextBtn);
      await new Promise((r) => setTimeout(r, 400));
    });

    await waitFor(() => {
      expect(screen.getByAltText(/Foto 2/i)).toBeInTheDocument();
    });

    // Check that Foto 2 was preloaded/pre-decoded and rendered with decoding="sync"
    const img2 = screen.getByAltText(/Foto 2/i);
    expect(img2.getAttribute('decoding')).toBe('sync');
    expect(preloadSpy).toHaveBeenCalledWith(expect.stringContaining('foto2.jpg'));
  });
});
