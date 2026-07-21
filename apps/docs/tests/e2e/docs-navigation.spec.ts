import { expect, test, type Page } from "@playwright/test";

async function expectTargetNearTop(page: Page, id: string) {
  await expect.poll(() => page.locator(`#${id}`).evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(180);
}

test("renders stable anchors on the server and preserves direct hashes across locales", async ({ page, request }) => {
  const response = await request.get("/en/docs/overview");
  const html = await response.text();

  expect(response.ok()).toBe(true);
  expect(html).toContain('id="why-does-firsttx-exist"');
  expect(html).toContain('data-doc-heading="true"');

  await page.goto("/en/docs/overview#why-does-firsttx-exist");
  await expect(page.locator("#why-does-firsttx-exist")).toHaveCount(1);
  await expectTargetNearTop(page, "why-does-firsttx-exist");

  await page.goto("/ko/docs/overview#why-does-firsttx-exist");
  await expect(page.locator("#why-does-firsttx-exist")).toHaveCount(1);
  await expectTargetNearTop(page, "why-does-firsttx-exist");
});

test("keeps interactive component headings out of the TOC and resets it on navigation", async ({ page }) => {
  await page.goto("/en/docs/overview");
  const tocLinks = page.locator(".docs-desktop-toc .docs-toc a");
  await expect(tocLinks.first()).toBeVisible();
  const initialItems = await tocLinks.allTextContents();

  await page.getByRole("button", { name: "A blank screen appears first on revisit" }).click();
  await expect(page.locator(".setup-result-title h3")).toHaveText("Prepaint");
  await expect.poll(() => tocLinks.allTextContents()).toEqual(initialItems);

  await page.locator('.docs-desktop-sidebar a[href="/en/docs/getting-started"]').click();
  await expect(page).toHaveURL(/\/en\/docs\/getting-started$/);
  await expect(tocLinks.first()).toHaveText("0. Prerequisites");
  await expect(tocLinks.filter({ hasText: "Why does FirstTx exist?" })).toHaveCount(0);
});

test("uses the same owned headings in the mobile TOC", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/docs/overview");
  await expect(page.locator(".docs-desktop-toc .docs-toc")).toHaveCount(1);
  await page.getByRole("button", { name: "On this page" }).click();
  const toc = page.locator("#mobile-page-navigation .docs-toc");

  await expect(toc).toBeVisible();
  await expect(toc.getByRole("link", { name: "Why does FirstTx exist?" })).toBeVisible();
  await expect(toc.getByRole("link", { name: "Choose a problem to solve" })).toHaveCount(0);
});

test("keeps landing compatibility aliases at the combined setup section", async ({ page }) => {
  for (const alias of ["layers", "quickstart"]) {
    await page.goto(`/en#${alias}`);
    await expect(page.locator(`#${alias}`)).toHaveAttribute("data-doc-anchor-alias", "choose-setup");
    await expectTargetNearTop(page, alias);
  }
});
