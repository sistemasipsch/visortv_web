import axios from 'axios';

// -------------------------------------------------------------
// 1. AXIOS CLIENT SETUP
// -------------------------------------------------------------
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return '/api';
};

export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  if (apiBase) {
    const origin = apiBase.replace(/\/api\/?$/, '');
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 60000,
});

// Attach Bearer token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('visor_tv_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Clean up stale token on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem('visor_tv_token');
      localStorage.removeItem('visor_tv_user');
    }
    return Promise.reject(error);
  }
);

// -------------------------------------------------------------
// 2. AUTH SERVICE
// -------------------------------------------------------------
export const authService = {
  login: async (username, password) => {
    return await api.post('/auth/login', { username, password });
  },

  getMe: async () => {
    return await api.get('/auth/me');
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('visor_tv_token');
      localStorage.removeItem('visor_tv_user');
    }
  },

  changePassword: async (current_password, new_password) => {
    return await api.post('/auth/change-password', { current_password, new_password });
  },

  updateProfile: async (data) => {
    return await api.post('/auth/update-profile', data);
  },

  updateAvatar: async (formData) => {
    return await api.post('/auth/update-avatar', formData);
  }
};

// -------------------------------------------------------------
// 3. USER MANAGEMENT SERVICE (New)
// -------------------------------------------------------------
export const userService = {
  getAll: async (search = '') => {
    return await api.get('/users', {
      params: search ? { search } : {}
    });
  },

  getById: async (id) => {
    return await api.get(`/users/${id}`);
  },

  create: async (data) => {
    return await api.post('/users', data);
  },

  update: async (id, data) => {
    return await api.put(`/users/${id}`, data);
  },

  uploadAvatar: async (id, formData) => {
    return await api.post(`/users/${id}/avatar`, formData);
  },

  delete: async (id) => {
    return await api.delete(`/users/${id}`);
  },

  toggleStatus: async (id) => {
    return await api.post(`/users/${id}/toggle-status`);
  }
};

// -------------------------------------------------------------
// 4. AUDIT & ACTIVITY LOGS SERVICE (New)
// -------------------------------------------------------------
export const auditService = {
  getLogs: async (params = {}) => {
    return await api.get('/audit-logs', { params });
  }
};

// -------------------------------------------------------------
// 5. SEDES SERVICE
// -------------------------------------------------------------
export const sedesService = {
  getAll: async (publicOnly = false) => {
    return await api.get('/sedes', {
      params: publicOnly ? { public: 1 } : {}
    });
  },

  getById: async (id) => {
    return await api.get(`/sedes/${id}`);
  },

  getBySlug: async (slug) => {
    return await api.get(`/sedes/${slug}`);
  },

  create: async (data) => {
    return await api.post('/sedes', data);
  },

  update: async (id, data) => {
    return await api.put(`/sedes/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/sedes/${id}`);
  },

  reorder: async (orders) => {
    return await api.post('/sedes/reorder', { orders });
  }
};

// -------------------------------------------------------------
// 6. MEDIA SERVICE
// -------------------------------------------------------------
export const mediaService = {
  getBySede: async (sedeId, activeOnly = false) => {
    return await api.get('/media', {
      params: {
        sede_id: sedeId,
        active_only: activeOnly ? 1 : 0
      }
    });
  },

  getById: async (id) => {
    return await api.get(`/media/${id}`);
  },

  addUrl: async (data) => {
    return await api.post('/media/add-url', data);
  },

  upload: (sedeId, formData, onUploadProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${getBaseUrl()}/media?sede_id=${encodeURIComponent(sedeId)}`;
      xhr.open('POST', url);

      const token = localStorage.getItem('visor_tv_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

      if (xhr.upload && onUploadProgress) {
        xhr.upload.onprogress = onUploadProgress;
      }

      xhr.onload = () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ data: response, status: xhr.status });
          } else {
            const err = new Error(response.error || response.message || `Error ${xhr.status} al subir archivo`);
            err.response = { data: response, status: xhr.status };
            reject(err);
          }
        } catch {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ data: { success: true, message: xhr.responseText }, status: xhr.status });
          } else {
            const err = new Error(`Error en el servidor (${xhr.status})`);
            err.response = { status: xhr.status, data: { error: xhr.responseText } };
            reject(err);
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Error de conexión al subir el archivo multimedia'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Tiempo de espera agotado al subir el video o archivo'));
      };

      // 30 minutes timeout for heavy video uploads
      xhr.timeout = 1800000;

      xhr.send(formData);
    });
  },

  update: async (id, data) => {
    return await api.put(`/media/${id}`, data);
  },

  delete: async (id) => {
    try {
      return await api.delete(`/media/${id}`);
    } catch (err) {
      if (err.response?.status === 405 || err.response?.status === 404 || !err.response) {
        return await api.post(`/media/${id}/delete`);
      }
      throw err;
    }
  },

  bulkDelete: async (ids) => {
    return await api.post('/media/bulk-delete', { ids });
  },

  reorder: async (orders) => {
    return await api.post('/media/reorder', { orders });
  }
};

// -------------------------------------------------------------
// 7. PLAYLIST / TV VISOR SERVICE (High-Speed Hot Sync)
// -------------------------------------------------------------
export const playlistService = {
  getPlaylist: async (sedeIdOrSlug) => {
    const isId = typeof sedeIdOrSlug === 'number' || /^\d+$/.test(sedeIdOrSlug);
    const params = isId ? { sede_id: sedeIdOrSlug } : { slug: sedeIdOrSlug };
    return await api.get('/playlist', { params });
  },

  checkVersion: async (sedeIdOrSlug) => {
    const isId = typeof sedeIdOrSlug === 'number' || /^\d+$/.test(sedeIdOrSlug);
    const params = isId
      ? { sede_id: sedeIdOrSlug, check_version: 1 }
      : { slug: sedeIdOrSlug, check_version: 1 };
    return await api.get('/playlist', { params });
  }
};

// -------------------------------------------------------------
// 8. STATS SERVICE
// -------------------------------------------------------------
export const statsService = {
  getStats: async () => {
    return await api.get('/stats');
  }
};

// -------------------------------------------------------------
// 9. SETTINGS SERVICE
// -------------------------------------------------------------
export const settingsService = {
  getSettings: async () => {
    return await api.get('/settings');
  },

  updateSettings: async (data) => {
    return await api.post('/settings', data);
  }
};

export default api;
