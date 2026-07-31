import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRequire = createRequire(
  new URL("../../backend/package.json", import.meta.url),
);
const {
  CashRegisterSessionStatus,
  PrismaClient,
  UserRole,
} = backendRequire("@prisma/client");
const bcrypt = backendRequire("bcryptjs");
const fetchImpl = globalThis.fetch ?? backendRequire("node-fetch");

loadDotEnvIfPresent(path.resolve(__dirname, "../../backend/.env"));
loadDotEnvIfPresent(path.resolve(__dirname, "../.env"));

const WRITE_GUARD_ENV = "CASHGO_SMOKE_ALLOW_DB_WRITE";
const API_URL =
  process.env.CASHGO_API_URL ?? "https://backend-cashgo.onrender.com/api";
const FRONTEND_URL =
  process.env.CASHGO_FRONTEND_URL ?? "https://front-end-cashgo.vercel.app";
const APP_TIME_ZONE = process.env.APP_TIME_ZONE ?? "America/Bogota";
const SALE_TOTAL = Number(process.env.CASHGO_SMOKE_SALE_TOTAL ?? 7890);
const HEADLESS = process.env.CASHGO_SMOKE_HEADLESS !== "0";

function loadDotEnvIfPresent(envPath) {
  if (!existsSync(envPath)) {
    return;
  }

  const envContent = readFileSync(envPath, "utf8");

  for (const line of envContent.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;

    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = unwrapDotEnvValue(rawValue);
  }
}

function unwrapDotEnvValue(rawValue) {
  const value = rawValue.trim();
  const quote = value[0];

  if (
    (quote === "\"" || quote === "'") &&
    value[value.length - 1] === quote
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function assertCanWrite() {
  if (process.env[WRITE_GUARD_ENV] !== "1") {
    throw new Error(
      `Refusing to create QA data. Set ${WRITE_GUARD_ENV}=1 to run this smoke test.`,
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }
}

async function requestJson(method, url, options = {}) {
  const response = await fetchImpl(url, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.businessId
        ? { "X-Business-Id": String(options.businessId) }
        : {}),
    },
    method,
  });
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(
      `${method} ${url} failed ${response.status}: ${JSON.stringify(payload)}`,
    );
  }

  return payload;
}

async function readResponsePayload(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getBusinessDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce((accumulator, part) => {
      if (part.type !== "literal") {
        accumulator[part.type] = part.value;
      }

      return accumulator;
    }, {});

  return {
    day: Number(parts.day),
    month: Number(parts.month),
    year: Number(parts.year),
  };
}

function formatDateParts(dateParts) {
  return [
    String(dateParts.year).padStart(4, "0"),
    String(dateParts.month).padStart(2, "0"),
    String(dateParts.day).padStart(2, "0"),
  ].join("-");
}

function addDays(dateParts, days) {
  const date = new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + days),
  );

  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

function getBusinessDate(value) {
  return formatDateParts(getBusinessDateParts(new Date(value)));
}

function toNumber(value) {
  if (value && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value ?? 0);
}

function assertCurrencyEqual(actual, expected, label) {
  if (Math.abs(toNumber(actual) - expected) > 0.01) {
    throw new Error(`${label} mismatch. Expected ${expected}, got ${actual}.`);
  }
}

function assertBusinessDate(value, expectedDate, label) {
  const actualDate = getBusinessDate(value);

  if (actualDate !== expectedDate) {
    throw new Error(
      `${label} mismatch. Expected ${expectedDate}, got ${actualDate}.`,
    );
  }
}

function formatCOPValue(value) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
}

function bodyIncludesCOPValue(bodyText, value) {
  const formattedValue = formatCOPValue(value);
  const normalizedBody = bodyText.replace(/\s+/g, " ");

  return [
    `$ ${formattedValue}`,
    `$${formattedValue}`,
    formattedValue,
    String(value),
  ].some((candidate) => normalizedBody.includes(candidate));
}

