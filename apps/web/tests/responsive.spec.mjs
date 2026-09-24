import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8081';
const vendorPassword = process.env.SEED_VENDOR_PASSWORD || '';
const adminPassword = process.env.SEED_ADMIN_PASSWORD || '';
const publicRoutes = ['/', '/productos', '/tiendas', '/login', '/registro', '/offline', '/instalar'];
const viewports = [
  { width: 320, height: 740 },
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 430, height: 900 },
  { width: 768, height: 1024 },
];

async function dismissInstall(page) {
  await page.addInitScript(() => sessionStorage.setItem('sv-install-dismissed', '1'));
}

async function assertNoPageOverflow(page, label: string) {
  const result = await page.evaluate(() => ({
    width: window.innerWidth,
    rootWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
  }));
  expect(result.rootWidth, label + ' overflowed viewport').toBeLessThanOrEqual(result.width + 1);
}

for (const viewport of viewports) {
  test('public content stays visible at ' + viewport.width + 'px', async ({ browser }) => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await dismissInstall(page);
    for (const route of publicRoutes) {
      await page.goto(baseURL + route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(250);
      await assertNoPageOverflow(page, route + ' @ ' + viewport.width);
    }
    await context.close();
  });
}

test('mobile header menu stays inside 320px viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 740 } });
  const page = await context.newPage();
  await dismissInstall(page);
  await page.goto(baseURL + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(page.getByRole('link', { name: 'Productos' })).toBeVisible();
  await expect(page.getByText('Instalar app').last()).toBeVisible();
  await assertNoPageOverflow(page, 'mobile menu');
  await context.close();
});

test('PWA install help is always reachable and fits the viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 740 } });
  const page = await context.newPage();
  await page.goto(baseURL + '/instalar', { waitUntil: 'domcontentloaded' });
  await page.locator('main').getByRole('button', { name: 'Instalar SeVende' }).click();
  const dialog = page.getByRole('dialog', { name: 'Instalar SeVende' });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('PWA dialog has no bounding box');
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(740);
  await assertNoPageOverflow(page, 'PWA dialog');
  await context.close();
});

async function login(page, email: string, password: string, next: string) {
  await page.goto(baseURL + '/login?next=' + encodeURIComponent(next), { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((url) => url.pathname === next, { timeout: 15_000 });
  await page.waitForTimeout(400);
}

test('vendor dashboard content fits 320px', async ({ browser }) => {
  test.skip(!vendorPassword, 'SEED_VENDOR_PASSWORD is required');
  const context = await browser.newContext({ viewport: { width: 320, height: 740 } });
  const page = await context.newPage();
  await dismissInstall(page);
  await login(page, 'vendedor1@multiventas.local', vendorPassword, '/vendor/analitica');
  await expect(page.getByRole('heading', { name: 'Analítica' })).toBeVisible();
  await assertNoPageOverflow(page, 'vendor analytics');
  await context.close();
});

test('admin support content fits 320px', async ({ browser }) => {
  test.skip(!adminPassword, 'SEED_ADMIN_PASSWORD is required');
  const context = await browser.newContext({ viewport: { width: 320, height: 740 } });
  const page = await context.newPage();
  await dismissInstall(page);
  await login(page, 'jorgitom18@gmail.com', adminPassword, '/admin/soporte');
  await expect(page.getByRole('heading', { name: 'Soporte de pedidos' })).toBeVisible();
  await assertNoPageOverflow(page, 'admin support');
  await context.close();
});
