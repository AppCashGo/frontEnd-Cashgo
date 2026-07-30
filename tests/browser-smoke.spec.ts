import { expect, type APIRequestContext, type Page, test } from "@playwright/test";

type BrowserSmokeLoginResponse = {
  accessToken: string;
  user: unknown;
};

function collectBrowserErrors(page: Page) {
  const browserErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(error.message);
  });

  return browserErrors;
}

async function loginWithDevelopmentAccount(
  page: Page,
  request: APIRequestContext,
) {
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
}

test("logs in with the development account and loads the sales workspace", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);

  await loginWithDevelopmentAccount(page, request);

  await page.goto("/sales");
  await expect(page).toHaveURL(/\/sales$/);
  await expect(
    page.getByRole("heading", { name: /nueva venta/i }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("loads the retail settings flow and opens product tax selection", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);

  await loginWithDevelopmentAccount(page, request);

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("heading", { name: /configuraciones/i }),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: /^general$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /tu plan/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /impresión/i })).toBeVisible();

  const settingsContent = page.locator("main").last();
  await expect(settingsContent.getByText("Datos del negocio")).toBeVisible();
  await expect(settingsContent.getByText("Impuestos")).toBeVisible();
  await expect(settingsContent.getByText("Catálogo virtual")).toBeVisible();
  await expect(settingsContent.getByText("Inventario")).toBeVisible();
  await expect(settingsContent.getByText("Recordatorios")).toBeVisible();
  await expect(
    settingsContent.getByText("Configuraciones adicionales"),
  ).toBeVisible();

  await page
    .getByRole("button", { exact: true, name: "Seleccionar productos" })
    .click();

  const taxDrawer = page.getByRole("dialog", { name: "Modificar impuestos" });
  await expect(taxDrawer).toBeVisible();
  await expect(
    taxDrawer.getByText("Selecciona los productos a modificar"),
  ).toBeVisible();
  await expect(
    taxDrawer.getByText("Selecciona los impuestos aplicables"),
  ).toBeVisible();

  await taxDrawer
    .getByRole("button", { exact: true, name: "Seleccionar productos" })
    .click();

  const productSelector = page.getByRole("dialog", {
    name: "Seleccionar productos a modificar",
  });
  await expect(productSelector).toBeVisible();
  await expect(page.getByRole("button", { name: /ver todos/i })).toBeVisible();
  const productSelectorHeader = productSelector.locator("thead");
  await expect(productSelectorHeader).toContainText("Producto");
  await expect(productSelectorHeader).toContainText("Precio");
  await expect(productSelectorHeader).toContainText("Costo");
  await expect(productSelectorHeader).toContainText("Impuesto");

  await productSelector
    .getByLabel("Seleccionar todos los productos visibles")
    .check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(productSelector).toBeHidden();
  await expect(taxDrawer.getByText(/productos seleccionados/)).toBeVisible();
  expect(browserErrors).toEqual([]);
});