async function createSmokeIdentity(prisma, runId, password) {
  const translation = await prisma.translation.findFirst({
    where: {
      code: "es",
    },
  });

  if (!translation) {
    throw new Error("Spanish translation was not found in the database.");
  }

  const business = await prisma.business.create({
    data: {
      allowSaleWithoutStock: true,
      businessCategory: "corner_store",
      businessName: `QA UI Sale Date ${runId}`,
      city: "Bogota",
      currency: "COP",
      email: `qa-ui-sale-date-${runId}@cashgo.test`,
      legalName: `QA UI Sale Date ${runId} SAS`,
      phone: `+57921${runId.slice(-7)}`,
      taxId: `QA-UI-SD-${runId}`.slice(0, 80),
      taxLabel: "IVA",
      taxRate: 0,
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: `qa-ui-sale-date-owner-${runId}@cashgo.test`,
      memberships: {
        create: {
          businessId: business.id,
          role: UserRole.OWNER,
        },
      },
      name: "QA UI Sale Date Owner",
      password: await bcrypt.hash(password, 10),
      phone: `+57888${runId.slice(-8)}`,
      preferredBusinessId: business.id,
      role: UserRole.OWNER,
      translationId: translation.id,
    },
  });

  return {
    business,
    owner,
  };
}

async function cleanupSmokeData(prisma, ids) {
  await prisma.$transaction(async (transaction) => {
    if (ids.businessId) {
      await transaction.business.deleteMany({
        where: {
          id: ids.businessId,
        },
      });
    }

    if (ids.ownerUserId) {
      await transaction.user.deleteMany({
        where: {
          id: ids.ownerUserId,
        },
      });
    }
  });
}

function assertSaleInMovements(overview, saleId, expectedDate) {
  const saleMovement = overview.transactions?.find(
    (transaction) =>
      transaction.kind === "SALE" && transaction.referenceId === saleId,
  );

  if (!saleMovement) {
    throw new Error("The sale was not found in movements for the selected date.");
  }

  assertCurrencyEqual(saleMovement.amount, SALE_TOTAL, "Movement sale amount");
  assertBusinessDate(
    saleMovement.createdAt,
    expectedDate,
    "Movement sale date",
  );
}

function assertSaleInCashRegister(session, saleId, expectedDate) {
  if (!session) {
    throw new Error("Current cash register session was not returned.");
  }

  assertCurrencyEqual(session.salesTotal, SALE_TOTAL, "Cash register salesTotal");
  assertCurrencyEqual(
    session.cashSalesTotal,
    SALE_TOTAL,
    "Cash register cashSalesTotal",
  );

  const cashPayment = session.paymentMethods?.find(
    (paymentMethod) => paymentMethod.method === "CASH",
  );

  if (!cashPayment) {
    throw new Error("Cash payment method summary was not returned.");
  }

  assertCurrencyEqual(cashPayment.amount, SALE_TOTAL, "Cash payment amount");

  const saleTransaction = session.transactions?.find(
    (transaction) => transaction.kind === "SALE" && transaction.id === saleId,
  );

  if (!saleTransaction) {
    throw new Error("The sale was not found in cash register transactions.");
  }

  assertBusinessDate(
    saleTransaction.createdAt,
    expectedDate,
    "Cash register sale transaction date",
  );
}

function assertSalesOverview(report, expectedCount, expectedRevenue, label) {
  if (report.sales.salesCount !== expectedCount) {
    throw new Error(
      `${label} salesCount mismatch. Expected ${expectedCount}, got ${report.sales.salesCount}.`,
    );
  }

  assertCurrencyEqual(
    report.sales.totalRevenue,
    expectedRevenue,
    `${label} revenue`,
  );
}

