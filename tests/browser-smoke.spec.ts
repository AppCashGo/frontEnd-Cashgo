import { expect, test } from "@playwright/test";

type BrowserSmokeLoginResponse = {
  accessToken: string;
  user: unknown;
};

test("logs in with the development account and loads the sales workspace", async ({
  page,
  request,
}) => {
  const browserErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(error.message);
  });

  await page.goto("/auth");
  await expect(page.locator("body")).toContainText(/Cashgo/);

  const backendPort = process.env.SMOKE_BACKEND_PORT ?? "3209";
  const loginResponse = await request.post(
    `http://127.0.0.1:${backendPort}/api/auth/login`,
    {
      data: {
        identifier: "admin@cashgo.test",
        password: "admin12345",
      },
    },
  );
  expect(loginResponse.ok()).toBe(true);

  const session = (await loginResponse.json()) as BrowserSmokeLoginResponse;
  await page.addInitScript((authSession) => {
    window.localStorage.setItem(
      "cashgo-auth-session",
      JSON.stringify({
        state: authSession,
        version: 0,
      }),
    );
  }, session);

  await page.goto("/sales");
  await expect(page).toHaveURL(/\/sales$/);
  await expect(
    page.getByRole("heading", { name: /nueva venta/i }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});
