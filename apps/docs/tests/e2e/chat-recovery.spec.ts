import { expect, test, type Page } from "@playwright/test";

async function openChat(page: Page) {
  await page.goto("/en/docs/overview");
  await expect(page.locator(".docs-desktop-toc .docs-toc")).toBeVisible();
  await page.getByRole("button", { name: "Open docs assistant" }).click();
  await expect(page.getByRole("button", { name: "Close docs assistant" })).toBeVisible();
  await page.getByRole("textbox", { name: "Ask about a contract, error, or limitation." }).fill("What is the restore boundary?");
  await page.getByRole("button", { name: "Send question" }).click();
}

test("projects a 429 response into rate-limit recovery without blocking docs", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/api/chat", async (route) => {
    requestCount++;
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      headers: { "Retry-After": "45" },
      body: JSON.stringify({
        error: "Quota reached",
        cause: "rate_limit",
        retryAfterSeconds: 45,
      }),
    });
  });

  await openChat(page);
  const alert = page.locator('.docs-chat-state[role="alert"]');
  await expect(alert).toContainText("The request limit was reached.");
  await expect(alert).toContainText("You can retry in 45 seconds.");
  await expect(alert.getByRole("link", { name: "Browse related docs" })).toHaveAttribute("href", "/en/docs/troubleshooting");
  await expect(page.locator("#docs-reading")).toBeVisible();
  await expect(page.locator('.docs-desktop-sidebar a[href="/en/docs/getting-started"]')).toBeVisible();

  await alert.getByRole("button", { name: "Retry" }).click();
  await expect.poll(() => requestCount).toBe(2);
  await page.getByRole("button", { name: "Close docs assistant" }).click();
  await page.locator(".docs-desktop-toc .docs-toc a").first().click();
  await expect(page).toHaveURL(/#why-does-firsttx-exist$/);
});

test("keeps server failures separate from rate-limit recovery", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Internal RAG error",
        cause: "server_error",
      }),
    });
  });

  await openChat(page);
  const alert = page.locator('.docs-chat-state[role="alert"]');
  await expect(alert).toContainText("The answer could not be loaded.");
  await expect(alert).not.toContainText("request limit");
  await expect(alert.getByRole("button", { name: "Retry" })).toBeVisible();
});
