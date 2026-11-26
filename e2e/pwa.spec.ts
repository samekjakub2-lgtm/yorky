import { expect, test } from '@playwright/test';

test.describe('bez prihlásenia', () => {
  test('chránená stránka presmeruje na prihlásenie', async ({ page }) => {
    await page.goto('/discover');
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('konverzácia bez prihlásenia presmeruje na prihlásenie', async ({ page }) => {
    await page.goto('/chat/00000000-0000-0000-0000-000000000000');
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('predvolený jazyk je slovenčina', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator('html')).toHaveAttribute('lang', 'sk');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vitaj v Yorky');
  });

  test('čeština podľa Accept-Language', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'cs-CZ' });
    const page = await context.newPage();
    await page.goto('/sign-in');
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vítej v Yorky');
    await context.close();
  });

  test('cookie s jazykom má prednosť', async ({ context, page }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'cs', url: 'http://127.0.0.1:3100' }]);
    await page.goto('/sign-in');
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
  });
});

test.describe('mobile-first', () => {
  test('na šírke 360 px nič nepreteká a tlačidlá majú min. 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/sign-in');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    for (const button of await page.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('PWA', () => {
  test('manifest je platný a lokalizovaný', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest', {
      headers: { 'Accept-Language': 'cs' },
    });
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('cs');
    expect(manifest.description).toContain('Seznamka');
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
  });

  test('service worker necachuje stránky ani dáta', async ({ request }) => {
    const response = await request.get('/serwist/sw.js');
    expect(response.ok()).toBe(true);
    const source = await response.text();
    // Precache obsahuje iba statické súbory buildu a ikony.
    const urls = [...source.matchAll(/\burl"?:\s*"([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url, url).toMatch(/^\/(_next\/static\/|icons\/)/);
    }
  });

  test('bezpečnostné hlavičky', async ({ request }) => {
    const response = await request.get('/sign-in');
    const headers = response.headers();
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['permissions-policy']).toContain('geolocation=(self)');
    expect(headers['x-powered-by']).toBeUndefined();
  });
});
