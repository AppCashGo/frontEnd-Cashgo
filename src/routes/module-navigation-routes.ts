import {
  getBusinessNavigationPreset,
  type BusinessNavigationPreset,
} from "@/shared/constants/business-categories";
import {
  appDictionary,
  type AppLanguageCode,
} from "@/shared/i18n/app-dictionary";
import type { AppUserRole } from "@/shared/constants/user-roles";
import type { AppRoute } from "@/shared/types/app-route";
import { routePaths, routeSegments } from "@/routes/route-paths";

type BaseRoute = Omit<AppRoute, "label" | "description" | "isVisible">;

const baseModuleNavigationRoutes: BaseRoute[] = [
  {
    shortLabel: "RS",
    path: routePaths.dashboard,
    segment: routeSegments.dashboard,
    group: "business",
  },
  {
    shortLabel: "VD",
    path: routePaths.sales,
    segment: routeSegments.sales,
    group: "business",
  },
  {
    shortLabel: "DM",
    path: routePaths.deliveries,
    segment: routeSegments.deliveries,
    group: "business",
  },
  {
    shortLabel: "MO",
    path: routePaths.movements,
    segment: routeSegments.movements,
    group: "business",
  },
  {
    shortLabel: "FC",
    path: routePaths.billing,
    segment: routeSegments.billing,
    group: "business",
  },
  {
    shortLabel: "CZ",
    path: routePaths.quotes,
    segment: routeSegments.quotes,
    group: "business",
    featureBadge: "PRO",
  },
  {
    shortLabel: "ES",
    path: routePaths.reports,
    segment: routeSegments.reports,
    group: "business",
    featureBadge: "PRO",
  },
  {
    shortLabel: "IV",
    path: routePaths.inventory,
    segment: routeSegments.inventory,
    group: "business",
  },
  {
    shortLabel: "PD",
    path: routePaths.products,
    segment: routeSegments.products,
    group: "business",
  },
  {
    shortLabel: "GT",
    path: routePaths.expenses,
    segment: routeSegments.expenses,
    group: "business",
  },
  {
    shortLabel: "EM",
    path: routePaths.employees,
    segment: routeSegments.employees,
    group: "business",
    featureBadge: "PRO",
  },
  {
    shortLabel: "MD",
    path: routePaths.money,
    segment: routeSegments.money,
    group: "business",
  },
  {
    shortLabel: "CL",
    path: routePaths.customers,
    segment: routeSegments.customers,
    group: "contacts",
    featureBadge: "PRO",
  },
  {
    shortLabel: "PV",
    path: routePaths.suppliers,
    segment: routeSegments.suppliers,
    group: "contacts",
    featureBadge: "PRO",
  },
  {
    shortLabel: "CF",
    path: routePaths.settings,
    segment: routeSegments.settings,
    group: "workspace",
  },
];

const visibleSegmentsByPreset: Record<BusinessNavigationPreset, string[]> = {
  generic: [
    routeSegments.dashboard,
    routeSegments.sales,
    routeSegments.movements,
    routeSegments.reports,
    routeSegments.inventory,
    routeSegments.products,
    routeSegments.expenses,
    routeSegments.employees,
    routeSegments.customers,
    routeSegments.suppliers,
    routeSegments.settings,
  ],
  restaurant: [
    routeSegments.sales,
    routeSegments.deliveries,
    routeSegments.movements,
    routeSegments.billing,
    routeSegments.reports,
    routeSegments.products,
    routeSegments.inventory,
    routeSegments.expenses,
    routeSegments.employees,
    routeSegments.customers,
    routeSegments.suppliers,
    routeSegments.settings,
  ],
  retail: [
    routeSegments.sales,
    routeSegments.movements,
    routeSegments.billing,
    routeSegments.reports,
    routeSegments.inventory,
    routeSegments.quotes,
    routeSegments.employees,
    routeSegments.money,
    routeSegments.customers,
    routeSegments.suppliers,
    routeSegments.settings,
  ],
};

