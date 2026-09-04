import { expect, type APIRequestContext, type Page, test } from "@playwright/test";

test.setTimeout(90_000);

type BrowserSmokeLoginResponse = {
  accessToken: string;
  user: unknown;
};

type SmokeProductRecord = {
  id: number | string;
  name: string;
  cost: number | string;
  price: number | string;
  stock: number | string;
};

type SmokeCustomerReceivableRecord = {
  id: number | string;
  saleId: number | string;
  saleNumber: string;
  amount: number | string;
  paidAmount: number | string;
  balance: number | string;
  status: string;
};

type SmokeCustomerRecord = {
  id: number | string;
  name: string;
  balance: number | string;
  receivables?: SmokeCustomerReceivableRecord[];
};

type SmokeSaleRecord = {
  id: number | string;
  saleNumber: string;
  status?: string;
  payments?: Array<{
    id: number | string;
    amount: number | string;
    method: string;
  }>;
  accountReceivable?: SmokeCustomerReceivableRecord | null;
  total: number | string;
};

type SmokeCashRegisterPaymentSummary = {
  method: string;
  amount: number | string;
};

type SmokeCashRegisterSession = {
  id: number | string;
  status?: string;
  cashExpectedTotal: number | string;
  closingAmount?: number | string | null;
  difference?: number | string | null;
  salesTotal: number | string;
  paymentMethods: SmokeCashRegisterPaymentSummary[];
};

type SmokeMovementLedgerItem = {
  concept: string;
  amount: number | string | null;
  direction: string;
  kind: string;
  paymentMethod: string | null;
  productName: string | null;
  referenceId: number | string | null;
  referenceType: string | null;
};

type SmokeMovementsOverview = {
  receivablesTotal?: number | string;
  transactions: SmokeMovementLedgerItem[];
};

type SmokeInventoryMovementRecord = {
  id: number | string;
  productId: number | string;
  type: string;
  referenceType: string | null;
  quantity: number | string;
  previousStock: number | string;
  newStock: number | string;
  unitCost: number | string | null;
  reason: string | null;
};

type SmokeSupplierRecord = {
  id: number | string;
  name: string;
  email: string | null;
  phone: string | null;
};

type SmokeBusinessSettingsRecord = {
  businessName: string;
  printTicketWidth: "58mm" | "80mm";
  printShowLogo: boolean;
  printShowTaxDetail: boolean;
  printFooterMessage: string;
};

let developmentSessionPromise: Promise<BrowserSmokeLoginResponse> | null = null;

function collectBrowserErrors(page: Page) {
  const browserErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      const errorText = message.text();

      if (
        errorText.includes(
          "Support for defaultProps will be removed from function components",
        ) &&
        (errorText.includes("YAxis") || errorText.includes("XAxis"))
      ) {
        return;
      }

      browserErrors.push(errorText);
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

  const session = await fetchDevelopmentSession(request);
  await installAuthSession(page, session);

  return session;
}

async function fetchDevelopmentSession(request: APIRequestContext) {
  developmentSessionPromise ??= request
    .post(apiUrl("/auth/login"), {
      data: {
        identifier: "admin@cashgo.test",
        password: "admin12345",
      },
    })
    .then(async (loginResponse) => {
      const body = await loginResponse.text();

      if (!loginResponse.ok()) {
        throw new Error(
          `Development login failed with ${loginResponse.status()}: ${body}`,
        );
      }

      return JSON.parse(body) as BrowserSmokeLoginResponse;
    })
    .catch((error: unknown) => {
      developmentSessionPromise = null;
      throw error;
    });

  return developmentSessionPromise;
}

