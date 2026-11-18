import { test, expect } from '@playwright/test';
import { companionZip } from '../../fixtures/companion.ts';

const tokenUrl = process.env.CONTINUITY_E2E_URL;

test('phone workflow through real DSH Host and native Slot: ZIP → memory → new conversation → backup', async ({
  page,
}) => {
  if (!tokenUrl) throw new Error('CONTINUITY_E2E_URL must be the isolated Host authenticated URL');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(tokenUrl);
  await page.getByRole('button', { name: '聊天迁移与角色记忆' }).click();
  await expect(page.getByRole('heading', { name: '把故事带到下一次对话' })).toBeVisible();
  await page.getByLabel('角色名称', { exact: true }).fill('lin');
  await page.getByLabel('故事名称', { exact: true }).fill('harbor');
  await page.getByLabel('选择聊天文件', { exact: true }).setInputFiles({
    name: 'deepseek_data.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(companionZip()),
  });
  await expect(page.getByRole('heading', { name: '解析报告' })).toBeVisible();
  await expect(page.getByText('1 个对话 · 5 条消息 · 0 个附件引用')).toBeVisible();
  await page.getByRole('button', { name: '保存原始记录并迁移' }).click();
  await expect(page.getByText(/迁移完成：新增/)).toBeVisible();
  const candidates = page
    .locator('button')
    .filter({ hasText: /^确认记住$/ })
    .and(page.locator('button:enabled'));
  while (await candidates.count()) {
    await candidates.first().click();
    await expect(page.getByText('确认记忆', { exact: true })).toHaveCount(0);
  }
  await page.getByLabel('模型服务', { exact: true }).fill('fixture');
  await page.getByLabel('模型', { exact: true }).fill('fixture');
  await page.getByRole('button', { name: '新建对话并恢复记忆' }).click();
  await expect(page.getByText('新对话已恢复已确认记忆。')).toBeVisible();
  await page.getByLabel('对角色说', { exact: true }).fill('继续寻找船长');
  await page.getByRole('button', { name: '继续对话', exact: true }).click();
  await expect(page.getByText('小禾，我记得灯塔和我们的约定。', { exact: true })).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载完整角色备份' }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe('dsh-continuity-backup.json');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/mobile-390x844.png', fullPage: true });
});

test('phone text fallback and errors leave roles and dates honest', async ({ page }) => {
  if (!tokenUrl) throw new Error('CONTINUITY_E2E_URL is required');
  await page.goto(tokenUrl);
  await page.getByRole('button', { name: '聊天迁移与角色记忆' }).click();
  await page
    .getByLabel('选择聊天文件')
    .setInputFiles({ name: 'bad.zip', mimeType: 'application/zip', buffer: Buffer.from('notzip') });
  await expect(page.getByRole('alert')).toContainText('ZIP');
  await page.getByText('应急方式：粘贴单个对话').click();
  await page.getByLabel('复制的对话').fill('用户：请叫我小雨\n助手：好的，小雨');
  await page.getByRole('button', { name: '解析粘贴内容' }).click();
  await expect(page.getByRole('heading', { name: '解析报告' })).toBeVisible();
  await page.getByRole('button', { name: '清除暂存文件' }).click();
  await expect(page.getByRole('heading', { name: '解析报告' })).toHaveCount(0);
});
