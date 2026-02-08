import { expect, type Page } from '@playwright/test';
import type { TestLogger } from './test-logger';

export type Credentials = {
  username: string;
  password: string;
};

const defaultCredentials: Credentials = {
  username: process.env.E2E_USERNAME ?? 'user1',
  password: process.env.E2E_PASSWORD ?? 'password'
};

export const login = async (
  page: Page,
  log: TestLogger,
  credentials: Credentials = defaultCredentials
) => {
  log.info('Navigating to login page.');
  await page.goto('/login');
  await page.getByRole('heading', { name: /sign in/i }).waitFor();
  await page.getByLabel('Username').fill(credentials.username);
  await page.getByLabel('Password').fill(credentials.password);
  log.info('Submitting login form.');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/');
  await expect(page.getByRole('button', { name: 'Logout' }).first()).toBeVisible();
  log.info('Login completed.');
};

export const logout = async (page: Page, log: TestLogger) => {
  log.info('Logging out.');
  await page.getByRole('button', { name: 'Logout' }).first().click();
  await page.waitForURL('/login');
  await page.getByRole('heading', { name: /sign in/i }).waitFor();
  await expect(page.getByRole('button', { name: 'Logout' })).toHaveCount(0);
};

export const invalidCredentials: Credentials = {
  username: 'invalid-user',
  password: 'invalid-password'
};
