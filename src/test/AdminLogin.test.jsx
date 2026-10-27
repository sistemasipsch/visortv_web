import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminLogin from '../pages/AdminLogin';
import { authService } from '../services/api';

// Mock useAuth
const mockLogin = vi.fn();
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isAuthenticated: false,
  }),
}));

describe('AdminLogin Component and Password Recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AdminLogin />
      </BrowserRouter>
    );
  };

  it('renders login form and has "¿Olvidaste tu contraseña?" link', () => {
    renderComponent();
    expect(screen.getByText('Panel de Administración')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/usuario o usuario@ejemplo\.com/i)).toBeInTheDocument();
    expect(screen.getByText(/¿Olvidaste tu contraseña\?/i)).toBeInTheDocument();
  });

  it('opens recovery modal when "¿Olvidaste tu contraseña?" is clicked', () => {
    renderComponent();
    const forgotBtn = screen.getByText(/¿Olvidaste tu contraseña\?/i);
    fireEvent.click(forgotBtn);

    expect(screen.getByRole('heading', { name: 'Recuperar Contraseña' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ej: admin o usuario@correo\.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar/i })).toBeInTheDocument();
  });

  it('progresses from Step 1 to Step 2 upon requesting code successfully', async () => {
    vi.spyOn(authService, 'forgotPassword').mockResolvedValue({
      data: {
        success: true,
        message: 'Código enviado',
        username: 'admin',
        email_hint: 'a***n@visortv.com',
        dev_code: '654321',
      },
    });

    renderComponent();
    fireEvent.click(screen.getByText(/¿Olvidaste tu contraseña\?/i));

    const input = screen.getByPlaceholderText(/Ej: admin o usuario@correo\.com/i);
    fireEvent.change(input, { target: { value: 'admin' } });

    const submitBtn = screen.getByRole('button', { name: /Continuar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nueva Contraseña' })).toBeInTheDocument();
      expect(screen.getByText(/Restableciendo usuario: @admin/i)).toBeInTheDocument();
      expect(screen.getByText(/nexacoreipsch@gmail\.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toBeInTheDocument();
    });
  });

  it('completes reset password flow and shows success notification on login', async () => {
    vi.spyOn(authService, 'forgotPassword').mockResolvedValue({
      data: {
        success: true,
        message: 'Código enviado',
        username: 'admin',
        email_hint: 'a***n@visortv.com',
        dev_code: '654321',
      },
    });

    vi.spyOn(authService, 'resetPassword').mockResolvedValue({
      data: {
        success: true,
        message: 'Contraseña restablecida exitosamente.',
      },
    });

    renderComponent();
    fireEvent.click(screen.getByText(/¿Olvidaste tu contraseña\?/i));

    const input = screen.getByPlaceholderText(/Ej: admin o usuario@correo\.com/i);
    fireEvent.change(input, { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
    });

    // Fill Step 2
    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '654321' } });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByPlaceholderText('Repita la nueva contraseña'), { target: { value: 'newpassword123' } });

    const saveBtn = screen.getByRole('button', { name: /Guardar Nueva Contraseña/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(authService.resetPassword).toHaveBeenCalledWith({
        username: 'admin',
        code: '654321',
        new_password: 'newpassword123',
        new_password_confirmation: 'newpassword123',
      });
      // Modal should close and success banner appears on login
      expect(screen.getByText('Contraseña restablecida exitosamente.')).toBeInTheDocument();
    });
  });
});
