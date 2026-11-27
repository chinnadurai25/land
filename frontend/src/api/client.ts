const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let csrfTokenMemory: string | null = null;

function readCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)landnest_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCsrfToken(token: string | null) {
  csrfTokenMemory = token;
}

export async function ensureCsrfToken(): Promise<string | null> {
  const fromCookie = readCsrfCookie();
  if (fromCookie) {
    csrfTokenMemory = fromCookie;
    return fromCookie;
  }
  if (csrfTokenMemory) return csrfTokenMemory;
  try {
    const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
    if (res.ok) {
      const data = (await res.json()) as { csrfToken?: string };
      if (data.csrfToken) {
        csrfTokenMemory = data.csrfToken;
        return data.csrfToken;
      }
    }
  } catch {
    // Ignore transient bootstrap error
  }
  return null;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, string[]>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipCsrf?: boolean } = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (isMutation && !options.skipCsrf) {
    const token = readCsrfCookie() || csrfTokenMemory || (await ensureCsrfToken());
    if (token) {
      headers.set('X-CSRF-Token', token);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const errObj = payload?.error;
    throw new ApiError(
      res.status,
      errObj?.code || 'REQUEST_FAILED',
      errObj?.message || 'Unable to complete request. Please try again.',
      errObj?.details
    );
  }

  return payload as T;
}