async function assertRouteLoaded(page, pathname, expectedTexts) {
  await page.goto(`${FRONTEND_URL}${pathname}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {
    // Some production pages keep analytics/network beacons open. DOM assertions below are the source of truth.
  });

  const bodyText = await page.locator("body").innerText({ timeout: 20000 });

  if (bodyText.includes("Unexpected Application Error")) {
    throw new Error(`${pathname} rendered the route error boundary.`);
  }

  const hasExpectedText = expectedTexts.some((text) => bodyText.includes(text));

  if (!hasExpectedText) {
    throw new Error(
      `${pathname} did not render any expected text: ${expectedTexts.join(", ")}.`,
    );
  }

  return bodyText;
}

async function fillMovementsDate(page, selectedSaleDate) {
  const dateInput = page.locator('input[type="date"]:visible').first();

  await dateInput.waitFor({ state: "visible", timeout: 15000 });
  await dateInput.fill(selectedSaleDate);
  await page
    .waitForResponse(
      (response) =>
        response.url().includes("/movements/overview") &&
        response.url().includes(`from=${selectedSaleDate}`) &&
        response.url().includes(`to=${selectedSaleDate}`) &&
        response.ok(),
      { timeout: 15000 },
    )
    .catch(() => undefined);

  const bodyText = await page.locator("body").innerText({ timeout: 15000 });

  if (!bodyText.includes("Ventas totales")) {
    throw new Error("Movements page did not render the sales summary card.");
  }

  if (!bodyIncludesCOPValue(bodyText, SALE_TOTAL)) {
    throw new Error("Movements page did not show the selected-date sale total.");
  }
}

async function fillReportsDateRange(page, selectedSaleDate) {
  const dateInputs = page.locator('input[type="date"]:visible');
  const inputCount = await dateInputs.count();

  if (inputCount < 1) {
    throw new Error("Reports page did not render a date input.");
  }

  if (inputCount === 1) {
    await Promise.all([
      page
        .waitForResponse(
          (response) =>
            response.url().includes("/reports/overview") &&
            response.url().includes(`from=${selectedSaleDate}`) &&
            response.url().includes(`to=${selectedSaleDate}`) &&
            response.ok(),
          { timeout: 15000 },
        )
        .catch(() => undefined),
      dateInputs.first().fill(selectedSaleDate),
    ]);
  } else {
    await dateInputs.nth(0).fill(selectedSaleDate);
    await dateInputs.nth(1).fill(selectedSaleDate);
    await Promise.all([
      page
        .waitForResponse(
          (response) =>
            response.url().includes("/reports/overview") &&
            response.url().includes(`from=${selectedSaleDate}`) &&
            response.url().includes(`to=${selectedSaleDate}`) &&
            response.ok(),
          { timeout: 15000 },
        )
        .catch(() => undefined),
      page.getByRole("button", { name: /Aplicar filtros/i }).click(),
    ]);
  }

  const bodyText = await page.locator("body").innerText({ timeout: 15000 });

  if (!bodyIncludesCOPValue(bodyText, SALE_TOTAL)) {
    throw new Error(
      `Reports page did not show the selected-date sale total. Rendered text excerpt: ${bodyText.slice(0, 500)}`,
    );
  }
}

async function validateProductionUi(auth, selectedSaleDate) {
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: {
      height: 900,
      width: 1440,
    },
  });
  const page = await context.newPage();
  const pageFailures = [];

  page.on("pageerror", (error) => {
    pageFailures.push(error.message);
  });
  page.on("requestfailed", (request) => {
    const url = request.url();

    if (!url.startsWith(FRONTEND_URL) && !url.startsWith(API_URL)) {
      return;
    }

    pageFailures.push(
      `${request.method()} ${url}: ${request.failure()?.errorText ?? "failed"}`,
    );
  });

  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem(
        "cashgo-auth-session",
        JSON.stringify({
          state: {
            accessToken: token,
            user,
          },
          version: 0,
        }),
      );
    },
    {
      token: auth.accessToken,
      user: auth.user,
    },
  );

  const routeChecks = [];

  try {
    await assertRouteLoaded(page, "/sales", ["Nueva venta", "Vender"]);
    routeChecks.push("/sales");

    await assertRouteLoaded(page, "/movements", ["Movimientos"]);
    routeChecks.push("/movements");
    await fillMovementsDate(page, selectedSaleDate);

    await assertRouteLoaded(page, "/reports", ["Estadísticas", "Reportes"]);
    routeChecks.push("/reports");
    await fillReportsDateRange(page, selectedSaleDate);

    if (pageFailures.length > 0) {
      throw new Error(`Production UI emitted failures: ${pageFailures.join(" | ")}`);
    }

    return routeChecks;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function run() {
  assertCanWrite();

  const prisma = new PrismaClient();
  const runId = String(Date.now());
  const password = `QaUiSaleDate${runId}!`;
  const ids = {};
  const todayDate = formatDateParts(getBusinessDateParts(new Date()));
  const selectedSaleDate = formatDateParts(
    addDays(getBusinessDateParts(new Date()), -37),
  );
  const registerOpenedAt = new Date(`${selectedSaleDate}T00:00:00.000Z`);

  try {
    await prisma.$connect();

    const { business, owner } = await createSmokeIdentity(
      prisma,
      runId,
      password,
    );

    ids.businessId = business.id;
    ids.ownerUserId = owner.id;

    const cashRegister = await prisma.cashRegister.create({
      data: {
        businessId: business.id,
        initialAmount: 0,
        openedAt: registerOpenedAt,
        openingNote: "Temporary QA register for production UI sale date smoke.",
        responsibleUserId: owner.id,
        status: CashRegisterSessionStatus.OPEN,
      },
    });

    const auth = await requestJson("POST", `${API_URL}/auth/login`, {
      body: {
        identifier: owner.email,
        password,
      },
    });

    if (!auth.accessToken || auth.user?.businessId !== business.id) {
      throw new Error("Login did not return the expected test business session.");
    }

    const requestOptions = {
      businessId: business.id,
      token: auth.accessToken,
    };
    const sale = await requestJson("POST", `${API_URL}/sales`, {
      ...requestOptions,
      body: {
        cashRegisterId: cashRegister.id,
        manualSubtotal: SALE_TOTAL,
        notes: `QA production UI sale date ${runId}`,
        payments: [
          {
            amount: SALE_TOTAL,
            method: "CASH",
            notes: "Temporary QA payment for production UI sale date smoke.",
          },
        ],
        saleDate: selectedSaleDate,
      },
    });

    ids.saleId = sale.id;

    assertBusinessDate(sale.saleDate, selectedSaleDate, "Created saleDate");

    const persistedSale = await prisma.sale.findUnique({
      select: {
        createdAt: true,
        saleDate: true,
        total: true,
      },
      where: {
        id: sale.id,
      },
    });

    if (!persistedSale) {
      throw new Error("The created sale was not persisted.");
    }

    assertBusinessDate(
      persistedSale.saleDate,
      selectedSaleDate,
      "Persisted saleDate",
    );
    assertCurrencyEqual(persistedSale.total, SALE_TOTAL, "Persisted sale total");

    const selectedDateQuery = `from=${selectedSaleDate}&to=${selectedSaleDate}`;
    const todayDateQuery = `from=${todayDate}&to=${todayDate}`;
    const [sales, selectedOverview, todayOverview, movements, cashRegisterNow] =
      await Promise.all([
        requestJson("GET", `${API_URL}/sales`, requestOptions),
        requestJson(
          "GET",
          `${API_URL}/reports/overview?${selectedDateQuery}`,
          requestOptions,
        ),
        requestJson(
          "GET",
          `${API_URL}/reports/overview?${todayDateQuery}`,
          requestOptions,
        ),
        requestJson(
          "GET",
          `${API_URL}/movements/overview?${selectedDateQuery}&type=INCOME`,
          requestOptions,
        ),
        requestJson("GET", `${API_URL}/cash-register/current`, requestOptions),
      ]);

    const listedSale = sales.find((entry) => entry.id === sale.id);

    if (!listedSale) {
      throw new Error("The created sale was not returned by GET /sales.");
    }

    assertBusinessDate(listedSale.saleDate, selectedSaleDate, "Listed saleDate");
    assertSalesOverview(
      selectedOverview,
      1,
      SALE_TOTAL,
      "Selected-date overview",
    );
    assertSalesOverview(todayOverview, 0, 0, "Today overview");
    assertSaleInMovements(movements, sale.id, selectedSaleDate);
    assertSaleInCashRegister(cashRegisterNow, sale.id, selectedSaleDate);

    const routeChecks = await validateProductionUi(auth, selectedSaleDate);

    await cleanupSmokeData(prisma, ids);

    const [businesses, users, remainingSales] = await Promise.all([
      prisma.business.count({ where: { id: ids.businessId } }),
      prisma.user.count({ where: { id: ids.ownerUserId } }),
      prisma.sale.count({ where: { id: ids.saleId } }),
    ]);

    console.log(
      JSON.stringify(
        {
          cleanup: {
            businesses,
            remainingSales,
            users,
          },
          ok: true,
          verified: {
            apiUrl: API_URL,
            frontendUrl: FRONTEND_URL,
            routeChecks,
            saleDate: selectedSaleDate,
            saleId: sale.id,
            total: SALE_TOTAL,
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await cleanupSmokeData(prisma, ids).catch((cleanupError) => {
      console.error(`Cleanup failed: ${cleanupError.message}`);
    });
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

void run();
