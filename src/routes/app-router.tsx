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
import { NotFoundPage } from "@/shared/components/states/NotFoundPage";
import { PageLoadingState } from "@/shared/components/states/PageLoadingState";
import { RouteErrorBoundary } from "@/shared/components/states/RouteErrorBoundary";
import { routePageLoaders } from "@/routes/route-page-loaders";

const AuthPage = lazy(routePageLoaders.auth);
const DashboardPage = lazy(routePageLoaders.dashboard);
const ProductsPage = lazy(routePageLoaders.products);
const InventoryPage = lazy(routePageLoaders.inventory);
const SalesPage = lazy(routePageLoaders.sales);
const DeliveriesPage = lazy(routePageLoaders.deliveries);
const CashRegisterPage = lazy(routePageLoaders.movements);
const BillingPage = lazy(routePageLoaders.billing);
const ExpensesPage = lazy(routePageLoaders.expenses);
const CustomersPage = lazy(routePageLoaders.customers);
const SuppliersPage = lazy(routePageLoaders.suppliers);
const EmployeesPage = lazy(routePageLoaders.employees);
const QuotesPage = lazy(routePageLoaders.quotes);
const CreateQuotationPage = lazy(routePageLoaders.createQuote);
const PublicQuotationPage = lazy(routePageLoaders.publicQuote);
const PublicCatalogPage = lazy(routePageLoaders.publicCatalog);
const MoneyPage = lazy(routePageLoaders.money);
const ReportsPage = lazy(routePageLoaders.reports);
const SettingsPage = lazy(routePageLoaders.settings);
const HelpCenterPage = lazy(routePageLoaders.help);
const TermsAndConditionsPage = lazy(routePageLoaders.terms);
const PrivacyPolicyPage = lazy(routePageLoaders.privacy);

function withRouteSuspense(
  element: ReactElement,
  title: string,
  description: string,
) {
  return (
    <Suspense fallback={<PageLoadingState title={title} description={description} />}>
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
    path: `${routePaths.catalogPublic}/:slug`,
    errorElement: <RouteErrorBoundary />,
    element: withRouteSuspense(
      <PublicCatalogPage />,
      "Cargando catálogo",
      "Preparando productos, horarios y datos del negocio.",
    ),
  },
  {
    path: `${routePaths.quotePublic}/:token`,
    errorElement: <RouteErrorBoundary />,
    element: withRouteSuspense(
      <PublicQuotationPage />,
      "Cargando cotización",
      "Preparando la cotización compartida.",
    ),
  },
  {
    element: <PublicOnlyRoute />,
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/",
        element: <MainLayout />,
        errorElement: <RouteErrorBoundary />,
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
          {
            path: routeSegments.help,
            element: withRouteSuspense(
              <HelpCenterPage />,
              "Cargando centro de ayuda",
              "Preparando videos y guías de uso de Cashgo.",
            ),
          },
          {
            path: routeSegments.terms,
            element: withRouteSuspense(
              <TermsAndConditionsPage />,
              "Cargando términos y condiciones",
              "Preparando la información legal de Cashgo.",
            ),
          },
          {
            path: routeSegments.privacy,
            element: withRouteSuspense(
              <PrivacyPolicyPage />,
              "Cargando política de privacidad",
              "Preparando la información sobre datos y privacidad de Cashgo.",
            ),
          },
        ],
      },
    ],
  },
  {
    path: "*",
    errorElement: <RouteErrorBoundary />,
    element: <NotFoundPage />,
  },
]);
