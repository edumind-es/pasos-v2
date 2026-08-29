/*
 * Autenticación Pro: registro, login por contraseña, SSO OIDC y sesión.
 */
import { API_BASE, getCsrfToken, refreshProSessionPayload, requestJson, storeAccessToken } from './http';
import type { ProAuthTokenResponse, ProUserResponse } from './types';

async function authenticate(
    path: '/auth/login' | '/auth/register',
    payload: Record<string, unknown>,
): Promise<ProAuthTokenResponse> {
    const response = await requestJson<ProAuthTokenResponse>(path, {
        method: 'POST',
        body: JSON.stringify(payload),
    }, false);
    storeAccessToken(response.access_token);
    return response;
}

export async function registerProUser(payload: {
    email: string;
    displayName?: string;
    password: string;
}): Promise<ProAuthTokenResponse> {
    return authenticate('/auth/register', {
        email: payload.email,
        display_name: payload.displayName || undefined,
        password: payload.password,
    });
}

export async function loginProUser(payload: {
    email: string;
    password: string;
}): Promise<ProAuthTokenResponse> {
    return authenticate('/auth/login', {
        email: payload.email,
        password: payload.password,
    });
}

export async function refreshProSession(): Promise<string> {
    const payload = await refreshProSessionPayload();
    return payload.access_token;
}

export async function startSsoLogin(next = '/'): Promise<void> {
    const safeNext = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/api/') ? next : '/';
    const targetUrl = `${API_BASE}/auth/oidc/start?next=${encodeURIComponent(safeNext)}`;

    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(registration => registration.unregister()));
        }
    } catch {
        // Un service worker obsoleto nunca debe bloquear la redirección SSO.
    }

    window.location.assign(targetUrl);
}

export async function completeSsoLogin(): Promise<ProAuthTokenResponse> {
    return refreshProSessionPayload();
}

export async function logoutProUser(): Promise<void> {
    const csrfToken = getCsrfToken();
    const headers = new Headers({
        'Content-Type': 'application/json',
    });

    if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
    }

    try {
        await requestJson<{ status: string }>('/auth/logout', {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
        }, false);
    } finally {
        storeAccessToken(null);
    }
}

export async function getCurrentProUser(): Promise<ProUserResponse> {
    return requestJson<ProUserResponse>('/auth/me');
}
