import { Suspense, lazy, type ReactElement } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/routes/guards/ProtectedRoute";
import { PublicOnlyRoute } from "@/routes/guards/PublicOnlyRoute";
import {
  ModuleAccessRoute,
  WorkspaceLandingRoute,
} from "@/routes/guards/ModuleAccessRoute";
import { routeSegments, routePaths } from "@/routes/route-paths";
import { MainLayout } from "@/shared/components/layout/MainLayout";
import { ModulePlaceholder } from "@/shared/components/states/ModulePlaceholder";
import { NotFoundPage } from "@/shared/components/states/NotFoundPage";

const AuthPage = lazy(() =>
  import("@/modules/auth/pages/AuthPage").then((module) => ({
    default: module.AuthPage,
  })),
);

const DashboardPage = lazy(() =>
  import("@/modules/dashboard/pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);

const ProductsPage = lazy(() =>
  import("@/modules/products/pages/ProductsPage").then((module) => ({
    default: module.ProductsPage,
  })),
);

const InventoryPage = lazy(() =>
  import("@/modules/inventory/pages/InventoryPage").then((module) => ({
    default: module.InventoryPage,
  })),
);

const SalesPage = lazy(() =>
  import("@/modules/sales/pages/SalesPage").then((module) => ({
    default: module.SalesPage,
  })),
);

const DeliveriesPage = lazy(() =>
  import("@/modules/deliveries/pages/DeliveriesPage").then((module) => ({
    default: module.DeliveriesPage,
  })),
);

const CashRegisterPage = lazy(() =>
  import("@/modules/cash-register/pages/CashRegisterPage").then((module) => ({
    default: module.CashRegisterPage,
  })),
);

const BillingPage = lazy(() =>
  import("@/modules/billing/pages/BillingPage").then((module) => ({
    default: module.BillingPage,
  })),
);

const ExpensesPage = lazy(() =>
  import("@/modules/expenses/pages/ExpensesPage").then((module) => ({
    default: module.ExpensesPage,
  })),
);

const CustomersPage = lazy(() =>
  import("@/modules/customers/pages/CustomersPage").then((module) => ({
    default: module.CustomersPage,
  })),
);

const SuppliersPage = lazy(() =>
  import("@/modules/suppliers/pages/SuppliersPage").then((module) => ({
    default: module.SuppliersPage,
  })),
);

const EmployeesPage = lazy(() =>
  import("@/modules/employees/pages/EmployeesPage").then((module) => ({
    default: module.EmployeesPage,
  })),
);

const QuotesPage = lazy(() =>
  import("@/modules/quotes/pages/QuotesPage").then((module) => ({
    default: module.QuotesPage,
  })),
);

const CreateQuotationPage = lazy(() =>
  import("@/modules/quotes/pages/CreateQuotationPage").then((module) => ({
    default: module.CreateQuotationPage,
  })),
);

const PublicQuotationPage = lazy(() =>
  import("@/modules/quotes/pages/PublicQuotationPage").then((module) => ({
    default: module.PublicQuotationPage,
  })),
);

const MoneyPage = lazy(() =>
  import("@/modules/money/pages/MoneyPage").then((module) => ({
    default: module.MoneyPage,
  })),
);

const ReportsPage = lazy(() =>
  import("@/modules/reports/pages/ReportsPage").then((module) => ({
    default: module.ReportsPage,
  })),
);

const SettingsPage = lazy(() =>
  import("@/modules/settings/pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);

function withRouteSuspense(
  element: ReactElement,
  title: string,
  description: string,
) {
  return (
    <Suspense
      fallback={<ModulePlaceholder title={title} description={description} />}
    >
      {element}
    </Suspense>
  );
}

function withModuleRouteSuspense(
  segment: string,
  element: ReactElement,
  title: string,
  description: string,
) {
  return withRouteSuspense(
    <ModuleAccessRoute segment={segment}>{element}</ModuleAccessRoute>,
    title,
    description,
  );
}

export const appRouter = createBrowserRouter([
  {
    path: `${routePaths.quotePublic}/:token`,
    element: withRouteSuspense(
      <PublicQuotationPage />,
      "Cargando cotización",
      "Preparando la cotización compartida.",
    ),
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: routePaths.auth,
        element: withRouteSuspense(
          <AuthPage />,
          "Cargando acceso",
          "Preparando el ingreso y las protecciones de sesión.",
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <WorkspaceLandingRoute />,
          },
          {
            path: routeSegments.dashboard,
            element: withModuleRouteSuspense(
              routeSegments.dashboard,
              <DashboardPage />,
              "Cargando resumen",
              "Preparando métricas clave, ingresos y alertas de inventario.",
            ),
          },
          {
            path: routeSegments.products,
            element: withModuleRouteSuspense(
              routeSegments.products,
              <ProductsPage />,
              "Cargando productos",
              "Preparando el catálogo, la edición y la carga de inventario.",
            ),
          },
          {
            path: routeSegments.inventory,
            element: withModuleRouteSuspense(
              routeSegments.inventory,
              <InventoryPage />,
              "Cargando inventario",
              "Preparando movimientos, filtros y controles de ajuste.",
            ),
          },
          {
            path: routeSegments.sales,
            element: withModuleRouteSuspense(
              routeSegments.sales,
              <SalesPage />,
              "Cargando ventas",
              "Preparando la caja rápida y el flujo del carrito.",
            ),
          },
          {
            path: routeSegments.deliveries,
            element: withModuleRouteSuspense(
              routeSegments.deliveries,
              <DeliveriesPage />,
              "Cargando domicilios",
              "Preparando pedidos para entrega y operaciones de despacho.",
            ),
          },
          {
            path: routeSegments.movements,
            element: withModuleRouteSuspense(
              routeSegments.movements,
              <CashRegisterPage />,
              "Cargando movimientos",
              "Preparando la caja diaria y el flujo de arqueo.",
            ),
          },
          {
            path: routeSegments.billing,
            element: withModuleRouteSuspense(
              routeSegments.billing,
              <BillingPage />,
              "Cargando facturación",
              "Preparando comprobantes, cobros y control documental.",
            ),
          },
          {
            path: routeSegments.quotes,
            element: withModuleRouteSuspense(
              routeSegments.quotes,
              <QuotesPage />,
              "Cargando cotizaciones",
              "Preparando seguimiento comercial y cotizaciones.",
            ),
          },
          {
            path: `${routeSegments.quotes}/new`,
            element: withModuleRouteSuspense(
              routeSegments.quotes,
              <CreateQuotationPage />,
              "Cargando nueva cotización",
              "Preparando el flujo de creación de cotizaciones.",
            ),
          },
          {
            path: `${routeSegments.quotes}/new/:mode`,
            element: withModuleRouteSuspense(
              routeSegments.quotes,
              <CreateQuotationPage />,
              "Cargando nueva cotización",
              "Preparando el flujo de creación de cotizaciones.",
            ),
          },
          {
            path: routeSegments.expenses,
            element: withModuleRouteSuspense(
              routeSegments.expenses,
              <ExpensesPage />,
              "Cargando gastos",
              "Preparando el módulo de gastos y sus controles financieros.",
            ),
          },
          {
            path: routeSegments.customers,
            element: withModuleRouteSuspense(
              routeSegments.customers,
              <CustomersPage />,
              "Cargando clientes",
              "Preparando CRM, saldos e historial de compras.",
            ),
          },
          {
            path: routeSegments.suppliers,
            element: withModuleRouteSuspense(
              routeSegments.suppliers,
              <SuppliersPage />,
              "Cargando proveedores",
              "Preparando abastecimiento e historial del proveedor.",
            ),
          },
          {
            path: routeSegments.employees,
            element: withModuleRouteSuspense(
              routeSegments.employees,
              <EmployeesPage />,
              "Cargando empleados",
              "Preparando el equipo, accesos y permisos.",
            ),
          },
          {
            path: routeSegments.money,
            element: withModuleRouteSuspense(
              routeSegments.money,
              <MoneyPage />,
              "Cargando mi dinero",
              "Preparando cobros y herramientas financieras.",
            ),
          },
          {
            path: routeSegments.reports,
            element: withModuleRouteSuspense(
              routeSegments.reports,
              <ReportsPage />,
              "Cargando estadísticas",
              "Preparando reportes, gráficas e indicadores del negocio.",
            ),
          },
          {
            path: routeSegments.settings,
            element: withModuleRouteSuspense(
              routeSegments.settings,
              <SettingsPage />,
              "Cargando configuraciones",
              "Preparando negocio, impuestos y usuarios.",
            ),
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
