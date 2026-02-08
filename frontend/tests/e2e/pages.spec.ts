import { test, expect } from './fixtures';
import { login } from './support/auth';

test.describe('Page smoke checks', () => {
  test('tasks page renders core heading', async ({ page, log }) => {
    await login(page, log);
    await page.getByRole('link', { name: 'Tasks' }).click();
    await page.waitForURL('/tasks');
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
  });

  test('processes page renders core heading', async ({ page, log }) => {
    await login(page, log);
    await page.getByRole('link', { name: 'Processes' }).click();
    await page.waitForURL('/processes');
    await expect(page.getByRole('heading', { name: 'Start a New Process' })).toBeVisible();
  });

  test('database page renders core heading', async ({ page, log }) => {
    await login(page, log);
    await page.getByRole('link', { name: 'Database' }).click();
    await page.waitForURL('/database');
    await expect(page.getByRole('heading', { name: 'Database Table Viewer' })).toBeVisible();
  });
});
