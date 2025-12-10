const sanitizeBase = (value: string) => value.replace(/\/$/, '');

const runtimeBase = import.meta.env.VITE_API_URL
  ? sanitizeBase(import.meta.env.VITE_API_URL)
  : (import.meta.env.DEV ? 'http://localhost:8000' : '');

export const API_BASE_URL = runtimeBase;

const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

export const buildBackendUrl = (path: string) => {
  const normalizedPath = normalizePath(path);
  const candidate = `${API_BASE_URL}${normalizedPath}`;
  return candidate || normalizedPath;
};
