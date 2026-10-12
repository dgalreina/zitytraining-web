import { test, expect } from '@playwright/test';

// Camino crítico del calendario: la parte más frágil del front (arrastre,
// recurrencia, cola offline...). Este test no cubre todo eso, pero sí el
// esqueleto que cualquier refactor del calendario podría romper sin
// querer: entrar, abrir el modal, moverse entre sus vistas, guardar de
// verdad, y borrar lo creado para no dejar basura en la base de datos de
// desarrollo.
//
// Hace falta el servidor de desarrollo ya corriendo y credenciales de un
// usuario de prueba real (admin o entrenador):
//   E2E_EMAIL=tu@test.com E2E_PASSWORD=xxxx npx playwright test

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.skip(!EMAIL || !PASSWORD, 'Faltan E2E_EMAIL/E2E_PASSWORD (ver cabecera de este archivo)');

test('crear, revisar vistas y borrar una sesión, sin errores de consola', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  // El único confirm() de la app es "borrar sesión": lo aceptamos para
  // poder limpiar el dato de prueba al final.
  page.on('dialog', (dialog) => dialog.accept());

  await test.step('login', async () => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(EMAIL!);
    await page.locator('input[type="password"]').fill(PASSWORD!);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL(/\/dashboard/);
  });

  await test.step('el calendario se pinta', async () => {
    await page.goto('/dashboard/calendario');
    await expect(page.locator('.fc')).toBeVisible();
  });

  await test.step('abrir "Nueva sesión" y rellenarla', async () => {
    await page.locator('.fc-timegrid-slot-lane').nth(5).click({ force: true });
    await expect(page.getByText('Nueva sesión')).toBeVisible();
    // Marca el primer cliente de la lista: con el checklist vacío no deja guardar.
    await page.locator('label:has(input[type="checkbox"])').first().click();
  });

  await test.step('cambiar a Notas y volver', async () => {
    await page.getByRole('button', { name: 'Notas' }).click();
    await expect(page.getByPlaceholder('Escribe aquí cualquier detalle sobre la sesión...')).toBeVisible();
    await page.getByRole('button', { name: 'Notas' }).click(); // el botón "atrás" lleva el mismo texto
    await expect(page.getByText('Nueva sesión')).toBeVisible();
  });

  await test.step('cambiar a Entrenamiento y volver', async () => {
    await page.getByRole('button', { name: 'Entrenamiento' }).click();
    await expect(page.getByText('Crear entrenamiento nuevo')).toBeVisible();
    // exact: true, porque "Crear entrenamiento nuevo" también contiene
    // "Entrenamiento" y si no hay dos botones que encajan con el texto.
    await page.getByRole('button', { name: 'Entrenamiento', exact: true }).click();
    await expect(page.getByText('Nueva sesión')).toBeVisible();
  });

  await test.step('guardar de verdad', async () => {
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Nueva sesión')).not.toBeVisible({ timeout: 5000 });
  });

  await test.step('limpiar: borrar la sesión recién creada', async () => {
    await expect(page.locator('.fc-event')).toHaveCount(1, { timeout: 5000 });
    await page.locator('.fc-event').last().click({ force: true });
    await expect(page.getByText('Editar sesión')).toBeVisible();
    await page.getByTitle('Eliminar sesión').click();
    await expect(page.getByText('Editar sesión')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('.fc-event')).toHaveCount(0);
  });

  expect(consoleErrors, `Errores de consola/página:\n${consoleErrors.join('\n')}`).toEqual([]);
});
