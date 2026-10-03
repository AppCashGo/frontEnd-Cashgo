import { expect, type APIRequestContext, type Page, test } from "@playwright/test";

type LoginResponse = {
  accessToken: string;
  user: unknown;
};

const protectedRoutes = [
  "/dashboard",
  "/sales",
  "/sales/new",
  "/movements",
  "/billing",
  "/quotes",
  "/quotes/new/products",
  "/quotes/new/free",
  "/reports",
  "/inventory",
  "/products",
  "/expenses",
  "/employees",
  "/customers",
  "/suppliers",
  "/settings",
  "/help",
  "/terms",
  "/privacy",
] as const;

function apiUrl(path: string) {
  const backendPort = process.env.SMOKE_BACKEND_PORT ?? "3209";
  return `http://127.0.0.1:${backendPort}/api${path}`;
}

async function installDevelopmentSession(
  page: Page,
  request: APIRequestContext,
) {
  const response = await request.post(apiUrl("/auth/login"), {
    data: {
      identifier: "admin@cashgo.test",
      password: "admin12345",
    },
  });

  expect(response.ok()).toBe(true);
  const session = (await response.json()) as LoginResponse;

  await page.addInitScript((authSession) => {
    window.localStorage.setItem(
      "cashgo-auth-session",
      JSON.stringify({ state: authSession, version: 0 }),
    );
  }, session);
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 700 },
]) {
  test.describe(`mobile ${viewport.width}px`, () => {
    test.use({ viewport });

    test("keeps every main route inside the viewport", async ({
      page,
      request,
    }) => {
      await page.goto("/auth");
      await expect(page.locator("main").first()).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        )
        .toBe(true);

      await installDevelopmentSession(page, request);

      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page.locator("main").first()).toBeVisible();
        await page.waitForTimeout(250);

        const dimensions = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));

        expect(
          dimensions.scrollWidth,
          `${route} overflows horizontally at ${viewport.width}px`,
        ).toBeLessThanOrEqual(dimensions.clientWidth);
      }
    });
  });
}
