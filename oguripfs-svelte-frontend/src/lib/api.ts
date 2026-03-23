import axios from 'axios';
import { get } from 'svelte/store';
import { token } from './stores.js';

const BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:3000' 
  : 'https://upload.hachikuji.com';

const api = axios.create({ baseURL: BASE_URL });

// Agregar token automáticamente a cada request
api.interceptors.request.use((config) => {
  const t = get(token);
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const authApi = {
  register: (username: string, email: string, password: string) =>
    api.post('/api/auth/register', { username, email, password }),

  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
};

export const filesApi = {
  getFiles: () => api.get('/api/file/files'),
  
  getStatus: (cid: string) => api.get(`/api/file/file/${cid}/status`),
  
  deleteFile: (cid: string) => api.delete(`/api/file/file/${cid}`),

  iniciarSubida: (fileName: string, contentType: string, fileSize: number) =>
    api.post('/api/file/iniciar-subida', { fileName, contentType, fileSize }),

  firmarPartes: (keyR2: string, uploadId: string, partNumbers: number[]) =>
    api.post('/api/file/firmar-partes', { keyR2, uploadId, partNumbers }),

  completarSubida: (keyR2: string, uploadId: string, parts: { PartNumber: number, ETag: string }[]) =>
    api.post('/api/file/completar-subida', { keyR2, uploadId, parts }),

  getPublicStatus: (cid: string) => api.get(`/api/file/file/${cid}/status`),
  getPublicFile: (cid: string) => api.get(`/api/file/public/${cid}`),
getAdminStats: () => api.get('/api/file/admin/stats'),
};

export default api;