async function installAuthSession(
  page: Page,
  session: BrowserSmokeLoginResponse,
) {
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

function apiUrl(path: string) {
  const backendPort = process.env.SMOKE_BACKEND_PORT ?? "3209";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `http://127.0.0.1:${backendPort}/api${normalizedPath}`;
}

function authHeaders(session: BrowserSmokeLoginResponse) {
  return {
    Authorization: `Bearer ${session.accessToken}`,
  };
}

async function apiGet<T>(
  request: APIRequestContext,
  session: BrowserSmokeLoginResponse,
  path: string,
) {
  const response = await request.get(apiUrl(path), {
    headers: authHeaders(session),
  });
  expect(response.ok()).toBe(true);

  return (await response.json()) as T;
}

async function apiGetNullable<T>(
  request: APIRequestContext,
  session: BrowserSmokeLoginResponse,
  path: string,
) {
  const response = await request.get(apiUrl(path), {
    headers: authHeaders(session),
  });
  expect(response.ok()).toBe(true);

  const body = await response.text();
  if (!body.trim()) {
    return null;
  }

  return JSON.parse(body) as T;
}

async function apiPost<T>(
  request: APIRequestContext,
  session: BrowserSmokeLoginResponse,
  path: string,
  data: unknown,
) {
  const response = await request.post(apiUrl(path), {
    data,
    headers: authHeaders(session),
  });
  expect(response.ok()).toBe(true);

  return (await response.json()) as T;
}

async function safeApiPatch(
  request: APIRequestContext,
  session: BrowserSmokeLoginResponse,
  path: string,
  data: unknown,
) {
  try {
    await request.patch(apiUrl(path), {
      data,
      headers: authHeaders(session),
      timeout: 15_000,
    });
  } catch {
    // Cleanup requests must never hide the UI/API assertion that ran first.
  }
}

async function safeApiDelete(
  request: APIRequestContext,
  session: BrowserSmokeLoginResponse,
  path: string,
) {
  try {
    await request.delete(apiUrl(path), {
      headers: authHeaders(session),
      timeout: 15_000,
    });
  } catch {
    // Cleanup requests must never hide the UI/API assertion that ran first.
  }
}

async function generateUniqueSupplierPhone(
  request: APIRequestContext,
  session: BrowserSmokeLoginResponse,
  prefix: string,
) {
  const suppliers = await apiGet<SmokeSupplierRecord[]>(
    request,
    session,
    "/suppliers",
  );
  const existingPhones = new Set(
    suppliers.map((supplier) => supplier.phone).filter(Boolean),
  );

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const suffix = String(
      Date.now() + Math.floor(Math.random() * 1_000_000) + attempt,
    )
      .slice(-7)
      .padStart(7, "0");
    const candidate = `${prefix}${suffix}`;

    if (!existingPhones.has(candidate)) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique supplier phone for smoke test.");
}

async function closeCurrentCashRegisterIfAny(
  request: APIRequestContext,
  session: BrowserSmokeLoginResponse,
) {
  const currentSession = await apiGetNullable<SmokeCashRegisterSession>(
    request,
    session,
    "/cash-register/current",
  );

  if (!currentSession) {
    return null;
  }

  return apiPost<SmokeCashRegisterSession>(
    request,
    session,
    "/cash-register/close",
    {
      closingAmount: toNumber(currentSession.cashExpectedTotal),
      closingNote: "Browser smoke cleanup before opening a new register",
    },
  );
}

async function ensureOpenCashRegister(
  request: APIRequestContext,
  session: BrowserSmokeLoginResponse,
) {
  const currentSession = await apiGetNullable<SmokeCashRegisterSession>(
    request,
    session,
    "/cash-register/current",
  );

  if (currentSession) {
    return currentSession;
  }

  return apiPost<SmokeCashRegisterSession>(
    request,
    session,
    "/cash-register/open",
    {
      openingAmount: 0,
      openingNote: "Browser smoke cash register session",
    },
  );
}

async function createSmokeProduct(
  request: APIRequestContext,
  session: BrowserSmokeLoginResponse,
  runId: string,
) {
  return apiPost<SmokeProductRecord>(request, session, "/products", {
    name: `Smoke POS ${runId}`,
    sku: `SMOKE-POS-${runId}`,
    cost: 400,
    price: 1200,
    stock: 3,
    minStock: 0,
    unit: "UNIT",
    isActive: true,
    isVisibleInCatalog: false,
    taxLabel: "Sin impuesto",
    taxRate: 0,
  });
}

async function createSmokeCustomer(
  request: APIRequestContext,
  session: BrowserSmokeLoginResponse,
  runId: string,
) {
  const uniqueDigits = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;

  return apiPost<SmokeCustomerRecord>(request, session, "/customers", {
    name: `Smoke Credit ${runId}`,
    phone: `320${uniqueDigits.slice(-7)}`,
    notes: "Browser smoke credit sale customer",
  });
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function getPaymentSummaryAmount(
  session: SmokeCashRegisterSession,
  method: string,
) {
  return toNumber(
    session.paymentMethods.find(
      (paymentSummary) => paymentSummary.method === method,
    )?.amount,
  );
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

test("closes the current cash register from the sales workspace", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);
  const session = await loginWithDevelopmentAccount(page, request);
  const cashRegister = await ensureOpenCashRegister(request, session);
  const expectedCashAmount = toNumber(cashRegister.cashExpectedTotal);

  await page.goto("/sales");
  await expect(page).toHaveURL(/\/sales$/);
  await expect(
    page.getByRole("heading", { name: /nueva venta/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /caja abierta/i }).click();
  await page.getByRole("menuitem", { name: "Cerrar caja" }).click();

  const closeDrawer = page.getByRole("dialog", { name: "Cerrar caja" });
  await expect(closeDrawer).toBeVisible();
  await closeDrawer
    .getByLabel("¿Cuánto dinero tienes en efectivo? *")
    .fill(expectedCashAmount.toFixed(2));
  await closeDrawer.getByRole("button", { name: "Continuar" }).click();

  const reviewDrawer = page.getByRole("dialog", {
    name: "Registros realizados",
  });
  await expect(reviewDrawer).toBeVisible();
  await expect(reviewDrawer.getByText("Caja completa")).toBeVisible();
  await expect(reviewDrawer.getByText("Resumen del turno")).toBeVisible();

  const closeResponsePromise = page.waitForResponse((response) => {
    const requestInfo = response.request();
    const pathname = new URL(response.url()).pathname;

    return (
      requestInfo.method() === "POST" &&
      pathname.endsWith("/api/cash-register/close") &&
      response.ok()
    );
  });

  await reviewDrawer
    .getByRole("button", { name: "Confirmar cierre" })
    .click();

  const closeResponse = await closeResponsePromise;
  const closedCashRegister =
    (await closeResponse.json()) as SmokeCashRegisterSession;

  expect(String(closedCashRegister.id)).toBe(String(cashRegister.id));
  expect(closedCashRegister.status).toBe("CLOSED");
  expect(toNumber(closedCashRegister.closingAmount)).toBe(expectedCashAmount);
  expect(toNumber(closedCashRegister.difference)).toBe(0);

  await expect(reviewDrawer).toBeHidden();
  await expect(
    page.getByRole("button", { name: /abrir caja/i }),
  ).toBeVisible();

  const currentCashRegister = await apiGetNullable<SmokeCashRegisterSession>(
    request,
    session,
    "/cash-register/current",
  );
  expect(currentCashRegister).toBeNull();
  expect(browserErrors).toEqual([]);
});

test("opens a cash register from sales and rejects duplicate sessions", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);
  const session = await loginWithDevelopmentAccount(page, request);

  await closeCurrentCashRegisterIfAny(request, session);

  await page.goto("/sales");
  await expect(page).toHaveURL(/\/sales$/);
  await expect(
    page.getByRole("heading", { name: /nueva venta/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /abrir caja/i }).click();

  const openDrawer = page.getByRole("dialog", { name: "Abrir caja" });
  await expect(openDrawer).toBeVisible();
  await openDrawer
    .getByLabel("¿Con cuánto dinero empiezas el turno? *")
    .fill("25000");

  const openResponsePromise = page.waitForResponse((response) => {
    const requestInfo = response.request();
    const pathname = new URL(response.url()).pathname;

    return (
      requestInfo.method() === "POST" &&
      pathname.endsWith("/api/cash-register/open") &&
      response.ok()
    );
  });

  await openDrawer.getByRole("button", { name: "Empezar turno" }).click();

  const openResponse = await openResponsePromise;
  const openedSession = (await openResponse.json()) as SmokeCashRegisterSession;

  expect(openedSession.status).toBe("OPEN");
  expect(toNumber(openedSession.cashExpectedTotal)).toBe(25000);
  await expect(openDrawer).toBeHidden();
  await expect(
    page.getByRole("button", { name: /caja abierta/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /caja abierta/i }).click();
  await expect(
    page.getByRole("menuitem", { name: "Cerrar caja" }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Ver Resumen de Caja" }),
  ).toBeVisible();

  const duplicateOpenResponse = await request.post(
    apiUrl("/cash-register/open"),
    {
      data: {
        openingAmount: 1000,
        openingNote: "Browser smoke duplicate open guard",
      },
      headers: authHeaders(session),
    },
  );
  expect(duplicateOpenResponse.status()).toBe(400);

  const currentSession = await apiGetNullable<SmokeCashRegisterSession>(
    request,
    session,
    "/cash-register/current",
  );
  expect(String(currentSession?.id)).toBe(String(openedSession.id));
  expect(browserErrors).toEqual([]);
});

test("creates a POS cash sale, decrements stock and records the movement", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);
  const session = await loginWithDevelopmentAccount(page, request);
  const runId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const product = await createSmokeProduct(request, session, runId);
  const cashRegister = await ensureOpenCashRegister(request, session);
  let createdSale: SmokeSaleRecord | null = null;

  try {
    await page.goto("/sales");
    await expect(page).toHaveURL(/\/sales$/);
    await expect(
      page.getByRole("heading", { name: /nueva venta/i }),
    ).toBeVisible();

    await page.getByPlaceholder("Buscar productos").fill(product.name);

    const productCard = page
      .getByRole("button")
      .filter({ hasText: product.name })
      .filter({ hasText: "3 disponibles" })
      .first();
    await expect(productCard).toBeVisible();
    await productCard.click();

    const cartPanel = page.locator("aside").filter({ hasText: "Productos" });
    await expect(cartPanel.getByText(product.name)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continuar/i }),
    ).toBeEnabled();
    await page.getByRole("button", { name: /continuar/i }).click();

    await expect(page.getByRole("heading", { name: /^pago$/i })).toBeVisible();

    const saleResponsePromise = page.waitForResponse((response) => {
      const requestInfo = response.request();
      const pathname = new URL(response.url()).pathname;

      return (
        requestInfo.method() === "POST" &&
        pathname.endsWith("/api/sales") &&
        response.ok()
      );
    });

    await page.getByRole("button", { name: /crear venta/i }).click();

    const changeModal = page.getByRole("dialog", {
      name: "Calcula el cambio de tu venta",
    });
    await expect(changeModal).toBeVisible();
    await expect(changeModal.getByText("Valor a devolver")).toBeVisible();
    await changeModal.getByRole("button", { name: "Confirmar" }).click();

    const saleResponse = await saleResponsePromise;
    createdSale = (await saleResponse.json()) as SmokeSaleRecord;

    const successDrawer = page.getByRole("dialog", {
      name: "¡Creaste una venta!",
    });
    await expect(successDrawer).toBeVisible();
    await expect(successDrawer).toContainText(createdSale.saleNumber);
    await expect(successDrawer).toContainText("$ 1.200");

    const receiptDownloadPromise = page.waitForEvent("download");
    await successDrawer
      .getByRole("button", { name: "Descargar comprobante" })
      .click();
    const receiptDownload = await receiptDownloadPromise;
    expect(receiptDownload.suggestedFilename()).toMatch(/receipt|comprobante|html/i);

    const productsAfterSale = await apiGet<SmokeProductRecord[]>(
      request,
      session,
      "/products",
    );
    const soldProduct = productsAfterSale.find(
      (candidate) => String(candidate.id) === String(product.id),
    );
    expect(soldProduct).toBeDefined();
    expect(toNumber(soldProduct?.stock)).toBe(toNumber(product.stock) - 1);

    const cashRegisterAfterSale = await apiGet<SmokeCashRegisterSession>(
      request,
      session,
      "/cash-register/current",
    );
    const cashSummary = cashRegisterAfterSale.paymentMethods.find(
      (paymentSummary) => paymentSummary.method === "CASH",
    );
    expect(String(cashRegisterAfterSale.id)).toBe(String(cashRegister.id));
    expect(toNumber(cashRegisterAfterSale.salesTotal)).toBeGreaterThanOrEqual(
      toNumber(product.price),
    );
    expect(toNumber(cashSummary?.amount)).toBeGreaterThanOrEqual(
      toNumber(product.price),
    );

    const movementsOverview = await apiGet<SmokeMovementsOverview>(
      request,
      session,
      `/movements/overview?search=${encodeURIComponent(
        createdSale.saleNumber,
      )}`,
    );
    const saleMovement = movementsOverview.transactions.find(
      (transaction) =>
        transaction.kind === "SALE" &&
        transaction.direction === "IN" &&
        String(transaction.referenceId) === String(createdSale?.id),
    );

    expect(saleMovement).toBeDefined();
    expect(saleMovement?.concept).toContain(createdSale.saleNumber);
    expect(saleMovement?.paymentMethod).toBe("CASH");
    expect(toNumber(saleMovement?.amount)).toBe(toNumber(product.price));
    expect(browserErrors).toEqual([]);
  } finally {
    if (createdSale) {
      await safeApiPatch(request, session, `/sales/${createdSale.id}/cancel`, {
        reason: "Browser smoke cleanup",
      });
    }

    await safeApiDelete(request, session, `/products/${product.id}`);
  }
});

