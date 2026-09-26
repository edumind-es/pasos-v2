/**
 * Entrar con el móvil: que el QR aparezca sin teclear nada, que al aprobar
 * desde el móvil se termine sola, y que un QR caducado o el límite de
 * Authentik se expliquen en pantalla en vez de quedarse colgados.
 */
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async () => 'data:image/png;base64,QR') } }));

const { EntrarConMovilDialog } = await import('./EntrarConMovil');

let estados: string[] = [];
let respuestaIniciar: () => Response;

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    estados = [];
    respuestaIniciar = () => json({ enlace: 'https://auth.test/device?code=123456789', codigo: '123456789', caduca_en: 300 });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (String(url).endsWith('/auth/movil/iniciar')) return respuestaIniciar();
        return json({ estado: estados.shift() ?? 'pendiente' });
    }));
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('EntrarConMovilDialog', () => {
    it('enseña el QR al abrir y avisa cuando el móvil aprueba', async () => {
        estados = ['pendiente', 'aprobada'];
        const onAprobada = vi.fn();
        render(<EntrarConMovilDialog onClose={() => {}} onAprobada={onAprobada} />);
        expect(await screen.findByAltText(/código qr/i)).toBeTruthy();
        expect(screen.getByText(/123456789/)).toBeTruthy();

        await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
        expect(onAprobada).not.toHaveBeenCalled();
        await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
        expect(onAprobada).toHaveBeenCalledTimes(1);
    });

    it('si caduca lo dice y deja generar otro', async () => {
        estados = ['caducada'];
        render(<EntrarConMovilDialog onClose={() => {}} onAprobada={() => {}} />);
        await screen.findByAltText(/código qr/i);
        await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
        expect(screen.getByRole('alert').textContent).toMatch(/caducado/i);
        expect(screen.getByRole('button', { name: /generar otro qr/i })).toBeTruthy();
    });

    it('explica el límite de QR por hora', async () => {
        respuestaIniciar = () => json({ detail: { code: 'rate_limited', message: 'Too many requests' } }, 429);
        render(<EntrarConMovilDialog onClose={() => {}} onAprobada={() => {}} />);
        expect((await screen.findByRole('alert')).textContent).toMatch(/demasiados qr/i);
    });
});
