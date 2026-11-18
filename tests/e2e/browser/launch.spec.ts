import { test, expect } from '@playwright/test';

test('native Slot launch loads without browser exceptions', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto(process.env.CONTINUITY_E2E_URL ?? 'http://127.0.0.1:3917/');
  await page.waitForLoadState('networkidle');
  expect(response?.status()).toBe(200);
  expect(errors).toEqual([]);
  await expect(page.getByRole('button', { name: '聊天迁移与角色记忆' })).toBeVisible();
});
