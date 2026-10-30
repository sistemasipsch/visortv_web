import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './AdminModule';
import { AuthProvider } from '../context/AuthContext';
import AdminModule from './AdminModule';

export default function AdminApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminModule />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
