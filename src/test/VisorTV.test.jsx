import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
});
