import { expect, test, type Page } from '@playwright/test';

const DISMISS_UNTIL = String(Date.now() + 1000 * 60 * 60 * 24 * 365);

async function prepareLocalApp(page: Page) {
    await page.addInitScript((dismissedUntil) => {
        localStorage.setItem('pwa-install-dismissed', dismissedUntil);
    }, DISMISS_UNTIL);
}

async function loginExpress(page: Page) {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar sin Registro' }).click();
    await expect(page.getByRole('link', { name: 'Entrar en Pasos Aula' })).toBeVisible();
    await page.getByRole('link', { name: 'Entrar en Pasos Aula' }).click();
    await expect(page.getByRole('button', { name: 'Mis Tableros' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await prepareLocalApp(page);
});

test('flujo RC: docente puede crear tablero desde plantilla y exportar informe', async ({ page }) => {
    await loginExpress(page);

    // Plantillas vive en el menú de desbordamiento (Más opciones → Herramientas)
    await page.getByTitle('Más opciones').click();
    await page.getByRole('button', { name: 'Plantillas' }).click();
    await expect(page.getByRole('dialog', { name: 'Plantillas y reutilización' })).toBeVisible();

    const firstTemplateCard = page.locator('article').first();
    await firstTemplateCard.getByRole('button', { name: 'Crear tablero' }).click();

    await expect(page.getByRole('button', { name: 'Rutina de la mañana' })).toBeVisible();

    const reportDownload = page.waitForEvent('download');
    await page.getByTitle('Más opciones').click();
    await page.getByRole('button', { name: 'Informe pedagógico' }).click();
    const report = await reportDownload;
    expect(report.suggestedFilename()).toContain('pasos-informe');
    expect(report.suggestedFilename()).toContain('.html');
});

test('flujo RC: docente puede abrir centro de datos', async ({ page }) => {
    await loginExpress(page);

    await page.getByTitle('Cuenta de usuario').click();
    await page.getByRole('button', { name: 'Centro de datos' }).click();

    await expect(page.getByRole('dialog', { name: 'Centro de almacenamiento y observabilidad' })).toBeVisible();
    await expect(page.getByText('Pasos guarda trabajo local en')).toBeVisible();
});

test('flujo RC: alumno accede con codigo local compartido', async ({ page }) => {
    await loginExpress(page);

    await page.getByRole('button', { name: 'Compartir', exact: true }).click();
    const shareDialog = page.getByRole('heading', { name: 'Compartir Tablero' });
    await expect(shareDialog).toBeVisible();

    const codeValue = (await page.locator('text=/[A-Z]{3}-\\d{4}/').first().textContent())?.trim();
    expect(codeValue).toBeTruthy();

    const studentPage = await page.context().newPage();
    await prepareLocalApp(studentPage);
    await studentPage.goto(`/codigo?code=${codeValue}`);

    // No se le pide el nombre. Antes habia un campo "Alias del alumno/a" cuyo
    // marcador de posicion era "Ej. Marta": invitaba al alumno a escribir su
    // nombre, que acababa guardado en el servidor. Ya no existe.
    await expect(studentPage.getByLabel(/alias/i)).toHaveCount(0);
    await expect(studentPage.locator('main')).not.toContainText('Marta');

    await studentPage.getByRole('button', { name: 'Acceder' }).click();

    await expect(studentPage).toHaveURL(new RegExp(`/compartir/${codeValue}`));
    await expect(studentPage.getByText(`Código: ${codeValue}`)).toBeVisible();
    // El alumno ve un apodo calculado de su clave aleatoria: "Eres Lince 7".
    await expect(studentPage.getByText(/Eres/)).toBeVisible();
    await expect(studentPage.locator('main')).toContainText('Sin tareas');

    await studentPage.close();
});
