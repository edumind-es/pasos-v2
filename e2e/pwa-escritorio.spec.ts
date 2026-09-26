/**
 * La PWA instalada en escritorio corre sobre el build de producción, con
 * service worker y precache. Estas pruebas van contra `vite preview`, no
 * contra el servidor de desarrollo: es el único modo de comprobar que una
 * versión ya instalada sigue arrancando y recibe la actualización.
 */
import { expect, test, type Page } from '@playwright/test';
import { previewBaseURL } from '../playwright.config';

const DISMISS_UNTIL = String(Date.now() + 1000 * 60 * 60 * 24 * 365);

const PLANTILLA = `# Lun 15/09 · 10:00 · Equilibrios

## Secuencia

- [ ] **Apertura (2 min)** — semáforo emocional de entrada

### Núcleo

- [ ] Circuito de equilibrios por parejas
`;

test.use({ baseURL: previewBaseURL });

async function prepararEscritorio(page: Page) {
    await page.addInitScript((dismissedUntil) => {
        localStorage.setItem('pwa-install-dismissed', dismissedUntil);
    }, DISMISS_UNTIL);
    await page.route('**api.arasaac.org/**', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ _id: 2462 }]) }),
    );
    await page.route('**static.arasaac.org/**', route => route.abort());
}

async function entrar(page: Page) {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar sin Registro' }).click();
    await page.getByRole('link', { name: 'Entrar en Pasos Aula' }).click();
    await expect(page.getByRole('button', { name: 'Mis Tableros' })).toBeVisible();
}

test.describe('PWA de escritorio (build de producción)', () => {
    test('el service worker se registra y toma el control', async ({ page }) => {
        await prepararEscritorio(page);
        await page.goto('/');

        await expect.poll(
            () => page.evaluate(async () => {
                const registro = await navigator.serviceWorker?.getRegistration();
                return Boolean(registro?.active);
            }),
            { timeout: 30_000, message: 'el service worker de la PWA no llegó a activarse' },
        ).toBe(true);

        // Y precachea la app: sin esto, la instalada se queda en blanco sin red.
        const precache = await page.evaluate(async () => {
            const nombres = await caches.keys();
            return nombres.some(nombre => nombre.includes('precache'));
        });
        expect(precache).toBe(true);
    });

    test('una instalación existente sigue arrancando tras recargar', async ({ page }) => {
        await prepararEscritorio(page);
        await entrar(page);

        // Segunda visita: ya hay service worker y precache, como en la app instalada.
        await page.reload();
        await expect(page.getByRole('button', { name: 'Mis Tableros' })).toBeVisible();
    });

    test('el arrastre de la sesión funciona en la app instalada', async ({ page }) => {
        await prepararEscritorio(page);
        await entrar(page);

        await page.getByTitle('Más opciones').click();
        await page.getByRole('button', { name: /Asistente/i }).click();
        await page.locator('input[type="file"]').setInputFiles({
            name: 'sesion.md',
            mimeType: 'text/markdown',
            buffer: Buffer.from(PLANTILLA, 'utf-8'),
        });

        await expect(page.getByText('Sesión reconocida: Equilibrios')).toBeVisible();
        await page.getByRole('button', { name: 'Crear sesión' }).click();
        await expect(page.getByRole('button', { name: 'Editar columna Apertura' })).toBeVisible();
    });

    test('el tablero creado sobrevive a recargar la app', async ({ page }) => {
        await prepararEscritorio(page);
        await entrar(page);

        await page.getByTitle('Más opciones').click();
        await page.getByRole('button', { name: /Asistente/i }).click();
        await page.locator('input[type="file"]').setInputFiles({
            name: 'sesion.md',
            mimeType: 'text/markdown',
            buffer: Buffer.from(PLANTILLA, 'utf-8'),
        });
        await page.getByRole('button', { name: 'Crear sesión' }).click();
        await expect(page.getByRole('button', { name: 'Editar columna Apertura' })).toBeVisible();

        await page.reload();
        // El trabajo del docente es local: tiene que seguir ahí tras recargar.
        await expect(page.getByRole('button', { name: 'Editar columna Apertura' })).toBeVisible();
        await expect(page.getByText('Semáforo emocional').first()).toBeVisible();
    });
});
