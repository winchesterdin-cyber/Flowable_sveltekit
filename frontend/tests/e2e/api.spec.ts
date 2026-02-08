import { test, expect } from './fixtures';
import { login } from './support/auth';

test('should fetch tasks from the backend after logging in', async ({ page, log }) => {
  await test.step('Login', async () => {
    await login(page, log);
  });

  await test.step('Wait for tasks API', async () => {
    await page.getByRole('link', { name: 'Tasks' }).click();
    await page.waitForURL('/tasks');
    const response = await page.waitForResponse('**/api/tasks', { timeout: 15000 });
    log.info('Tasks response status: %s', response.status());
    if (response.status() !== 200) {
      const bodyText = await response.text();
      log.error('Tasks response body: %s', bodyText);
    }
    expect(response.status()).toBe(200);
  });
});
