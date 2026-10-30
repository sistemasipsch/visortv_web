import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('App Routing & Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders Kiosk at /', async () => {
    window.history.pushState({}, 'Test', '/');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /panel admin/i })).toBeInTheDocument();
    });
  });

  it('redirects /login to /admin/login and renders login page', async () => {
    window.history.pushState({}, 'Test', '/login');
    render(<App />);
    await waitFor(() => {
      expect(window.location.pathname).toBe('/admin/login');
      expect(screen.getByRole('button', { name: /ingresar al sistema/i })).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated /admin to /admin/login without looping', async () => {
    window.history.pushState({}, 'Test', '/admin');
    render(<App />);
    await waitFor(() => {
      expect(window.location.pathname).toBe('/admin/login');
      expect(screen.getByRole('button', { name: /ingresar al sistema/i })).toBeInTheDocument();
    });
  });

  it('renders AdminLogin directly at /admin/login', async () => {
    window.history.pushState({}, 'Test', '/admin/login');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ingresar al sistema/i })).toBeInTheDocument();
    });
  });
});
