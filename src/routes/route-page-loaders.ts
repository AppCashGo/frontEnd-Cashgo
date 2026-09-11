import { routePaths } from "@/routes/route-paths";

export const routePageLoaders = {
  auth: () =>
    import("@/modules/auth/pages/AuthPage").then((module) => ({
      default: module.AuthPage,
    })),
  dashboard: () =>
    import("@/modules/dashboard/pages/DashboardPage").then((module) => ({
      default: module.DashboardPage,
    })),
  products: () =>
    import("@/modules/products/pages/ProductsPage").then((module) => ({
      default: module.ProductsPage,
    })),
  inventory: () =>
    import("@/modules/inventory/pages/InventoryPage").then((module) => ({
      default: module.InventoryPage,
    })),
  sales: () =>
    import("@/modules/sales/pages/SalesPage").then((module) => ({
      default: module.SalesPage,
    })),
  deliveries: () =>
    import("@/modules/deliveries/pages/DeliveriesPage").then((module) => ({
      default: module.DeliveriesPage,
    })),
  movements: () =>
    import("@/modules/cash-register/pages/CashRegisterPage").then((module) => ({
      default: module.CashRegisterPage,
    })),
  billing: () =>
    import("@/modules/billing/pages/BillingPage").then((module) => ({
      default: module.BillingPage,
    })),
  expenses: () =>
    import("@/modules/expenses/pages/ExpensesPage").then((module) => ({
      default: module.ExpensesPage,
    })),
  customers: () =>
    import("@/modules/customers/pages/CustomersPage").then((module) => ({
      default: module.CustomersPage,
    })),
  suppliers: () =>
    import("@/modules/suppliers/pages/SuppliersPage").then((module) => ({
      default: module.SuppliersPage,
    })),
  employees: () =>
    import("@/modules/employees/pages/EmployeesPage").then((module) => ({
      default: module.EmployeesPage,
    })),
  quotes: () =>
    import("@/modules/quotes/pages/QuotesPage").then((module) => ({
      default: module.QuotesPage,
    })),
  createQuote: () =>
    import("@/modules/quotes/pages/CreateQuotationPage").then((module) => ({
      default: module.CreateQuotationPage,
    })),
  publicQuote: () =>
    import("@/modules/quotes/pages/PublicQuotationPage").then((module) => ({
      default: module.PublicQuotationPage,
    })),
  publicCatalog: () =>
    import("@/modules/catalog/pages/PublicCatalogPage").then((module) => ({
      default: module.PublicCatalogPage,
    })),
  money: () =>
    import("@/modules/money/pages/MoneyPage").then((module) => ({
      default: module.MoneyPage,
    })),
  reports: () =>
    import("@/modules/reports/pages/ReportsPage").then((module) => ({
      default: module.ReportsPage,
    })),
  settings: () =>
    import("@/modules/settings/pages/SettingsPage").then((module) => ({
      default: module.SettingsPage,
    })),
  help: () =>
    import("@/modules/help/pages/HelpCenterPage").then((module) => ({
      default: module.HelpCenterPage,
    })),
  terms: () =>
    import("@/modules/legal/pages/TermsAndConditionsPage").then((module) => ({
      default: module.TermsAndConditionsPage,
    })),
  privacy: () =>
    import("@/modules/legal/pages/PrivacyPolicyPage").then((module) => ({
      default: module.PrivacyPolicyPage,
    })),
} as const;

type RoutePageLoader = () => Promise<unknown>;

const routePreloaders = new Map<string, RoutePageLoader>([
  [routePaths.auth, routePageLoaders.auth],
  [routePaths.dashboard, routePageLoaders.dashboard],
  [routePaths.products, routePageLoaders.products],
  [routePaths.inventory, routePageLoaders.inventory],
  [routePaths.sales, routePageLoaders.sales],
  [routePaths.deliveries, routePageLoaders.deliveries],
  [routePaths.movements, routePageLoaders.movements],
  [routePaths.billing, routePageLoaders.billing],
  [routePaths.expenses, routePageLoaders.expenses],
  [routePaths.customers, routePageLoaders.customers],
  [routePaths.suppliers, routePageLoaders.suppliers],
  [routePaths.employees, routePageLoaders.employees],
  [routePaths.quotes, routePageLoaders.quotes],
  [routePaths.quoteNew, routePageLoaders.createQuote],
  [routePaths.money, routePageLoaders.money],
  [routePaths.reports, routePageLoaders.reports],
  [routePaths.settings, routePageLoaders.settings],
  [routePaths.help, routePageLoaders.help],
  [routePaths.terms, routePageLoaders.terms],
  [routePaths.privacy, routePageLoaders.privacy],
]);

export function preloadAppRoute(path: string) {
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/$/, "") || "/";
  const loader =
    routePreloaders.get(pathname) ??
    (pathname.startsWith(`${routePaths.quoteNew}/`)
      ? routePageLoaders.createQuote
      : undefined);

  if (!loader) {
    return;
  }

  void loader().catch(() => {
    // The route-level error boundary handles a failed chunk if navigation occurs.
  });
}
