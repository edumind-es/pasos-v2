import { expect, test, type Page } from '@playwright/test';

const DISMISS_UNTIL = String(Date.now() + 1000 * 60 * 60 * 24 * 365);

const PLANTILLA = `# Lun 15/09 · 10:00 · Equilibrios y giros

## Secuencia

- [ ] **Apertura (1-2 min)** — semáforo emocional: cada alumno/a coloca su marcador
- [ ] **Anticipación visible** — verbalizar la secuencia de hoy

### Núcleo

- [ ] Calentamiento con desplazamientos (5 min)
- [ ] Circuito de equilibrios por parejas

- [ ] **Cierre (1-2 min)** — semáforo emocional de cierre
- [ ] Anticipar qué toca después

## Accesibilidad

- [ ] Cuerpo 14-16 pt, alto contraste

## Notas

Criterio EF 3.2 · se califica
`;

async function prepareLocalApp(page: Page) {
    await page.addInitScript((dismissedUntil) => {
        localStorage.setItem('pwa-install-dismissed', dismissedUntil);
    }, DISMISS_UNTIL);

    // ARASAAC interceptado: la prueba no debe depender de la red ni de terceros.
    await page.route('**api.arasaac.org/**', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ _id: 2462 }]) }),
    );
    await page.route('**static.arasaac.org/**', route => route.abort());
}

async function loginExpress(page: Page) {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar sin Registro' }).click();
    await page.getByRole('link', { name: 'Entrar en Pasos Aula' }).click();
    await expect(page.getByRole('button', { name: 'Mis Tableros' })).toBeVisible();
}

/** Simula soltar un archivo: Playwright no arrastra desde el escritorio. */
async function soltarArchivo(page: Page, selector: string, nombre: string, contenido: string) {
    const dataTransfer = await page.evaluateHandle(
        ([name, text]) => {
            const dt = new DataTransfer();
            dt.items.add(new File([text], name, { type: 'text/markdown' }));
            return dt;
        },
        [nombre, contenido],
    );
    await page.dispatchEvent(selector, 'dragenter', { dataTransfer });
    await page.dispatchEvent(selector, 'dragover', { dataTransfer });
    await page.dispatchEvent(selector, 'drop', { dataTransfer });
}

test.beforeEach(async ({ page }) => {
    await prepareLocalApp(page);
});

test('arrastrar la sesión sobre el tablero crea las columnas por fases', async ({ page }) => {
    await loginExpress(page);

    await soltarArchivo(page, 'main', 'sesion-lunes.md', PLANTILLA);

    // El asistente se abre ya con la sesión reconocida.
    await expect(page.getByText('Sesión reconocida: Equilibrios y giros')).toBeVisible();
    await expect(page.getByText('Archivo cargado: sesion-lunes.md')).toBeVisible();
    await expect(page.getByText('6 pasos de sesión detectados')).toBeVisible();

    await page.getByRole('button', { name: 'Crear sesión' }).click();

    for (const columna of ['Apertura', 'Núcleo', 'Cierre', 'Recordatorios']) {
        // El encabezado de columna es un botón con contador («Apertura(2)»).
        await expect(page.getByRole('button', { name: `Editar columna ${columna}` })).toBeVisible();
    }
    // La etiqueta corta va en la tarjeta; la explicación larga, dentro.
    await expect(page.getByText('Semáforo emocional').first()).toBeVisible();
    await expect(page.getByText('Notas de la sesión').first()).toBeVisible();
});

test('elegir el archivo en el asistente permite la disposición kanban', async ({ page }) => {
    await loginExpress(page);

    await page.getByTitle('Más opciones').click();
    await page.getByRole('button', { name: /Asistente/i }).click();

    await page.locator('input[type="file"]').setInputFiles({
        name: 'sesion-lunes.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from(PLANTILLA, 'utf-8'),
    });

    await expect(page.getByText('Sesión reconocida: Equilibrios y giros')).toBeVisible();
    await page.getByText('Kanban de ejecución').click();
    await page.getByRole('button', { name: 'Crear sesión' }).click();

    for (const columna of ['Por hacer', 'En proceso', 'Hecho', 'Recordatorios']) {
        await expect(page.getByRole('button', { name: `Editar columna ${columna}` })).toBeVisible();
    }
});

test('un archivo no admitido avisa y no crea nada', async ({ page }) => {
    await loginExpress(page);

    await soltarArchivo(page, 'main', 'foto.png', 'no-es-texto');

    await expect(page.getByRole('alert')).toContainText('no es un archivo de texto');
    await expect(page.getByText('Sesión reconocida')).toHaveCount(0);
});
