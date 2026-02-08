import type { Page, TestInfo } from '@playwright/test';

type ScreenshotOptions = {
  fullPage?: boolean;
  contentType?: string;
};

export const captureScreenshot = async (
  page: Page,
  testInfo: TestInfo,
  name: string,
  options: ScreenshotOptions = {}
) => {
  if (page.isClosed()) {
    return;
  }
  const screenshotPath = testInfo.outputPath('screenshots', name);
  await page.screenshot({ path: screenshotPath, fullPage: options.fullPage ?? true });
  await testInfo.attach(name, {
    path: screenshotPath,
    contentType: options.contentType ?? 'image/png'
  });
};