test("creates a POS split-payment sale and records each payment method", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);
  const session = await loginWithDevelopmentAccount(page, request);
  const runId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const product = await createSmokeProduct(request, session, runId);
  const cashRegisterBeforeSale = await ensureOpenCashRegister(request, session);
  const cardTotalBeforeSale = getPaymentSummaryAmount(
    cashRegisterBeforeSale,
    "CARD",
  );
  const transferTotalBeforeSale = getPaymentSummaryAmount(
    cashRegisterBeforeSale,
    "TRANSFER",
  );
  let createdSale: SmokeSaleRecord | null = null;

  try {
    await page.goto("/sales");
    await expect(page).toHaveURL(/\/sales$/);
    await expect(
      page.getByRole("heading", { name: /nueva venta/i }),
    ).toBeVisible();

    await page.getByPlaceholder("Buscar productos").fill(product.name);

    const productCard = page
      .getByRole("button")
      .filter({ hasText: product.name })
      .filter({ hasText: "3 disponibles" })
      .first();
    await expect(productCard).toBeVisible();
    await productCard.click();

    await expect(
      page.getByRole("button", { name: /continuar/i }),
    ).toBeEnabled();
    await page.getByRole("button", { name: /continuar/i }).click();

    const paymentPanel = page.locator("aside").filter({ hasText: "Pago" });
    await expect(
      paymentPanel.getByRole("heading", { name: /^pago$/i }),
    ).toBeVisible();

    await paymentPanel.getByRole("button", { exact: true, name: "2" }).click();

    const splitPaymentItems = paymentPanel.locator("label", {
      hasText: "Método de pago",
    });
    await splitPaymentItems.nth(0).locator("select").selectOption({
      label: "Tarjeta",
    });
    await splitPaymentItems.nth(1).locator("select").selectOption({
      label: "Transferencia bancaria",
    });
    await expect(
      paymentPanel.getByText("Los pagos suman el total de la orden:"),
    ).toBeVisible();

    const saleResponsePromise = page.waitForResponse((response) => {
      const requestInfo = response.request();
      const pathname = new URL(response.url()).pathname;

      return (
        requestInfo.method() === "POST" &&
        pathname.endsWith("/api/sales") &&
        response.ok()
      );
    });

    await paymentPanel.getByRole("button", { name: /crear venta/i }).click();

    const saleResponse = await saleResponsePromise;
    createdSale = (await saleResponse.json()) as SmokeSaleRecord;

    const successDrawer = page.getByRole("dialog", {
      name: "¡Creaste una venta!",
    });
    await expect(successDrawer).toBeVisible();
    await expect(successDrawer).toContainText(createdSale.saleNumber);
    await expect(successDrawer).toContainText("$ 1.200");

    expect(createdSale.status).toBe("COMPLETED");
    expect(createdSale.payments ?? []).toHaveLength(2);
    expect(createdSale.accountReceivable ?? null).toBeNull();

    const cardPayment = createdSale.payments?.find(
      (payment) => payment.method === "CARD",
    );
    const transferPayment = createdSale.payments?.find(
      (payment) => payment.method === "TRANSFER",
    );
    expect(toNumber(cardPayment?.amount)).toBe(600);
    expect(toNumber(transferPayment?.amount)).toBe(600);

    const productsAfterSale = await apiGet<SmokeProductRecord[]>(
      request,
      session,
      "/products",
    );
    const soldProduct = productsAfterSale.find(
      (candidate) => String(candidate.id) === String(product.id),
    );
    expect(soldProduct).toBeDefined();
    expect(toNumber(soldProduct?.stock)).toBe(toNumber(product.stock) - 1);

    const cashRegisterAfterSale = await apiGet<SmokeCashRegisterSession>(
      request,
      session,
      "/cash-register/current",
    );
    expect(String(cashRegisterAfterSale.id)).toBe(
      String(cashRegisterBeforeSale.id),
    );
    expect(
      getPaymentSummaryAmount(cashRegisterAfterSale, "CARD") -
        cardTotalBeforeSale,
    ).toBe(600);
    expect(
      getPaymentSummaryAmount(cashRegisterAfterSale, "TRANSFER") -
        transferTotalBeforeSale,
    ).toBe(600);

    const movementsOverview = await apiGet<SmokeMovementsOverview>(
      request,
      session,
      `/movements/overview?search=${encodeURIComponent(
        createdSale.saleNumber,
      )}`,
    );
    const saleMovement = movementsOverview.transactions.find(
      (transaction) =>
        transaction.kind === "SALE" &&
        transaction.direction === "IN" &&
        String(transaction.referenceId) === String(createdSale?.id),
    );

    expect(saleMovement).toBeDefined();
    expect(saleMovement?.concept).toContain(createdSale.saleNumber);
    expect(saleMovement?.paymentMethod).toBeNull();
    expect(toNumber(saleMovement?.amount)).toBe(toNumber(product.price));
    expect(browserErrors).toEqual([]);
  } finally {
    if (createdSale) {
      await safeApiPatch(request, session, `/sales/${createdSale.id}/cancel`, {
        reason: "Browser smoke cleanup",
      });
    }

    await safeApiDelete(request, session, `/products/${product.id}`);
  }
});

