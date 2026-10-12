import { defineConfig, devices } from '@playwright/test';

// E2E: necesita el servidor de desarrollo ya corriendo (`npm run dev`) y
// unas credenciales de prueba en E2E_EMAIL/E2E_PASSWORD. No se arranca el
// servidor desde aquí a propósito: en esta máquina varios proyectos se
// pelean por el puerto 3000, así que es más fiable usar el que ya esté
// levantado y decir la URL con E2E_BASE_URL si no es la 3000.
//
// Uso:
//   E2E_EMAIL=tu@test.com E2E_PASSWORD=xxxx npx playwright test
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
