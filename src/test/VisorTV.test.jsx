import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VisorTV from '../pages/VisorTV';
import { playlistService } from '../services/api';

describe('VisorTV component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.spyOn(playlistService, 'getPlaylist').mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/visor/sede-principal']}>
        <Routes>
          <Route path="/visor/:slug" element={<VisorTV />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Cargando Visor TV/i)).toBeInTheDocument();
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
});
