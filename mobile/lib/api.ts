import { supabase } from './supabase';

const apiBase = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

if (!apiBase) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_URL. Set it in mobile/.env to point at your Next.js website (e.g. http://localhost:3000 in dev).',
  );
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  // Most calls are authenticated. Set to false for the few public ones (e.g.
  // password-reset trigger from a logged-out screen).
  auth?: boolean;
  signal?: AbortSignal;
};

/**
 * Thin wrapper around fetch() that:
 *  - prefixes every URL with the configured API base
 *  - attaches the current Supabase access token as `Authorization: Bearer …`
 *  - normalizes JSON encoding/decoding and error responses
 *
 * The Next.js API was extended (see website/src/lib/supabase/server.ts) to
 * accept the Bearer token in addition to the cookie session, so the same
 * routes power both the website and this app.
 */
export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = opts;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const url = path.startsWith('http') ? path : `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await response.text();
  // Empty bodies are valid for 204 No Content.
  const data: unknown = text ? safeParse(text) : null;

  if (!response.ok) {
    const message =
      isRecord(data) && typeof data.error === 'string'
        ? data.error
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