const visibleSegmentsByRole: Record<AppUserRole, string[]> = {
  OWNER: baseModuleNavigationRoutes.map((route) => route.segment),
  ADMIN: baseModuleNavigationRoutes.map((route) => route.segment),
  MANAGER: [
    routeSegments.dashboard,
    routeSegments.sales,
    routeSegments.deliveries,
    routeSegments.movements,
    routeSegments.billing,
    routeSegments.quotes,
    routeSegments.reports,
    routeSegments.inventory,
    routeSegments.products,
    routeSegments.expenses,
    routeSegments.employees,
    routeSegments.money,
    routeSegments.customers,
    routeSegments.suppliers,
  ],
  CASHIER: [
    routeSegments.dashboard,
    routeSegments.sales,
    routeSegments.deliveries,
    routeSegments.movements,
    routeSegments.billing,
    routeSegments.inventory,
    routeSegments.expenses,
    routeSegments.money,
    routeSegments.customers,
  ],
  SELLER: [
    routeSegments.dashboard,
    routeSegments.sales,
    routeSegments.billing,
    routeSegments.quotes,
    routeSegments.inventory,
    routeSegments.customers,
  ],
  ACCOUNTANT: [
    routeSegments.dashboard,
    routeSegments.movements,
    routeSegments.billing,
    routeSegments.reports,
    routeSegments.expenses,
    routeSegments.money,
    routeSegments.customers,
    routeSegments.suppliers,
  ],
  STAFF: [
    routeSegments.dashboard,
    routeSegments.sales,
    routeSegments.deliveries,
    routeSegments.inventory,
    routeSegments.customers,
  ],
};

const routeOverridesByPreset: Partial<
  Record<
    BusinessNavigationPreset,
    Partial<
      Record<
        AppLanguageCode,
        Partial<
          Record<string, Pick<AppRoute, "label" | "description" | "shortLabel">>
        >
      >
    >
  >
> = {
  restaurant: {
    es: {
      [routeSegments.sales]: {
        label: "Mesas",
        description:
          "Pedidos del salón, toma rápida y flujo principal de servicio.",
        shortLabel: "MS",
      },
      [routeSegments.deliveries]: {
        label: "Domicilios",
        description: "Pedidos para entrega y operación de despacho.",
        shortLabel: "DM",
      },
      [routeSegments.billing]: {
        label: "Facturación",
        description:
          "Comprobantes, cobros y seguimiento documental del servicio.",
        shortLabel: "FC",
      },
      [routeSegments.products]: {
        label: "Menú",
        description: "Carta, productos preparados y organización de la oferta.",
        shortLabel: "MN",
      },
    },
    en: {
      [routeSegments.sales]: {
        label: "Tables",
        description: "Dine-in orders, fast capture and the main service flow.",
        shortLabel: "TB",
      },
      [routeSegments.deliveries]: {
        label: "Deliveries",
        description: "Delivery orders and dispatch operations.",
        shortLabel: "DL",
      },
      [routeSegments.billing]: {
        label: "Billing",
        description: "Receipts, collections and service documentation.",
        shortLabel: "BL",
      },
      [routeSegments.products]: {
        label: "Menu",
        description: "Menu items, prepared products and offer management.",
        shortLabel: "MN",
      },
    },
  },
  retail: {
    es: {
      [routeSegments.sales]: {
        label: "Vender",
        description: "Ventas rápidas en caja para el mostrador del negocio.",
        shortLabel: "VN",
      },
      [routeSegments.movements]: {
        label: "Movimientos",
        description: "Caja diaria, ingresos, egresos y cierres.",
        shortLabel: "MV",
      },
      [routeSegments.billing]: {
        label: "Facturación",
        description: "Comprobantes, cobros y control documental.",
        shortLabel: "FC",
      },
      [routeSegments.reports]: {
        label: "Estadísticas",
        description: "Ventas, gastos y lectura operativa del negocio.",
        shortLabel: "ES",
      },
      [routeSegments.inventory]: {
        label: "Inventario",
        description: "Productos, stock y carga de catálogo.",
        shortLabel: "IV",
      },
      [routeSegments.quotes]: {
        label: "Cotizaciones",
        description: "Cotizaciones, estados y seguimiento comercial.",
        shortLabel: "CZ",
      },
      [routeSegments.employees]: {
        label: "Empleados",
        description: "Equipo, roles y accesos del negocio.",
        shortLabel: "EM",
      },
      [routeSegments.money]: {
        label: "Mi dinero",
        description: "Cobros, datáfono y soluciones financieras.",
        shortLabel: "MD",
      },
    },
    en: {
      [routeSegments.sales]: {
        label: "Sell",
        description: "Fast point-of-sale workflow for the storefront.",
        shortLabel: "SL",
      },
      [routeSegments.movements]: {
        label: "Movements",
        description: "Daily cash register, income, expenses and closures.",
        shortLabel: "MV",
      },
      [routeSegments.billing]: {
        label: "Billing",
        description: "Receipts, collections and document control.",
        shortLabel: "BL",
      },
      [routeSegments.reports]: {
        label: "Analytics",
        description: "Sales, expenses and operational business reading.",
        shortLabel: "AN",
      },
      [routeSegments.inventory]: {
        label: "Inventory",
        description: "Products, stock and catalog loading.",
        shortLabel: "IV",
      },
      [routeSegments.quotes]: {
        label: "Quotes",
        description: "Quotes, statuses and commercial follow-up.",
        shortLabel: "QT",
      },
      [routeSegments.employees]: {
        label: "Employees",
        description: "Team, roles and access management.",
        shortLabel: "EM",
      },
      [routeSegments.money]: {
        label: "My money",
        description: "Collections, card reader and financial tools.",
        shortLabel: "MY",
      },
    },
  },
};

