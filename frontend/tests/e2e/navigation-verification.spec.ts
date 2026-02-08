import { test, expect } from './fixtures';
import { login } from './support/auth';
import { getNavigationEntries } from './support/navigation';

test.describe('Navigation', () => {
  test('verifies all menu items point to the right pages', async ({ page, log }) => {
    await test.step('Login', async () => {
      await login(page, log);
    });

    const navigationSchema = getNavigationEntries();
    await expect(page.locator('nav')).toBeVisible();

    for (const item of navigationSchema) {
      await test.step(`Navigate to ${item.title}`, async () => {
        await page.getByRole('link', { name: item.title }).click();
        await expect.soft(page).toHaveURL(item.href);
      });
    }
  });
});
