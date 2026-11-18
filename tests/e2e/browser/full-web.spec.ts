import { test, expect } from '@playwright/test';
import { companionZip } from '../../fixtures/companion.ts';

/** Entire official CLI/Web profile, not the smaller Slot fixture page. */
test('installed bundle styles and upload are usable in full official mobile Web', async ({
  page,
}) => {
  const url = process.env.CONTINUITY_FULL_WEB_URL;
  if (!url) throw new Error('Provide the real isolated full official DSH Web URL');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  const preview = page.getByRole('dialog', { name: '预览版说明' });
  const onboarding = page.getByRole('dialog', { name: '开始使用' });
  const sidebar = page.getByRole('button', { name: '打开侧边栏', exact: true });
  await expect(preview.or(onboarding).or(sidebar).first()).toBeVisible();
  if (await preview.isVisible())
    await preview.getByRole('button', { name: '继续', exact: true }).click();
  if (await onboarding.isVisible())
    await onboarding.getByRole('button', { name: '关闭', exact: true }).click();
  await sidebar.click();
  const launcher = page
    .getByRole('dialog', { name: '导航', exact: true })
    .getByRole('button', { name: '聊天迁移与角色记忆' });
  await launcher.click();
  const dialog = page.getByRole('dialog', { name: '聊天迁移', exact: true });
  await expect(dialog).toBeVisible();
  const info = await page.evaluate(async () => {
    const response = await fetch('/api/dsh-continuity/info');
    return { status: response.status, body: await response.text() };
  });
  expect(info.status, info.body).toBe(200);
  await expect
    .poll(
      async () => {
        const observed = await page.evaluate(async () =>
          (await fetch('/api/dsh-continuity/info')).json(),
        );
        return observed.value.workspaces.length;
      },
      {
        timeout: 15000,
        message: 'Official Workspace registry must finish first-use initialization',
      },
    )
    .toBeGreaterThan(0);
  const geometry = await dialog.boundingBox();
  expect(geometry?.width).toBe(page.viewportSize()?.width);
  expect(
    await page
      .locator('.continuity-panel')
      .evaluate((element) => getComputedStyle(element).padding),
  ).toBe('14px');
  await page.getByLabel('角色名称', { exact: true }).fill('lin');
  await page.getByLabel('故事名称', { exact: true }).fill('harbor');
  await page
    .getByLabel('选择聊天文件', { exact: true })
    .setInputFiles({
      name: 'deepseek_data.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from(companionZip()),
    });
  await expect(page.getByRole('heading', { name: '解析报告' })).toBeVisible();
  await page.getByRole('button', { name: '保存原始记录并迁移' }).click();
  await expect(page.getByText(/迁移完成：新增/)).toBeVisible();
  const candidates = page.locator('button:enabled').filter({ hasText: /^确认记住$/ });
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
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载完整角色备份' }).click();
  expect((await downloading).suggestedFilename()).toBe('dsh-continuity-backup.json');
  await page.screenshot({ path: 'test-results/full-official-mobile-390x844.png', fullPage: true });
  expect(errors).toEqual([]);
});