test("cancels a POS sale from the success drawer and restores stock", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);
  const session = await loginWithDevelopmentAccount(page, request);
  const runId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const product = await createSmokeProduct(request, session, runId);
  let createdSale: SmokeSaleRecord | null = null;
  let wasCancelledFromUi = false;

  try {
    await ensureOpenCashRegister(request, session);

    await page.goto("/sales");
    await expect(page).toHaveURL(/\/sales$/);
    await expect(
      page.getByRole("heading", { name: /nueva venta/i }),
    ).toBeVisible();

    await page.getByPlaceholder("Buscar productos").fill(product.name);

    const productCard = page
      .getByRole("button")
      .filter({ hasText: product.name })
      .filter({ hasText: "3 disponibles" })
      .first();
    await expect(productCard).toBeVisible();
    await productCard.click();

    await expect(
      page.getByRole("button", { name: /continuar/i }),
    ).toBeEnabled();
    await page.getByRole("button", { name: /continuar/i }).click();

    const paymentPanel = page.locator("aside").filter({ hasText: "Pago" });
    await expect(
      paymentPanel.getByRole("heading", { name: /^pago$/i }),
    ).toBeVisible();
    await paymentPanel.getByRole("button", { name: "Tarjeta" }).click();

    const saleResponsePromise = page.waitForResponse((response) => {
      const requestInfo = response.request();
      const pathname = new URL(response.url()).pathname;

      return (
        requestInfo.method() === "POST" &&
        pathname.endsWith("/api/sales") &&
        response.ok()
      );
    });

    await paymentPanel.getByRole("button", { name: /crear venta/i }).click();

    const saleResponse = await saleResponsePromise;
    createdSale = (await saleResponse.json()) as SmokeSaleRecord;

    const successDrawer = page.getByRole("dialog", {
      name: "¡Creaste una venta!",
    });
    await expect(successDrawer).toBeVisible();
    await expect(successDrawer).toContainText(createdSale.saleNumber);

    const cancelDialogPromise = page.waitForResponse((response) => {
      const requestInfo = response.request();
      const pathname = new URL(response.url()).pathname;

      return (
        requestInfo.method() === "PATCH" &&
        pathname.endsWith(`/api/sales/${createdSale?.id}/cancel`) &&
        response.ok()
      );
    });

    await successDrawer.getByRole("button", { name: "Cancelar venta" }).click();

    const confirmDialog = page.getByRole("dialog", {
      name: "¿Quieres cancelar esta venta?",
    });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Cancelar venta" }).click();

    const cancelResponse = await cancelDialogPromise;
    const cancelledSale = (await cancelResponse.json()) as SmokeSaleRecord;
    wasCancelledFromUi = true;

    await expect(successDrawer).toBeHidden();
    await expect(page.getByText("Venta cancelada correctamente.")).toBeVisible();
    expect(cancelledSale.status).toBe("CANCELLED");

    const productsAfterCancel = await apiGet<SmokeProductRecord[]>(
      request,
      session,
      "/products",
    );
    const restoredProduct = productsAfterCancel.find(
      (candidate) => String(candidate.id) === String(product.id),
    );
    expect(restoredProduct).toBeDefined();
    expect(toNumber(restoredProduct?.stock)).toBe(toNumber(product.stock));
    expect(browserErrors).toEqual([]);
  } finally {
    if (createdSale && !wasCancelledFromUi) {
      await safeApiPatch(request, session, `/sales/${createdSale.id}/cancel`, {
        reason: "Browser smoke cleanup",
      });
    }

    await safeApiDelete(request, session, `/products/${product.id}`);
  }
});

