import { expect, test } from "@playwright/test";

const catalogPath = "/catalogo/cashgo-numeric-demo-1";

test.beforeEach(async ({ page }, testInfo) => {
  await page.route("**/api/catalog-customer/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/notifications/read")) {
      await route.fulfill({ body: JSON.stringify({ updated: true }), contentType: "application/json", status: 200 });
      return;
    }
    if (url.endsWith("/notifications")) {
      await route.fulfill({
        body: JSON.stringify([{ id: 31, orderId: 701, type: "ORDER_STATUS", title: "Pedido confirmado", message: "Tu pedido fue confirmado.", readAt: null, createdAt: "2026-10-01T15:00:00.000Z" }]),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    await route.fulfill({ body: JSON.stringify([]), contentType: "application/json", status: 200 });
  });
  await page.route("**/api/catalog-payments/configuration", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ enabled: true, provider: "WOMPI" }),
      contentType: "application/json",
      status: 200,
    });
  });
  const orders = [
    {
      id: 701,
      orderNumber: "WEB-20261001-TEST01",
      status: "PENDING_CONFIRMATION",
      fulfillmentMethod: "DELIVERY",
      paymentStatus: "PENDING",
      contactName: "Cliente Prueba",
      email: "cliente@cashgo.test",
      phone: "3001234567",
      address: "Calle 1 # 2-30",
      instructions: "",
      subtotal: 3500,
      deliveryFee: 6000,
      total: 9500,
      statusUpdatedAt: "2026-10-01T15:00:00.000Z",
      createdAt: "2026-10-01T15:00:00.000Z",
      items: [
        {
          id: 801,
          productId: 5,
          productName: "Papas chips personal",
          unitPrice: 3500,
          quantity: 1,
          lineTotal: 3500,
          imageUrl: null,
        },
      ],
    },
  ];
  await page.route("**/api/catalog-orders/customer/**", async (route) => {
    await route.fulfill({
      body: JSON.stringify(route.request().method() === "POST" ? orders[0] : orders),
      contentType: "application/json",
      status: route.request().method() === "POST" ? 201 : 200,
    });
  });
  await page.route("**/api/customer-auth/**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        accessToken: "customer-test-token",
        customer: {
          businessId: 1,
          businessName: "Cashgo Numeric Demo",
          catalogSlug: "cashgo-numeric-demo-1",
          email: "cliente@cashgo.test",
          id: 91,
          name: "Cliente Prueba",
        },
        expiresIn: "1d",
        tokenType: "Bearer",
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/catalogs/**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        business: {
          address: "Calle 10 # 20-30",
          businessCategory: "Tienda",
          businessName: "Cashgo Numeric Demo",
          city: "Bogotá",
          email: "tienda@cashgo.test",
          id: 1,
          logoUrl: null,
          phone: "3001234567",
        },
        categories: [{ id: 1, name: "Snacks" }],
        products: [
          {
            barcode: null,
            categoryId: 1,
            description: "Papas crocantes",
            id: 5,
            imageUrls: [],
            isAvailable: true,
            name: "Papas chips personal",
            price: 3500,
            sku: "PAP-001",
            stock: 55,
            unit: "unidad",
          },
        ],
        settings: {
          businessHours: null,
          deliveryEnabled: true,
          deliveryFee: 6000,
          outOfStockBehavior: "SHOW_NORMALLY",
          pickupEnabled: true,
          shoppingEnabled: !testInfo.title.includes(
            "hides shopping controls when disabled",
          ),
        },
        slug: "cashgo-numeric-demo-1",
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.goto(catalogPath);
  await page.evaluate(() => window.localStorage.removeItem("cashgo-public-carts"));
  await page.evaluate(() =>
    window.localStorage.removeItem("cashgo-customer-sessions"),
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "Cashgo Numeric Demo" })).toBeVisible();
});

test("hides shopping controls when disabled", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Agregar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Abrir carrito/ })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Ingresar" })).toHaveCount(0);
  await expect(page.getByText("Papas chips personal")).toBeVisible();
  await expect(page.getByText("$ 3.500")).toBeVisible();
});

test("persists products and quantities after a reload", async ({ page }) => {
  const firstProduct = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Papas chips personal" }),
  });

  await firstProduct.getByRole("button", { name: "Agregar" }).click();
  await firstProduct.getByRole("button", { name: "Aumentar cantidad" }).click();
  await expect(firstProduct.getByRole("status")).toHaveText("2");

  await page.reload();
  await expect(firstProduct.getByRole("status")).toHaveText("2");

  await page.getByRole("button", { name: /Abrir carrito con 2 productos/ }).click();
  const cart = page.getByRole("dialog", { name: "Resumen de compra" });
  await expect(cart).toBeVisible();
  await expect(cart.getByText("Papas chips personal")).toBeVisible();
  await expect(cart.getByText("Subtotal (2 productos)")).toBeVisible();
});

test("registers a customer without losing the cart", async ({ page }) => {
  await page.getByRole("button", { name: "Agregar" }).click();
  await page.getByRole("button", { name: /Abrir carrito con 1 productos/ }).click();
  await page.getByRole("button", { name: "Ingresar para continuar" }).click();

  const authDialog = page.getByRole("dialog", { name: "Acceso de clientes" });
  await expect(authDialog).toBeVisible();
  await authDialog.getByRole("tab", { name: "Crear cuenta" }).click();
  await authDialog.getByLabel("Nombre completo").fill("Cliente Prueba");
  await authDialog.getByLabel("Correo electrónico").fill("cliente@cashgo.test");
  await authDialog.getByLabel("Contraseña", { exact: true }).fill("Cliente123!");
  await authDialog.getByLabel("Confirmar contraseña").fill("Cliente123!");
  await authDialog
    .getByRole("button", { name: "Crear cuenta y continuar" })
    .click();

  await expect(authDialog).toBeHidden();
  await expect(page.getByText("Compra como")).toBeVisible();
  await expect(
    page.getByText("¿Cómo quieres recibir tu compra?"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Domicilio/ })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Cliente").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Abrir carrito con 1 productos/ })).toBeVisible();
});

test("persists delivery details and includes the configured fee", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.localStorage.setItem(
      "cashgo-customer-sessions",
      JSON.stringify({
        state: {
          sessions: {
            "cashgo-numeric-demo-1": {
              accessToken: "customer-test-token",
              customer: {
                businessId: 1,
                businessName: "Cashgo Numeric Demo",
                catalogSlug: "cashgo-numeric-demo-1",
                email: "cliente@cashgo.test",
                id: 91,
                name: "Cliente Prueba",
              },
            },
          },
        },
        version: 1,
      }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "Agregar" }).click();
  await page.getByRole("button", { name: /Abrir carrito con 1 productos/ }).click();
  await page.getByRole("button", { name: "Continuar con la entrega" }).click();
  await page.getByRole("button", { name: /Domicilio/ }).click();
  await page.getByLabel("Celular de contacto").fill("3001234567");
  await page.getByLabel("Dirección de entrega").fill("Calle 1 # 2-30");
  await expect(page.getByLabel("Guardar esta dirección")).toBeVisible();

  await expect(page.getByText("Domicilio").last()).toBeVisible();
  await expect(page.getByText("$ 9.500").last()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crear pedido" }),
  ).toBeEnabled();

  await page.reload();
  await page.getByRole("button", { name: /Abrir carrito con 1 productos/ }).click();
  await page.getByRole("button", { name: "Continuar con la entrega" }).click();
  await expect(page.getByLabel("Dirección de entrega")).toHaveValue(
    "Calle 1 # 2-30",
  );
});

test("creates an order and shows persistent tracking", async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.setItem(
      "cashgo-customer-sessions",
      JSON.stringify({
        state: {
          sessions: {
            "cashgo-numeric-demo-1": {
              accessToken: "customer-test-token",
              customer: {
                businessId: 1,
                businessName: "Cashgo Numeric Demo",
                catalogSlug: "cashgo-numeric-demo-1",
                email: "cliente@cashgo.test",
                id: 91,
                name: "Cliente Prueba",
              },
            },
          },
        },
        version: 1,
      }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "Agregar" }).click();
  await page.getByRole("button", { name: /Abrir carrito con 1 productos/ }).click();
  await page.getByRole("button", { name: "Continuar con la entrega" }).click();
  await page.getByRole("button", { name: /Domicilio/ }).click();
  await page.getByLabel("Celular de contacto").fill("3001234567");
  await page.getByLabel("Dirección de entrega").fill("Calle 1 # 2-30");
  await page.getByRole("button", { name: "Crear pedido" }).click();

  const ordersDialog = page.getByRole("dialog", { name: "Mis pedidos" });
  await expect(ordersDialog).toBeVisible();
  await expect(ordersDialog.getByText("¡Pedido creado!")).toBeVisible();
  await expect(ordersDialog.getByText("WEB-20261001-TEST01").first()).toBeVisible();
  await expect(ordersDialog.getByText("Esperando confirmación")).toBeVisible();
  await expect(ordersDialog.getByText("Pedido confirmado")).toBeVisible();
  await expect(
    ordersDialog.getByRole("button", { name: "Pagar con Wompi" }),
  ).toBeVisible();
  await expect(
    ordersDialog.getByRole("button", { name: "Volver a comprar" }),
  ).toBeVisible();

  await ordersDialog.getByRole("button", { name: "Cerrar pedidos" }).click();
  await expect(page.getByRole("button", { name: /Abrir carrito con 0 productos/ })).toBeVisible();
  await page.getByRole("button", { name: "Mis pedidos" }).click();
  await expect(page.getByText("WEB-20261001-TEST01")).toBeVisible();
  await page.getByRole("button", { name: "Volver a comprar" }).click();
  const reorderedCart = page.getByRole("dialog", { name: "Resumen de compra" });
  await expect(reorderedCart).toBeVisible();
  await expect(reorderedCart.getByText("Papas chips personal")).toBeVisible();
  await expect(
    reorderedCart.getByText("Agregamos nuevamente los productos con sus precios actuales."),
  ).toBeVisible();
});

test("keeps payment and tracking controls responsive on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    window.localStorage.setItem(
      "cashgo-customer-sessions",
      JSON.stringify({
        state: {
          sessions: {
            "cashgo-numeric-demo-1": {
              accessToken: "customer-test-token",
              customer: {
                businessId: 1,
                businessName: "Cashgo Numeric Demo",
                catalogSlug: "cashgo-numeric-demo-1",
                email: "cliente@cashgo.test",
                id: 91,
                name: "Cliente Prueba",
              },
            },
          },
        },
        version: 1,
      }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "Mis pedidos" }).click();

  const dialog = page.getByRole("dialog", { name: "Mis pedidos" });
  await expect(dialog.getByRole("button", { name: "Pagar con Wompi" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 700 },
]) {
  test(`keeps the catalog and cart inside ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.getByRole("button", { name: "Agregar" }).first().click();
    await page.getByRole("button", { name: /1 producto/ }).last().click();
    await expect(page.getByRole("dialog", { name: "Resumen de compra" })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}