function getRouteCopy(
  route: BaseRoute,
  languageCode: AppLanguageCode,
  preset: BusinessNavigationPreset,
) {
  const dictionary = appDictionary[languageCode];
  const defaultCopy =
    dictionary.layout.routes[
      route.segment as keyof typeof dictionary.layout.routes
    ];
  const override =
    routeOverridesByPreset[preset]?.[languageCode]?.[route.segment];

  return {
    label: override?.label ?? defaultCopy.label,
    description: override?.description ?? defaultCopy.description,
    shortLabel: override?.shortLabel ?? route.shortLabel,
  };
}

function getRouteChildren(
  route: BaseRoute,
  languageCode: AppLanguageCode,
  preset: BusinessNavigationPreset,
) {
  if (preset !== "restaurant" || route.segment !== routeSegments.products) {
    return undefined;
  }

  if (languageCode === "es") {
    return [
      {
        label: "Carta",
        path: routePaths.products,
      },
      {
        label: "Adiciones / Modificadores",
        isDisabled: true,
      },
    ];
  }

  return [
    {
      label: "Menu catalog",
      path: routePaths.products,
    },
    {
      label: "Add-ons / modifiers",
      isDisabled: true,
    },
  ];
}

export function getModuleNavigationRoutes(
  languageCode: AppLanguageCode,
  businessCategory?: string | null,
  role?: AppUserRole | null,
): AppRoute[] {
  const preset = getBusinessNavigationPreset(businessCategory);
  const visibleSegments = new Set(visibleSegmentsByPreset[preset]);
  const roleVisibleSegments = role
    ? new Set(visibleSegmentsByRole[role])
    : undefined;

  return baseModuleNavigationRoutes.map((route) => ({
    ...route,
    ...getRouteCopy(route, languageCode, preset),
    children: getRouteChildren(route, languageCode, preset),
    isVisible:
      visibleSegments.has(route.segment) &&
      (roleVisibleSegments ? roleVisibleSegments.has(route.segment) : true),
  }));
}

export function getModuleLandingPath(
  languageCode: AppLanguageCode,
  businessCategory?: string | null,
  role?: AppUserRole | null,
) {
  const routes = getModuleNavigationRoutes(
    languageCode,
    businessCategory,
    role,
  );
  const firstBusinessRoute = routes.find(
    (route) => route.group === "business" && route.isVisible,
  );

  return firstBusinessRoute?.path ?? routePaths.dashboard;
}