test("creates a POS credit sale and records the customer receivable", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);
  const session = await loginWithDevelopmentAccount(page, request);
  const runId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const product = await createSmokeProduct(request, session, runId);
  const customer = await createSmokeCustomer(request, session, runId);
  let createdSale: SmokeSaleRecord | null = null;

  try {
    await page.goto("/sales");
    await expect(page).toHaveURL(/\/sales$/);
    await expect(
      page.getByRole("heading", { name: /nueva venta/i }),
    ).toBeVisible();

    await page.getByPlaceholder("Buscar productos").fill(product.name);

    const productCard = page
      .getByRole("button")
      .filter({ hasText: product.name })
      .filter({ hasText: "3 disponibles" })
      .first();
    await expect(productCard).toBeVisible();
    await productCard.click();

    const cartPanel = page.locator("aside").filter({ hasText: "Productos" });
    await expect(cartPanel.getByText(product.name)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continuar/i }),
    ).toBeEnabled();
    await page.getByRole("button", { name: /continuar/i }).click();

    const paymentPanel = page.locator("aside").filter({ hasText: "Pago" });
    await expect(
      paymentPanel.getByRole("heading", { name: /^pago$/i }),
    ).toBeVisible();
    await paymentPanel.getByRole("button", { name: "A crédito" }).click();
    await paymentPanel.locator("select").selectOption({ label: customer.name });

    const saleResponsePromise = page.waitForResponse((response) => {
      const requestInfo = response.request();
      const pathname = new URL(response.url()).pathname;

      return (
        requestInfo.method() === "POST" &&
        pathname.endsWith("/api/sales") &&
        response.ok()
      );
    });

    await paymentPanel.getByRole("button", { name: /crear venta/i }).click();

    const saleResponse = await saleResponsePromise;
    createdSale = (await saleResponse.json()) as SmokeSaleRecord;

    const successDrawer = page.getByRole("dialog", {
      name: "¡Creaste una venta!",
    });
    await expect(successDrawer).toBeVisible();
    await expect(successDrawer).toContainText(createdSale.saleNumber);
    await expect(successDrawer).toContainText("$ 1.200");

    expect(createdSale.status).toBe("PENDING_PAYMENT");
    expect(createdSale.payments ?? []).toHaveLength(0);
    expect(createdSale.accountReceivable).toBeTruthy();
    expect(toNumber(createdSale.accountReceivable?.amount)).toBe(
      toNumber(product.price),
    );
    expect(toNumber(createdSale.accountReceivable?.paidAmount)).toBe(0);
    expect(toNumber(createdSale.accountReceivable?.balance)).toBe(
      toNumber(product.price),
    );

    const productsAfterSale = await apiGet<SmokeProductRecord[]>(
      request,
      session,
      "/products",
    );
    const soldProduct = productsAfterSale.find(
      (candidate) => String(candidate.id) === String(product.id),
    );
    expect(soldProduct).toBeDefined();
    expect(toNumber(soldProduct?.stock)).toBe(toNumber(product.stock) - 1);

    const customerAfterSale = await apiGet<SmokeCustomerRecord>(
      request,
      session,
      `/customers/${customer.id}`,
    );
    const customerReceivable = customerAfterSale.receivables?.find(
      (receivable) => String(receivable.saleId) === String(createdSale?.id),
    );
    expect(toNumber(customerAfterSale.balance)).toBe(toNumber(product.price));
    expect(customerReceivable).toBeDefined();
    const customerReceivableId = String(customerReceivable?.id);
    expect(customerReceivable?.saleNumber).toBe(createdSale.saleNumber);
    expect(toNumber(customerReceivable?.balance)).toBe(toNumber(product.price));

    await ensureOpenCashRegister(request, session);
    await page.goto("/customers");
    await expect(page).toHaveURL(/\/customers$/);
    await expect(
      page.getByRole("heading", { name: "Clientes", exact: true }),
    ).toBeVisible();
    await page.getByPlaceholder("Buscar cliente").fill(customer.name);

    const customerRow = page
      .getByRole("row")
      .filter({ hasText: customer.name })
      .first();
    await expect(customerRow).toBeVisible();
    await customerRow.getByRole("button", { name: "Detalle" }).click();

    const customerDrawer = page.getByRole("dialog", {
      name: "Detalle del cliente",
    });
    await expect(customerDrawer).toBeVisible();
    await expect(
      customerDrawer.getByRole("heading", { name: "Registrar abono" }),
    ).toBeVisible();

    await customerDrawer.getByLabel("Valor recibido").fill("600");
    await customerDrawer
      .getByLabel("Medio de pago")
      .selectOption({ label: "Efectivo" });
    await customerDrawer
      .getByLabel("Nota del comprobante")
      .fill(`Browser smoke receivable payment ${runId}`);

    const paymentResponsePromise = page.waitForResponse((response) => {
      const requestInfo = response.request();
      const pathname = new URL(response.url()).pathname;

      return (
        requestInfo.method() === "POST" &&
        pathname.endsWith(
          `/api/accounts-receivable/${customerReceivableId}/payments`,
        ) &&
        response.ok()
      );
    });

    await customerDrawer
      .getByRole("button", { name: "Registrar abono" })
      .click();
    await paymentResponsePromise;

    await expect(
      customerDrawer.getByText("El comprobante del ultimo abono esta listo."),
    ).toBeVisible();
    const paymentReceiptDownloadPromise = page.waitForEvent("download");
    await customerDrawer
      .getByRole("button", { name: "Descargar comprobante" })
      .click();
    const paymentReceiptDownload = await paymentReceiptDownloadPromise;
    expect(paymentReceiptDownload.suggestedFilename()).toMatch(
      /payment-receipt|comprobante|html/i,
    );

    const customerAfterPayment = await apiGet<SmokeCustomerRecord>(
      request,
      session,
      `/customers/${customer.id}`,
    );
    const receivableAfterPayment = customerAfterPayment.receivables?.find(
      (receivable) => String(receivable.saleId) === String(createdSale?.id),
    );
    expect(toNumber(customerAfterPayment.balance)).toBe(600);
    expect(toNumber(receivableAfterPayment?.paidAmount)).toBe(600);
    expect(toNumber(receivableAfterPayment?.balance)).toBe(600);
    expect(receivableAfterPayment?.status).toBe("PARTIAL");

    const movementsOverview = await apiGet<SmokeMovementsOverview>(
      request,
      session,
      `/movements/overview?search=${encodeURIComponent(
        createdSale.saleNumber,
      )}`,
    );
    const creditSaleMovement = movementsOverview.transactions.find(
      (transaction) =>
        transaction.kind === "SALE" &&
        transaction.direction === "IN" &&
        String(transaction.referenceId) === String(createdSale?.id),
    );

    expect(creditSaleMovement).toBeDefined();
    expect(creditSaleMovement?.concept).toContain(createdSale.saleNumber);
    expect(creditSaleMovement?.paymentMethod).toBeNull();
    expect(toNumber(creditSaleMovement?.amount)).toBe(toNumber(product.price));
    expect(toNumber(movementsOverview.receivablesTotal)).toBeGreaterThanOrEqual(
      toNumber(product.price),
    );
    expect(browserErrors).toEqual([]);
  } finally {
    if (createdSale) {
      await safeApiPatch(request, session, `/sales/${createdSale.id}/cancel`, {
        reason: "Browser smoke cleanup",
      });
    }

    await safeApiDelete(request, session, `/products/${product.id}`);
  }
});

