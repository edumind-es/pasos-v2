import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
// La PWA instalada corre sobre el build de produccion (con service worker),
// no sobre el servidor de desarrollo: se prueba en su propio puerto.
const PREVIEW_PORT = 4174;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;
export const previewBaseURL = `http://127.0.0.1:${PREVIEW_PORT}`;

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : [
        {
            command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
            url: baseURL,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
        },
        {
            // Compila y sirve el build real: es el unico modo de comprobar que
            // el service worker se registra y que la PWA instalada sigue viva.
            command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PREVIEW_PORT}`,
            url: previewBaseURL,
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
        },
    ],
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
