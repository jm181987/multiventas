const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

export async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export type AuthTokens = { accessToken: string; refreshToken: string };

export function saveAuth(tokens: AuthTokens) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mv_access_token', tokens.accessToken);
  localStorage.setItem('mv_refresh_token', tokens.refreshToken);
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('mv_access_token');
  localStorage.removeItem('mv_refresh_token');
}

export function hasAuth() {
  return typeof window !== 'undefined' && !!localStorage.getItem('mv_access_token');
}

export async function authApi<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  if (typeof window === 'undefined') throw new Error('authApi solo puede ejecutarse en cliente');
  const token = localStorage.getItem('mv_access_token');
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401 && retry) {
    const refreshToken = localStorage.getItem('mv_refresh_token');
    if (refreshToken) {
      const refresh = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refresh.ok) {
        const payload = await refresh.json();
        saveAuth(payload);
        return authApi<T>(path, init, false);
      }
    }
    clearAuth();
  }

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