test("registers an inventory purchase, updates cost and records the movement", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);
  const session = await loginWithDevelopmentAccount(page, request);
  const runId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const product = await createSmokeProduct(request, session, runId);
  const suppliers = await apiGet<SmokeSupplierRecord[]>(
    request,
    session,
    "/suppliers",
  );
  const supplier = suppliers[0];
  if (!supplier) {
    throw new Error("The inventory purchase smoke test requires one supplier.");
  }
  const purchaseQuantity = 2;
  const purchaseUnitCost = 900;
  const purchaseReason = `Browser smoke inventory purchase ${runId}`;
  const expectedStock = toNumber(product.stock) + purchaseQuantity;
  const expectedWeightedCost =
    (toNumber(product.stock) * toNumber(product.cost) +
      purchaseQuantity * purchaseUnitCost) /
    expectedStock;

  try {
    await page.goto("/inventory");
    await expect(page).toHaveURL(/\/inventory$/);
    await expect(
      page.getByRole("heading", { name: /inventario/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Registrar compra" }).click();

    const purchaseDrawer = page.getByRole("dialog", {
      name: "Registrar compra",
    });
    await expect(purchaseDrawer).toBeVisible();

    await purchaseDrawer.getByLabel("Proveedor").selectOption({
      label: supplier.name,
    });
    await purchaseDrawer.getByLabel("Producto").selectOption({
      label: product.name,
    });
    await purchaseDrawer
      .getByLabel("Cantidad")
      .fill(String(purchaseQuantity));
    await purchaseDrawer
      .getByLabel("Costo unitario")
      .fill(String(purchaseUnitCost));
    await purchaseDrawer
      .getByLabel("Factura o referencia")
      .fill(`SMOKE-${runId}`);
    await purchaseDrawer.getByLabel("Notas de la compra").fill(purchaseReason);

    const purchaseResponsePromise = page.waitForResponse((response) => {
      const requestInfo = response.request();
      const pathname = new URL(response.url()).pathname;

      return (
        requestInfo.method() === "POST" &&
        pathname.endsWith("/api/inventory/purchase") &&
        response.ok()
      );
    });

    await purchaseDrawer
      .getByRole("button", { name: "Registrar compra" })
      .click();

    const purchaseResponse = await purchaseResponsePromise;
    const purchaseMovement =
      (await purchaseResponse.json()) as SmokeInventoryMovementRecord;

    expect(String(purchaseMovement.productId)).toBe(String(product.id));
    expect(purchaseMovement.type).toBe("IN");
    expect(purchaseMovement.referenceType).toBe("PURCHASE");
    expect(toNumber(purchaseMovement.quantity)).toBe(purchaseQuantity);
    expect(toNumber(purchaseMovement.previousStock)).toBe(
      toNumber(product.stock),
    );
    expect(toNumber(purchaseMovement.newStock)).toBe(expectedStock);
    expect(toNumber(purchaseMovement.unitCost)).toBe(purchaseUnitCost);
    expect(purchaseMovement.reason).toBe(purchaseReason);

    await expect(purchaseDrawer).toBeHidden();

    const productsAfterPurchase = await apiGet<SmokeProductRecord[]>(
      request,
      session,
      "/products",
    );
    const purchasedProduct = productsAfterPurchase.find(
      (candidate) => String(candidate.id) === String(product.id),
    );

    expect(purchasedProduct).toBeDefined();
    expect(toNumber(purchasedProduct?.stock)).toBe(expectedStock);
    expect(toNumber(purchasedProduct?.cost)).toBe(expectedWeightedCost);
    expect(browserErrors).toEqual([]);
  } finally {
    await safeApiDelete(request, session, `/products/${product.id}`);
  }
});

test("records manual inventory exits and absolute stock adjustments", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);
  const session = await loginWithDevelopmentAccount(page, request);
  const runId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const product = await createSmokeProduct(request, session, runId);
  const exitQuantity = 1;
  const exitReason = `Browser smoke inventory exit ${runId}`;
  const stockAfterExit = toNumber(product.stock) - exitQuantity;
  const finalTargetStock = 6;
  const adjustmentReason = `Browser smoke inventory absolute adjustment ${runId}`;

  try {
    await page.goto("/inventory");
    await expect(page).toHaveURL(/\/inventory$/);
    await expect(
      page.getByRole("heading", { name: /inventario/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Ajustar inventario" }).click();

    const adjustmentDrawer = page.getByRole("dialog", {
      name: "Ajustar inventario",
    });
    await expect(adjustmentDrawer).toBeVisible();

    await adjustmentDrawer.getByLabel("Producto").selectOption({
      label: product.name,
    });
    await adjustmentDrawer
      .getByLabel("Tipo de movimiento")
      .selectOption("OUT");
    await adjustmentDrawer.getByLabel("Cantidad").fill(String(exitQuantity));
    await adjustmentDrawer.getByLabel("Nota del ajuste").fill(exitReason);

    const exitResponsePromise = page.waitForResponse((response) => {
      const requestInfo = response.request();
      const pathname = new URL(response.url()).pathname;

      return (
        requestInfo.method() === "POST" &&
        pathname.endsWith("/api/inventory/adjustment") &&
        response.ok()
      );
    });

    await adjustmentDrawer
      .getByRole("button", { name: "Guardar ajuste" })
      .click();

    const exitResponse = await exitResponsePromise;
    const exitMovement =
      (await exitResponse.json()) as SmokeInventoryMovementRecord;

    expect(String(exitMovement.productId)).toBe(String(product.id));
    expect(exitMovement.type).toBe("OUT");
    expect(exitMovement.referenceType).toBe("MANUAL");
    expect(toNumber(exitMovement.quantity)).toBe(-exitQuantity);
    expect(toNumber(exitMovement.previousStock)).toBe(toNumber(product.stock));
    expect(toNumber(exitMovement.newStock)).toBe(stockAfterExit);
    expect(exitMovement.reason).toBe(exitReason);

    await expect(adjustmentDrawer).toBeHidden();

    await page.getByRole("button", { name: "Ajustar inventario" }).click();
    await expect(adjustmentDrawer).toBeVisible();

    await adjustmentDrawer.getByLabel("Producto").selectOption({
      label: product.name,
    });
    await adjustmentDrawer
      .getByLabel("Tipo de movimiento")
      .selectOption("ADJUSTMENT");
    await adjustmentDrawer
      .getByLabel("Stock final")
      .fill(String(finalTargetStock));
    await adjustmentDrawer
      .getByLabel("Nota del ajuste")
      .fill(adjustmentReason);

    const adjustmentResponsePromise = page.waitForResponse((response) => {
      const requestInfo = response.request();
      const pathname = new URL(response.url()).pathname;

      return (
        requestInfo.method() === "POST" &&
        pathname.endsWith("/api/inventory/adjustment") &&
        response.ok()
      );
    });

    await adjustmentDrawer
      .getByRole("button", { name: "Guardar ajuste" })
      .click();

    const adjustmentResponse = await adjustmentResponsePromise;
    const adjustmentMovement =
      (await adjustmentResponse.json()) as SmokeInventoryMovementRecord;

    expect(String(adjustmentMovement.productId)).toBe(String(product.id));
    expect(adjustmentMovement.type).toBe("ADJUSTMENT");
    expect(adjustmentMovement.referenceType).toBe("MANUAL");
    expect(toNumber(adjustmentMovement.quantity)).toBe(
      finalTargetStock - stockAfterExit,
    );
    expect(toNumber(adjustmentMovement.previousStock)).toBe(stockAfterExit);
    expect(toNumber(adjustmentMovement.newStock)).toBe(finalTargetStock);
    expect(adjustmentMovement.reason).toBe(adjustmentReason);

    await expect(adjustmentDrawer).toBeHidden();

    const productsAfterAdjustment = await apiGet<SmokeProductRecord[]>(
      request,
      session,
      "/products",
    );
    const adjustedProduct = productsAfterAdjustment.find(
      (candidate) => String(candidate.id) === String(product.id),
    );

    expect(adjustedProduct).toBeDefined();
    expect(toNumber(adjustedProduct?.stock)).toBe(finalTargetStock);
    expect(browserErrors).toEqual([]);
  } finally {
    await safeApiDelete(request, session, `/products/${product.id}`);
  }
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

test("updates an existing supplier from the retail suppliers table", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);
  const session = await loginWithDevelopmentAccount(page, request);
  const runId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const supplierPhone = await generateUniqueSupplierPhone(
    request,
    session,
    "300",
  );
  const supplier = await apiPost<SmokeSupplierRecord>(
    request,
    session,
    "/suppliers",
    {
      name: `Smoke Supplier ${runId}`,
      email: `supplier-${runId}@cashgo.test`,
      phone: supplierPhone,
    },
  );
  const updatedSupplierName = `${supplier.name} Editado`;
  const updatedSupplierPhone = await generateUniqueSupplierPhone(
    request,
    session,
    "301",
  );

  await page.goto("/suppliers");
  await expect(page).toHaveURL(/\/suppliers$/);
  await expect(
    page.getByRole("heading", { name: "Proveedores", exact: true }),
  ).toBeVisible();

  await page.getByPlaceholder("Busca un proveedor").fill(supplier.name);

  const supplierRow = page
    .getByRole("row")
    .filter({ hasText: supplier.name })
    .first();
  await expect(supplierRow).toBeVisible();
  await supplierRow.getByRole("button", { name: "Editar" }).click();

  const supplierDrawer = page.getByRole("dialog", {
    name: "Editar proveedor",
  });
  await expect(supplierDrawer).toBeVisible();
  await supplierDrawer.getByLabel("Nombre del proveedor *").fill(
    updatedSupplierName,
  );
  await supplierDrawer.getByLabel("Número celular").fill(updatedSupplierPhone);
  await supplierDrawer
    .getByLabel("Correo electrónico")
    .fill(`supplier-updated-${runId}@cashgo.test`);

  await supplierDrawer.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(supplierDrawer).toBeHidden();

  const updatedSupplier = await apiGet<SmokeSupplierRecord>(
    request,
    session,
    `/suppliers/${supplier.id}`,
  );

  expect(updatedSupplier.name).toBe(updatedSupplierName);
  expect(updatedSupplier.phone).toBe(updatedSupplierPhone);
  expect(updatedSupplier.email).toBe(`supplier-updated-${runId}@cashgo.test`);
  expect(browserErrors).toEqual([]);
});

test("saves print settings used by receipts and documents", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);
  const session = await loginWithDevelopmentAccount(page, request);
  const previousSettings = await apiGetNullable<SmokeBusinessSettingsRecord>(
    request,
    session,
    "/settings/business",
  );
  expect(previousSettings).not.toBeNull();
  const footerMessage = `Smoke print footer ${Date.now().toString(36)}`;

  try {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings$/);
    await page.getByRole("button", { name: "Impresión" }).click();

    await expect(
      page.getByRole("heading", {
        name: "Formato de tickets y comprobantes",
      }),
    ).toBeVisible();
    await page.getByLabel("Ancho del ticket").selectOption("58mm");
    await page.getByLabel("Mensaje al pie").fill(footerMessage);

    const settingsResponsePromise = page.waitForResponse((response) => {
      const requestInfo = response.request();
      const pathname = new URL(response.url()).pathname;

      return (
        requestInfo.method() === "PATCH" &&
        pathname.endsWith("/api/settings/business") &&
        response.ok()
      );
    });

    await page.getByRole("button", { name: "Guardar formato" }).click();
    const settingsResponse = await settingsResponsePromise;
    const updatedSettings =
      (await settingsResponse.json()) as SmokeBusinessSettingsRecord;

    expect(updatedSettings.printTicketWidth).toBe("58mm");
    expect(updatedSettings.printFooterMessage).toBe(footerMessage);
    await expect(
      page.getByText("Configuracion de impresion guardada."),
    ).toBeVisible();
    expect(browserErrors).toEqual([]);
  } finally {
    if (previousSettings) {
      await safeApiPatch(request, session, "/settings/business", {
        printTicketWidth: previousSettings.printTicketWidth,
        printShowLogo: previousSettings.printShowLogo,
        printShowTaxDetail: previousSettings.printShowTaxDetail,
        printFooterMessage: previousSettings.printFooterMessage,
      });
    }
  }
});

