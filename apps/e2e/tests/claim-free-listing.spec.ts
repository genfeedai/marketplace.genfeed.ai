import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const TITLE = 'E2E Free Workflow';

test('a visitor browses, claims a free workflow and finds it in the library', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('main')
    .getByRole('link', { name: /Workflows/ })
    .click();
  await page.getByRole('link', { name: new RegExp(TITLE) }).click();

  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  await expect(page.getByText('Free', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Add to library' }).click();
  await page.getByRole('link', { name: 'Open your library' }).click();

  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  await expect(page.getByText('completed')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download JSON' }).click(),
  ]);
  const payload = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(payload).toEqual({ workflow: { nodes: ['e2e-download-payload'] } });
});
