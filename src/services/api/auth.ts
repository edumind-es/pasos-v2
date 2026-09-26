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

// --- Entrar con el móvil ---------------------------------------------------
// El ordenador del aula enseña un QR y el docente lo aprueba en su móvil. El
// backend guarda el código de Authentik; aquí solo llega el enlace del QR.
// Al aprobar, el backend deja las cookies de sesión y se termina como el SSO.

export type EntradaMovil = { enlace: string; codigo: string; caduca_en: number };
export type EstadoEntradaMovil = 'pendiente' | 'aprobada' | 'rechazada' | 'caducada';

export async function iniciarEntradaMovil(): Promise<EntradaMovil> {
    return requestJson<EntradaMovil>('/auth/movil/iniciar', { method: 'POST' }, false);
}

export async function consultarEntradaMovil(): Promise<EstadoEntradaMovil> {
    const { estado } = await requestJson<{ estado: EstadoEntradaMovil }>(
        '/auth/movil/estado',
        { method: 'POST' },
        false,
    );
    return estado;
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