test("downloads the movements balance report from the retail drawer", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);

  await loginWithDevelopmentAccount(page, request);

  await page.goto("/movements");
  await expect(page).toHaveURL(/\/movements$/);
  await expect(
    page.getByRole("heading", { name: /movimientos/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /descargar reporte/i }).click();
  const reportDrawer = page.getByRole("dialog", {
    name: "Descargar reporte",
  });
  await expect(reportDrawer).toBeVisible();
  await reportDrawer.getByRole("button", { name: /reporte de balance/i }).click();

  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /descargar balance en excel/i })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/cash-register|movements|csv/i);
  expect(browserErrors).toEqual([]);
});

test("renders core retail routes across desktop, tablet and mobile widths", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);

  await loginWithDevelopmentAccount(page, request);

  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
  ];
  const routes = [
    { path: "/sales", heading: "Nueva venta" },
    { path: "/inventory", heading: "Inventario" },
    { path: "/customers", heading: "Clientes" },
    { path: "/movements", heading: "Movimientos" },
    { path: "/settings", heading: "Configuraciones" },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page).toHaveURL(new RegExp(`${route.path}$`));
      await expect(
        page.getByRole("heading", { name: route.heading, exact: true }),
      ).toBeVisible();
      await expect(page.locator("body")).not.toContainText(
        "Unexpected Application Error",
      );
    }
  }

  expect(browserErrors).toEqual([]);
});

