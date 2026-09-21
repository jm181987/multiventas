const BROWSER_API_URL = '/api';
const SERVER_API_URL = (process.env.INTERNAL_API_URL ?? 'http://api:80/api').replace(/\/$/, '');

const ACCESS_TOKEN_KEY = 'mv_access_token';
const REFRESH_TOKEN_KEY = 'mv_refresh_token';
const USER_KEY = 'mv_user';
const AUTH_EVENT = 'mv-auth-change';

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string | null;
  roles: string[];
  tenantId?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user?: SessionUser;
};

let refreshPromise: Promise<AuthTokens | null> | null = null;

function apiUrl() {
  return typeof window === 'undefined' ? SERVER_API_URL : BROWSER_API_URL;
}

function isFormData(body: BodyInit | null | undefined) {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function buildHeaders(init?: RequestInit, token?: string | null) {
  const headers = new Headers(init?.headers);
  if (!isFormData(init?.body) && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  return headers;
}

function emitAuthChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EVENT));
}

export async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiUrl()}${path}`, {
    ...init,
    headers: buildHeaders(init),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function saveStoredUser(user: SessionUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function saveAuth(tokens: AuthTokens) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  if (tokens.user) saveStoredUser(tokens.user);
  emitAuthChange();
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emitAuthChange();
}

export function hasAuth() {
  if (typeof window === 'undefined') return false;
  return !!(localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY));
}

export function onAuthChange(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(AUTH_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(AUTH_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

async function refreshAuth(): Promise<AuthTokens | null> {
  if (typeof window === 'undefined') return null;
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BROWSER_API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearAuth();
        return null;
      }
      const payload = await res.json() as AuthTokens;
      saveAuth(payload);
      return payload;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function authApi<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  if (typeof window === 'undefined') throw new Error('authApi solo puede ejecutarse en cliente');

  const tokenUsed = localStorage.getItem(ACCESS_TOKEN_KEY);
  const res = await fetch(`${BROWSER_API_URL}${path}`, {
    ...init,
    headers: buildHeaders(init, tokenUsed),
  });

  if (res.status === 401 && retry) {
    const currentAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (currentAccess && currentAccess !== tokenUsed) return authApi<T>(path, init, false);

    const refreshed = await refreshAuth();
    if (refreshed) return authApi<T>(path, init, false);
  }

  if (!res.ok) {
    const body = await res.text();
    let message = body || `Error HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed.message)) message = parsed.message.join(', ');
      else if (parsed.message) message = parsed.message;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export async function logoutAuth() {
  if (typeof window === 'undefined') return;
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (refreshToken) {
    try {
      await fetch(`${BROWSER_API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {}
  }
  clearAuth();
}
