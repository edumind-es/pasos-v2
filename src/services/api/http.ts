/*
 * Transporte HTTP de la API Pro: token de acceso, CSRF, refresco de sesión
 * y helpers de petición compartidos por todos los módulos de dominio.
 */
import type { ProAuthTokenResponse } from './types';

export const API_BASE = (import.meta.env.VITE_PASOS_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api/v1';
const ACCESS_TOKEN_KEY = 'pasos-pro-access-token';
const CSRF_COOKIE_NAME = 'pasos_csrf';

interface ErrorEnvelope {
    error?: {
        code?: string;
        message?: string;
    };
}

export class PasosApiError extends Error {
    status: number;
    code: string;

    constructor(message: string, status: number, code = 'api_error') {
        super(message);
        this.name = 'PasosApiError';
        this.status = status;
        this.code = code;
    }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof PasosApiError) {
        return error.message;
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
}

function getStoredAccessToken(): string | null {
    try {
        return sessionStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
        return null;
    }
}

export function storeAccessToken(accessToken: string | null): void {
    try {
        if (accessToken) {
            sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        } else {
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        }
    } catch {
        // Ignora fallos de almacenamiento en entornos restringidos.
    }
}

export function getCsrfToken(): string | null {
    return getCookie(CSRF_COOKIE_NAME);
}

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const cookie of cookies) {
        const [cookieName, ...valueParts] = cookie.split('=');
        if (cookieName === name) {
            return decodeURIComponent(valueParts.join('='));
        }
    }
    return null;
}

async function toApiError(response: Response): Promise<PasosApiError> {
    let message = `La API devolvio ${response.status}`;
    let code = 'api_error';

    try {
        const payload = await response.json() as ErrorEnvelope;
        if (payload.error?.message) {
            message = payload.error.message;
        }
        if (payload.error?.code) {
            code = payload.error.code;
        }
    } catch {
        if (response.statusText) {
            message = response.statusText;
        }
    }

    return new PasosApiError(message, response.status, code);
}

let refreshPromise: Promise<ProAuthTokenResponse> | null = null;

/** Refresca la sesión Pro con la cookie httpOnly; deduplicada entre llamadas concurrentes. */
export async function refreshProSessionPayload(): Promise<ProAuthTokenResponse> {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const csrfToken = getCsrfToken();
            const headers = new Headers({
                'Content-Type': 'application/json',
            });

            if (csrfToken) {
                headers.set('X-CSRF-Token', csrfToken);
            }

            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers,
                body: JSON.stringify({}),
                credentials: 'include',
            });

            if (!response.ok) {
                throw await toApiError(response);
            }

            const payload = await response.json() as ProAuthTokenResponse;
            storeAccessToken(payload.access_token);
            return payload;
        })().finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
}

export async function requestJson<T>(
    path: string,
    init: RequestInit = {},
    retryOnUnauthorized = true,
): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const accessToken = getStoredAccessToken();
    if (accessToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        credentials: 'include',
    });

    if (response.status === 401 && retryOnUnauthorized) {
        try {
            await refreshProSessionPayload();
            return requestJson<T>(path, init, false);
        } catch {
            storeAccessToken(null);
        }
    }

    if (!response.ok) {
        throw await toApiError(response);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

export async function requestText(
    path: string,
    init: RequestInit = {},
    retryOnUnauthorized = true,
): Promise<string> {
    const headers = new Headers(init.headers);
    const accessToken = getStoredAccessToken();
    if (accessToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        credentials: 'include',
    });

    if (response.status === 401 && retryOnUnauthorized) {
        try {
            await refreshProSessionPayload();
            return requestText(path, init, false);
        } catch {
            storeAccessToken(null);
        }
    }

    if (!response.ok) {
        throw await toApiError(response);
    }

    return response.text();
}