test("logs out from the sidebar and clears the persisted session", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);

  await loginWithDevelopmentAccount(page, request);

  await page.goto("/sales");
  await expect(
    page.getByRole("heading", { name: /nueva venta/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /cerrar sesión/i }).click();

  await expect(page).toHaveURL(/\/auth$/);

  const persistedSession = await page.evaluate(() => {
    const rawSession = window.localStorage.getItem("cashgo-auth-session");

    return rawSession ? JSON.parse(rawSession) : null;
  });

  expect(persistedSession?.state?.accessToken ?? null).toBeNull();
  expect(persistedSession?.state?.user ?? null).toBeNull();
  expect(browserErrors).toEqual([]);
});

test("redirects to auth when a protected request rejects the stored token", async ({
  page,
  request,
}) => {
  const session = await fetchDevelopmentSession(request);

  await installAuthSession(page, {
    ...session,
    accessToken: "expired-smoke-token",
  });

  await page.goto("/sales");
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.locator("body")).toContainText(/Cashgo/);

  const persistedSession = await page.evaluate(() => {
    const rawSession = window.localStorage.getItem("cashgo-auth-session");

    return rawSession ? JSON.parse(rawSession) : null;
  });

  expect(persistedSession?.state?.accessToken ?? null).toBeNull();
  expect(persistedSession?.state?.user ?? null).toBeNull();
});

test("loads dashboard, reports and movements entry points with seeded data", async ({
  page,
  request,
}) => {
  const browserErrors = collectBrowserErrors(page);

  await loginWithDevelopmentAccount(page, request);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Resumen del negocio")).toBeVisible();
  await expect(page.getByText("Ventas de hoy")).toBeVisible();

  await page.goto("/reports");
  await expect(page).toHaveURL(/\/reports$/);
  await expect(
    page.getByRole("heading", { name: /estadísticas/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^ventas$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^gastos$/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^empleados$/i }),
  ).toBeVisible();

  await page.goto("/movements");
  await expect(page).toHaveURL(/\/movements$/);
  await expect(
    page.getByRole("heading", { name: /movimientos/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /abrir caja|caja abierta/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /descargar reporte/i }),
  ).toBeVisible();

  expect(browserErrors).toEqual([]);
});
