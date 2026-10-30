import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AdminApp from './admin/AdminApp';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <AdminApp />
    </StrictMode>
  );
}
