import type { BusinessCategoryOption } from "@/shared/constants/business-categories";

export type AppLanguageCode = "es" | "en";

const stateDictionary = {
  es: {
    modulePlaceholder: {
      badge: "Módulo listo",
    },
    notFound: {
      title: "Ruta no encontrada",
      description:
        "Esta ruta está fuera del mapa actual de módulos. La base del sistema está lista, pero esta pantalla todavía no existe.",
      action: "Volver al resumen",
    },
    routeLoading: {
      auth: {
        title: "Cargando acceso",
        description: "Preparando el ingreso y las protecciones de sesión.",
      },
      dashboard: {
        title: "Cargando resumen",
        description:
          "Preparando métricas clave, ingresos y alertas de inventario.",
      },
      products: {
        title: "Cargando productos",
        description:
          "Preparando el catálogo, la edición y la carga de inventario.",
      },
      inventory: {
        title: "Cargando inventario",
        description:
          "Preparando movimientos, filtros y controles de ajuste.",
      },
      sales: {
        title: "Cargando ventas",
        description: "Preparando la caja rápida y el flujo del carrito.",
      },
      deliveries: {
        title: "Cargando domicilios",
        description:
          "Preparando pedidos para entrega y operaciones de despacho.",
        action: "Ir a ventas",
      },
      movements: {
        title: "Cargando movimientos",
        description: "Preparando la caja diaria y el flujo de arqueo.",
      },
      billing: {
        title: "Cargando facturación",
        description:
          "Preparando comprobantes, cobros y control documental.",
        action: "Ir a movimientos",
      },
      quotes: {
        title: "Cargando cotizaciones",
        description: "Preparando seguimiento comercial y cotizaciones.",
      },
      expenses: {
        title: "Cargando gastos",
        description:
          "Preparando el módulo de gastos y sus controles financieros.",
      },
      customers: {
        title: "Cargando clientes",
        description: "Preparando CRM, saldos e historial de compras.",
      },
      suppliers: {
        title: "Cargando proveedores",
        description: "Preparando abastecimiento e historial del proveedor.",
      },
      employees: {
        title: "Cargando empleados",
        description: "Preparando el equipo, accesos y permisos.",
      },
      money: {
        title: "Cargando mi dinero",
        description: "Preparando cobros y herramientas financieras.",
      },
      reports: {
        title: "Cargando estadísticas",
        description:
          "Preparando reportes, gráficas e indicadores del negocio.",
      },
      settings: {
        title: "Cargando configuraciones",
        description: "Preparando negocio, impuestos y usuarios.",
      },
    },
  },
  en: {
    modulePlaceholder: {
      badge: "Module ready",
    },
    notFound: {
      title: "Route not found",
      description:
        "This route is outside the current module map. The system foundation is ready, but this screen does not exist yet.",
      action: "Back to overview",
    },
    routeLoading: {
      auth: {
        title: "Loading access",
        description: "Preparing sign-in and session protection.",
      },
      dashboard: {
        title: "Loading overview",
        description:
          "Preparing key metrics, revenue insights and inventory alerts.",
      },
      products: {
        title: "Loading products",
        description:
          "Preparing the catalog, editing tools and inventory upload.",
      },
      inventory: {
        title: "Loading inventory",
        description:
          "Preparing stock movements, filters and adjustment controls.",
      },
      sales: {
        title: "Loading sales",
        description: "Preparing checkout and cart flow.",
      },
      deliveries: {
        title: "Loading deliveries",
        description:
          "Preparing delivery orders and dispatch operations.",
        action: "Go to sales",
      },
      movements: {
        title: "Loading movements",
        description: "Preparing daily cash flow and reconciliation.",
      },
      billing: {
        title: "Loading billing",
        description:
          "Preparing receipts, collections and document control.",
        action: "Go to movements",
      },
      quotes: {
        title: "Loading quotes",
        description: "Preparing quote tracking and follow-up.",
      },
      expenses: {
        title: "Loading expenses",
        description:
          "Preparing the expenses workspace and financial controls.",
      },
      customers: {
        title: "Loading customers",
        description:
          "Preparing CRM balances and purchase history.",
      },
      suppliers: {
        title: "Loading suppliers",
        description: "Preparing procurement and supplier history.",
      },
      employees: {
        title: "Loading employees",
        description: "Preparing team access, roles and permissions.",
      },
      money: {
        title: "Loading my money",
        description: "Preparing collections and financial tools.",
      },
      reports: {
        title: "Loading reports",
        description:
          "Preparing reports, charts and business indicators.",
      },
      settings: {
        title: "Loading settings",
        description: "Preparing business setup, taxes and users.",
      },
    },
  },
} as const;

const moduleDictionary = {
  es: {
    shared: {
      defaultWorkspaceDescription:
        "Centro operativo listo para trabajar con tu negocio.",
    },
    dashboard: {
      page: {
        eyebrow: "Resumen del negocio",
        title:
          "Una lectura clara del negocio para empezar el día con contexto.",
        description:
          "Mira qué se está vendiendo, cuánto dinero entra y qué productos necesitan atención antes de quedarte sin stock.",
        refresh: "Actualizar resumen",
        refreshing: "Actualizando resumen...",
        newSale: "Nueva venta",
        viewProducts: "Ver productos",
        spotlightLabel: "Producto destacado",
        spotlightWaiting: "Esperando ventas",
        spotlightEmpty:
          "Cuando empiecen a entrar ventas, aquí verás el producto más fuerte del momento.",
        topSellerUnitsSuffix: "vendidas hasta ahora.",
        metricSalesLabel: "Ventas de hoy",
        metricSalesHint:
          "Cantidad de ventas registradas desde que comenzó el día.",
        metricRevenueLabel: "Ingresos totales",
        metricRevenueHint:
          "Ingresos acumulados registrados por el sistema.",
        metricTopSellerLabel: "Más vendido",
        metricTopSellerHintEmpty: "Todavía no se han vendido productos.",
        metricTopSellerValueEmpty: "Sin datos",
        metricAlertsLabel: "Alertas de stock",
        metricAlertsHintEmpty:
          "Las alertas de inventario están bajo control.",
        loadErrorTitle: "No pudimos cargar el resumen",
        loadErrorFallback:
          "No pudimos cargar el resumen del negocio en este momento. Intenta otra vez.",
      },
      panels: {
        bestSelling: {
          eyebrow: "Más vendidos",
          title: "Productos con mejor salida hoy",
          description:
            "Usa esta lista para detectar qué se está vendiendo mejor y decidir qué reponer o impulsar después.",
          emptyTitle: "Todavía no hay destacados",
          emptyDescription:
            "En cuanto entren ventas, aquí aparecerán los productos más fuertes.",
          unitSingular: "unidad vendida",
          unitPlural: "unidades vendidas",
        },
        inventoryAlerts: {
          eyebrow: "Alertas de inventario",
          title: "Productos con stock bajo para vigilar",
          description:
            "Estos productos se están acercando al mínimo o ya necesitan reposición.",
          link: "Ver productos",
          emptyTitle: "El inventario se ve saludable",
          emptyDescription:
            "No hay alertas de stock bajo en este momento.",
          productPrefix: "Producto",
          availableSuffix: "disponibles",
        },
      },
    },
    customers: {
      page: {
        retail: {
          create: "Crear cliente",
          premiumTitle: "¡Ups! Ya no puedes crear más clientes.",
          premiumDescription:
            "Desbloquea la función premium, accede a toda la información y sigue creciendo sin límites.",
          premiumLink: "Ver beneficios",
          searchPlaceholder: "Busca un cliente",
          totalCustomers: "Total clientes",
          totalOutstanding: "Total por cobrar",
          noPhone: "Sin celular",
          noDocument: "Sin documento",
          detail: "Detalle",
          noResults: "No encontramos clientes con esa búsqueda.",
        },
        workspace: {
          eyebrow: "CRM del negocio",
          title:
            "Mira todo el contexto del cliente sin salir de una sola pantalla.",
          description:
            "Revisa saldos pendientes, abre la ficha del cliente y mira su historial de compras en un flujo ligero para el día a día.",
          refresh: "Actualizar CRM",
          clearSearch: "Limpiar búsqueda",
          metricCountLabel: "Clientes",
          metricCountHint:
            "Total de clientes disponibles actualmente en el CRM.",
          metricBalanceLabel: "Saldo pendiente",
          metricBalanceHint:
            "Saldo por cobrar consolidado entre todas las cuentas de cliente.",
          metricFollowUpLabel: "Requieren seguimiento",
          metricFollowUpHintPrefix:
            "Ventas registradas en historial:",
          loadCustomersFallback:
            "No pudimos cargar los clientes en este momento. Intenta otra vez.",
          loadProfileFallback:
            "No pudimos cargar este perfil de cliente en este momento.",
        },
      },
      list: {
        eyebrow: "Directorio de clientes",
        title:
          "Mantén visibles saldos, contexto de contacto y actividad reciente.",
        refreshing: "Actualizando...",
        visibleCountSuffix: "visibles",
        totalCountSuffix: "total",
        searchLabel: "Buscar clientes",
        searchPlaceholder: "Busca por nombre, correo o teléfono",
        loadErrorTitle: "No pudimos cargar los clientes",
        loadingTitle: "Cargando clientes...",
        loadingDescription:
          "Trayendo datos del CRM y saldos desde el servidor.",
        emptyTitle: "No hay clientes con esa búsqueda",
        emptyDescription:
          "Prueba otro nombre, teléfono o correo para ver más registros.",
        noContact: "Sin información de contacto",
        purchasesLabel: "Compras",
        lastPurchaseLabel: "Última compra",
        noPurchases: "Sin compras todavía",
      },
      detail: {
        eyebrow: "Perfil del cliente",
        selectPrompt: "Selecciona un cliente",
        outstanding: "Con saldo",
        upToDate: "Al día",
        loadErrorTitle: "No pudimos cargar el perfil del cliente",
        loadingTitle: "Cargando cliente...",
        loadingDescription:
          "Trayendo historial de compras, contacto y saldo.",
        emptyTitle: "Elige un cliente para ver el detalle",
        emptyDescription:
          "Selecciona un cliente del directorio para revelar su contexto y actividad reciente.",
        balanceLabel: "Saldo pendiente",
        balanceHintDue:
          "Este cliente tiene un saldo pendiente por hacer seguimiento.",
        balanceHintClear:
          "Este cliente no tiene saldo pendiente en este momento.",
        email: "Correo",
        phone: "Teléfono",
        purchaseCount: "Número de compras",
        lastPurchase: "Última compra",
        created: "Creado",
        updated: "Actualizado",
        notRegistered: "No registrado",
        noPurchases: "Sin compras todavía",
      },
      history: {
        eyebrow: "Historial de compras",
        recentSales: "Ventas recientes",
        saleSingular: "venta",
        salePlural: "ventas",
        loadingTitle: "Cargando historial...",
        loadingDescription:
          "Trayendo la línea de tiempo de ventas y montos del cliente.",
        emptyTitle: "Todavía no hay historial de compras",
        emptyDescription:
          "Cuando este cliente complete ventas, aparecerán aquí con sus totales e ítems.",
        salePrefix: "Venta",
        itemsSingular: "ítem",
        itemsPlural: "ítems",
        timelineLabel: "Registrada en la línea de tiempo del CRM",
      },
    },
    suppliers: {
      page: {
        retail: {
          create: "Crear proveedor",
          premiumTitle: "¡Ups! Ya no puedes crear más proveedores.",
          premiumDescription:
            "Desbloquea la función premium, accede a toda la información y sigue creciendo sin límites.",
          premiumLink: "Ver beneficios",
          searchPlaceholder: "Busca un proveedor",
          totalSuppliers: "Total proveedores",
          totalPayable: "Total por pagar",
          noPhone: "Sin celular",
          noDocument: "Sin documento",
          detail: "Detalle",
          noResults: "No encontramos proveedores con esa búsqueda.",
        },
        workspace: {
          eyebrow: "Compras y abastecimiento",
          title:
            "Mantén proveedores y reposiciones bajo una sola vista clara.",
          description:
            "Revisa contactos, abre el detalle del proveedor y entiende el historial de abastecimiento desde un flujo pensado para la operación diaria.",
          refresh: "Actualizar proveedores",
          clearSearch: "Limpiar búsqueda",
          metricSuppliersLabel: "Proveedores",
          metricSuppliersHint:
            "Total de contactos de abastecimiento disponibles en el directorio.",
          metricActiveLabel: "Activos",
          metricActiveHintPrefix:
            "Reposiciones registradas entre proveedores:",
          metricVolumeLabel: "Volumen seleccionado",
          metricVolumeHint:
            "Valor acumulado de compras para el proveedor en foco.",
          loadSuppliersFallback:
            "No pudimos cargar los proveedores en este momento. Intenta otra vez.",
          loadProfileFallback:
            "No pudimos cargar este proveedor en este momento. Intenta otra vez.",
        },
      },
      list: {
        eyebrow: "Directorio de proveedores",
        title:
          "Mantén visibles los contactos y el historial de abastecimiento.",
        refreshing: "Actualizando...",
        visibleCountSuffix: "visibles",
        totalCountSuffix: "total",
        searchLabel: "Buscar proveedores",
        searchPlaceholder: "Busca por nombre, correo o teléfono",
        loadErrorTitle: "No pudimos cargar los proveedores",
        loadingTitle: "Cargando proveedores...",
        loadingDescription:
          "Trayendo contactos y señales de abastecimiento desde el servidor.",
        emptyTitle: "No hay proveedores con esa búsqueda",
        emptyDescription:
          "Prueba otro nombre, teléfono o correo para ver más registros.",
        noContact: "Sin información de contacto",
        restocksSuffix: "reposiciones",
        newSupplier: "Proveedor nuevo",
        lastRestock: "Último abastecimiento",
        noHistory: "Sin historial",
      },
      detail: {
        eyebrow: "Perfil del proveedor",
        selectPrompt: "Selecciona un proveedor",
        active: "Abastecimiento activo",
        noHistory: "Sin historial",
        loadErrorTitle: "No pudimos cargar el proveedor",
        loadingTitle: "Cargando proveedor...",
        loadingDescription:
          "Trayendo historial de abastecimiento, contacto y contexto de compras.",
        emptyTitle: "Elige un proveedor para ver el detalle",
        emptyDescription:
          "Selecciona un proveedor del directorio para ver el contacto y su contexto de abastecimiento.",
        volumeLabel: "Volumen comprado",
        volumeHint:
          "Valor total de abastecimiento registrado para este proveedor.",
        averageLabel: "Reposición promedio",
        averageHint:
          "Ticket promedio de compra en el historial del proveedor.",
        email: "Correo",
        phone: "Teléfono",
        purchaseCount: "Número de reposiciones",
        lastPurchase: "Último abastecimiento",
        created: "Creado",
        updated: "Actualizado",
        notRegistered: "No registrado",
      },
      history: {
        eyebrow: "Historial de abastecimiento",
        timeline: "Línea de reposición",
        entrySingular: "registro",
        entryPlural: "registros",
        loadingTitle: "Cargando historial...",
        loadingDescription:
          "Trayendo registros de compras y totales de reposición.",
        emptyTitle: "Todavía no hay historial de abastecimiento",
        emptyDescription:
          "Cuando este proveedor se use en compras, la línea de tiempo aparecerá aquí.",
        restockPrefix: "Reposición",
        procurementRecord: "Registro de compra",
        supplyTimeline: "Línea de tiempo de abastecimiento",
      },
    },
    employees: {
      page: {
        restrictedEyebrow: "Acceso de gestión requerido",
        restrictedTitle:
          "El espacio de empleados está reservado para administradores y gerentes.",
        restrictedDescription:
          "Inicia sesión con una cuenta que pueda crear, editar o revocar accesos del equipo.",
        confirmDeletePrefix: "¿Eliminar a",
        confirmDeleteSuffix: "de este negocio?",
        retailCreate: "Crear empleado",
        retailPremiumTitle: "¡Ups! Ya no puedes crear más empleados.",
        retailPremiumDescription:
          "Desbloquea la función premium, accede a toda la información y sigue creciendo sin límites.",
        retailPremiumLink: "Ver beneficios",
        retailNoPhone: "Sin celular",
        retailActive: "Activo",
        retailPending: "Pendiente",
        retailEdit: "Editar",
        retailNoResults: "No encontramos empleados con ese criterio.",
        heroEyebrow: "Gestión del equipo",
        heroTitle:
          "Organiza tu equipo con accesos rápidos y roles claros.",
        heroDescription:
          "Crea empleados, asigna el rol operativo correcto y revisa quién ya activó su acceso desde una sola vista.",
        newEmployee: "Nuevo empleado",
        refreshTeam: "Actualizar equipo",
        metricSizeLabel: "Tamaño del equipo",
        metricSizeHint:
          "Empleados asignados actualmente al negocio activo.",
        metricActiveLabel: "Accesos activos",
        metricActiveHint:
          "Personas que ya iniciaron sesión con su acceso asignado.",
        metricPendingLabel: "Pendientes",
        metricPendingHint:
          "Empleados que aún esperan su primer ingreso.",
        metricPhoneLabel: "Falta teléfono",
        metricPhoneHint:
          "Perfiles que todavía necesitan teléfono para poder entrar.",
        loadTeamFallback:
          "No pudimos cargar el equipo en este momento. Intenta otra vez.",
      },
      roster: {
        eyebrow: "Directorio del equipo",
        title: "Crea y administra tu equipo",
        description:
          "Mantén un directorio claro con teléfono de acceso, estado de activación y permisos según el rol.",
        refreshing: "Actualizando...",
        create: "Crear empleado",
        searchLabel: "Buscar empleados",
        searchPlaceholder: "Busca por nombre, teléfono, correo o rol",
        loadErrorTitle: "No pudimos cargar tu equipo",
        loadingTitle: "Cargando empleados...",
        loadingDescription:
          "Trayendo roles, accesos y estado de activación del negocio.",
        emptyTitle: "Todavía no tienes empleados",
        emptyDescription:
          "Empieza creando el primer empleado y asignándole el rol operativo que mejor encaje.",
        tableEmployee: "Empleado",
        tableAccess: "Acceso",
        tableRole: "Rol",
        tableStatus: "Estado",
        tableActions: "Acciones",
        createdPrefix: "Creado",
        phoneMissing: "Teléfono no configurado",
        lastLoginPrefix: "Último ingreso",
        noLoginYet: "Aún no ha iniciado sesión",
        delete: "Eliminar",
      },
      form: {
        createEyebrow: "Nuevo empleado",
        editEyebrow: "Editar empleado",
        createTitle: "Invita a un nuevo miembro del equipo",
        description:
          "Configura quién es esta persona, cómo entra al sistema y qué permisos encajan mejor con su rol.",
        createAnother: "Crear otro",
        clear: "Limpiar formulario",
        name: "Nombre del empleado",
        phone: "Teléfono de acceso",
        role: "Rol operativo",
        email: "Correo (opcional)",
        emailPlaceholder:
          "Opcional. Si lo omites, Cashgo crea un correo interno.",
        passwordCreate: "Código temporal de acceso",
        passwordEdit: "Nuevo código temporal (opcional)",
        passwordPlaceholder: "Mínimo 8 caracteres",
        missingPassword: "El código temporal de acceso es obligatorio.",
        confirmTitle: "Confirma la configuración",
        confirmDescriptionPrefix: "Esta persona usará",
        confirmDescriptionFallback: "el teléfono configurado",
        confirmDescriptionSuffix:
          "como identificador principal de ingreso. Verifícalo antes de guardar.",
        recommendedEyebrow: "Perfil recomendado",
        helperCreate:
          "Los nuevos empleados aparecerán en la lista apenas guardes.",
        helperEdit:
          "Usa esta edición para mantener actualizado el equipo.",
        savingCreate: "Creando empleado...",
        savingEdit: "Guardando empleado...",
        submitCreate: "Crear empleado",
        submitEdit: "Guardar empleado",
        genericError:
          "No pudimos guardar el empleado en este momento. Intenta otra vez.",
      },
    },
    quotes: {
      create: "Crear cotización",
      premiumTitle: "Llegaste a una función premium.",
      premiumDescription:
        "Activa el plan pro, accede a toda la información y sigue creciendo sin límites.",
      premiumLink: "Ver beneficios",
      emptyTitle: "Todavía no hay cotizaciones en esta cuenta.",
      emptyDescription:
        "Cuando actives esta función podrás registrar cotizaciones, filtrar por cliente y revisar su estado desde esta misma vista.",
      table: {
        name: "Nombre",
        phone: "Celular",
        concept: "Concepto",
        status: "Estado",
        balance: "Total por cobrar",
        view: "Ver",
      },
    },
    money: {
      title: "Mi dinero",
      description:
        "Adquiere tu datáfono Cashgo y recibe el dinero de tus ventas de forma segura, práctica y alineada a la operación de tu negocio.",
      advisor: "Hablar con un asesor",
      device: "Quiero mi datáfono",
    },
    expenses: {
      page: {
        confirmDeletePrefix: '¿Quieres cancelar el gasto "',
        confirmDeleteSuffix: '"?',
        eyebrow: "Gastos",
        title:
          "Controla y clasifica cada salida de dinero en una sola vista.",
        description:
          "Registra egresos, sepáralos por categoría, detecta pendientes y deja lista la base para reportes y flujo de caja diario.",
        refresh: "Actualizar",
        newExpense: "Nuevo gasto",
        metricTotalLabel: "Salida total",
        metricTotalHint:
          "Suma total de los gastos visibles con los filtros actuales.",
        metricPaidLabel: "Pagados",
        metricPaidHint:
          "Gastos ya pagados y listos para reflejar operación o caja.",
        metricPendingLabel: "Pendientes",
        metricPendingHint:
          "Compromisos pendientes por desembolsar o cerrar.",
        metricCategoriesLabel: "Categorías en uso",
        metricCategoriesHintPrefix: "movimientos visibles en este momento.",
        metricCategoriesHintEmpty:
          "Crea categorías para leer mejor tus egresos.",
        loadErrorFallback:
          "No pudimos cargar el módulo de gastos en este momento.",
        loadExpensesFallback:
          "No pudimos cargar los gastos del negocio activo.",
      },
      filters: {
        eyebrow: "Filtros rápidos",
        title: "Busca por concepto, estado o fecha",
        clear: "Limpiar",
        concept: "Concepto",
        conceptPlaceholder:
          "Buscar arriendo, transporte, servicios...",
        status: "Estado",
        category: "Categoría",
        from: "Desde",
        to: "Hasta",
        all: "Todos",
        paid: "Pagados",
        pending: "Pendientes",
        cancelled: "Cancelados",
        allCategories: "Todas las categorías",
      },
      form: {
        createEyebrow: "Nuevo gasto",
        editEyebrow: "Editar gasto",
        createTitle: "Registra un nuevo egreso",
        description:
          "Guarda concepto, categoría, método de pago y estado para mantener caja, reportes y clasificación financiera alineados.",
        createAnother: "Crear otro",
        clear: "Limpiar",
        concept: "Concepto",
        conceptPlaceholder: "Arriendo del local",
        category: "Categoría",
        uncategorized: "Sin categoría",
        amount: "Valor",
        paymentMethod: "Método de pago",
        status: "Estado",
        expenseDate: "Fecha del gasto",
        notes: "Notas",
        notesPlaceholder:
          "Detalle adicional para auditoría, proveedor o contexto del pago.",
        helperCash:
          "Si hay una caja abierta, este gasto impactará automáticamente el arqueo diario.",
        footerHint:
          "Usa categorías claras para que reportes y flujo de caja sean más útiles después.",
        saving: "Guardando...",
        creating: "Creando...",
        save: "Guardar cambios",
        create: "Crear gasto",
        genericError: "No pudimos guardar el gasto en este momento.",
      },
      categories: {
        eyebrow: "Clasificación",
        title: "Categorías activas",
        description:
          "Define grupos simples para separar operación, transporte, servicios, nómina o cualquier gasto recurrente de tu negocio.",
        expenseSingular: "gasto",
        expensePlural: "gastos",
        createTitle: "Nueva categoría",
        createDescription:
          "Úsala para clasificar egresos y enriquecer reportes.",
        name: "Nombre",
        namePlaceholder: "Arriendo",
        color: "Color",
        create: "Crear categoría",
        creating: "Creando...",
        genericError:
          "No pudimos crear la categoría en este momento.",
      },
      table: {
        eyebrow: "Movimientos de salida",
        title: "Gastos registrados",
        description:
          "Selecciona un gasto para editarlo, revisar cómo fue pagado o depurar registros manuales.",
        recordsSuffix: "registros",
        refreshing: "Actualizando...",
        loadErrorTitle: "No pudimos cargar los gastos.",
        loadingTitle: "Cargando gastos...",
        loadingDescription:
          "Estamos trayendo los últimos movimientos y categorías desde tu negocio activo.",
        emptyTitle: "Todavía no hay gastos visibles.",
        emptyDescription:
          "Crea el primer gasto para empezar a clasificar egresos y alimentar reportes, caja y flujo de efectivo.",
        uncategorized: "Sin categoría",
        concept: "Concepto",
        category: "Categoría",
        amount: "Valor",
        method: "Método",
        date: "Fecha",
        status: "Estado",
        actions: "Acciones",
        createdPrefix: "Creado",
        delete: "Eliminar",
      },
    },
  },
  en: {
    shared: {
      defaultWorkspaceDescription:
        "Your operations workspace is ready to work with your business.",
    },
    dashboard: {
      page: {
        eyebrow: "Business overview",
        title: "A clear business read so you can start the day with context.",
        description:
          "See what is selling, how much money is coming in, and which products need attention before you run out of stock.",
        refresh: "Refresh overview",
        refreshing: "Refreshing overview...",
        newSale: "New sale",
        viewProducts: "View products",
        spotlightLabel: "Top product",
        spotlightWaiting: "Waiting for sales",
        spotlightEmpty:
          "Once sales start coming in, you will see the strongest product here.",
        topSellerUnitsSuffix: "sold so far.",
        metricSalesLabel: "Today's sales",
        metricSalesHint: "Sales recorded since the day started.",
        metricRevenueLabel: "Total revenue",
        metricRevenueHint: "Accumulated revenue recorded by the system.",
        metricTopSellerLabel: "Top seller",
        metricTopSellerHintEmpty: "No products have been sold yet.",
        metricTopSellerValueEmpty: "No data",
        metricAlertsLabel: "Stock alerts",
        metricAlertsHintEmpty: "Inventory alerts are under control.",
        loadErrorTitle: "We could not load the overview",
        loadErrorFallback:
          "We could not load the business overview right now. Please try again.",
      },
      panels: {
        bestSelling: {
          eyebrow: "Best sellers",
          title: "Products moving the most today",
          description:
            "Use this list to spot what is selling best and decide what to restock or push next.",
          emptyTitle: "No highlights yet",
          emptyDescription:
            "As soon as sales come in, the strongest products will appear here.",
          unitSingular: "unit sold",
          unitPlural: "units sold",
        },
        inventoryAlerts: {
          eyebrow: "Inventory alerts",
          title: "Low-stock products to watch",
          description:
            "These products are getting close to the minimum or already need replenishment.",
          link: "View products",
          emptyTitle: "Inventory looks healthy",
          emptyDescription: "There are no low-stock alerts right now.",
          productPrefix: "Product",
          availableSuffix: "available",
        },
      },
    },
    customers: {
      page: {
        retail: {
          create: "Create customer",
          premiumTitle: "Oops! You cannot create more customers.",
          premiumDescription:
            "Unlock the premium feature, access more information and keep growing without limits.",
          premiumLink: "View benefits",
          searchPlaceholder: "Search a customer",
          totalCustomers: "Total customers",
          totalOutstanding: "Total outstanding",
          noPhone: "No phone",
          noDocument: "No document",
          detail: "Details",
          noResults: "No customers match that search.",
        },
        workspace: {
          eyebrow: "Business CRM",
          title: "See the full customer context without leaving one screen.",
          description:
            "Review outstanding balances, open customer profiles and scan purchase history in a lightweight daily workflow.",
          refresh: "Refresh CRM",
          clearSearch: "Clear search",
          metricCountLabel: "Customers",
          metricCountHint: "Customers currently available in the CRM.",
          metricBalanceLabel: "Outstanding balance",
          metricBalanceHint:
            "Consolidated receivable balance across all customer accounts.",
          metricFollowUpLabel: "Need follow-up",
          metricFollowUpHintPrefix: "Sales recorded in history:",
          loadCustomersFallback:
            "We could not load customers right now. Please try again.",
          loadProfileFallback:
            "We could not load this customer profile right now.",
        },
      },
      list: {
        eyebrow: "Customer directory",
        title:
          "Keep balances, contact context and recent activity in one place.",
        refreshing: "Refreshing...",
        visibleCountSuffix: "visible",
        totalCountSuffix: "total",
        searchLabel: "Search customers",
        searchPlaceholder: "Search by name, email or phone",
        loadErrorTitle: "Unable to load customers",
        loadingTitle: "Loading customer records...",
        loadingDescription:
          "Pulling CRM data and balances from the server.",
        emptyTitle: "No customers match the current search",
        emptyDescription:
          "Try another name, phone number or email to reveal more records.",
        noContact: "No contact information yet",
        purchasesLabel: "Purchases",
        lastPurchaseLabel: "Last purchase",
        noPurchases: "No purchases yet",
      },
      detail: {
        eyebrow: "Customer profile",
        selectPrompt: "Select a customer",
        outstanding: "Outstanding",
        upToDate: "Up to date",
        loadErrorTitle: "Unable to load the customer profile",
        loadingTitle: "Loading customer profile...",
        loadingDescription:
          "Bringing in purchase history, contact details and balance data.",
        emptyTitle: "Choose a customer to inspect the record",
        emptyDescription:
          "Select someone from the directory to reveal CRM context and recent purchase activity.",
        balanceLabel: "Outstanding balance",
        balanceHintDue:
          "This customer currently has an unpaid balance to follow up on.",
        balanceHintClear:
          "This customer has no pending balance right now.",
        email: "Email",
        phone: "Phone",
        purchaseCount: "Purchase count",
        lastPurchase: "Last purchase",
        created: "Created",
        updated: "Updated",
        notRegistered: "Not registered",
        noPurchases: "No purchases yet",
      },
      history: {
        eyebrow: "Purchase history",
        recentSales: "Recent sales",
        saleSingular: "sale",
        salePlural: "sales",
        loadingTitle: "Loading purchase history...",
        loadingDescription:
          "Fetching this customer's sales timeline and totals.",
        emptyTitle: "No purchase history yet",
        emptyDescription:
          "Once this customer completes sales, they will appear here with totals and item counts.",
        salePrefix: "Sale",
        itemsSingular: "item",
        itemsPlural: "items",
        timelineLabel: "Recorded in the CRM timeline",
      },
    },
    suppliers: {
      page: {
        retail: {
          create: "Create supplier",
          premiumTitle: "Oops! You cannot create more suppliers.",
          premiumDescription:
            "Unlock the premium feature, access more information and keep growing without limits.",
          premiumLink: "View benefits",
          searchPlaceholder: "Search a supplier",
          totalSuppliers: "Total suppliers",
          totalPayable: "Total payable",
          noPhone: "No phone",
          noDocument: "No document",
          detail: "Details",
          noResults: "No suppliers match that search.",
        },
        workspace: {
          eyebrow: "Procurement workspace",
          title:
            "Keep supplier relationships and replenishment history in one calm view.",
          description:
            "Review supplier contacts, open procurement details and scan replenishment history from a clean workspace built for daily operations.",
          refresh: "Refresh suppliers",
          clearSearch: "Clear search",
          metricSuppliersLabel: "Suppliers",
          metricSuppliersHint:
            "Procurement contacts currently available in the directory.",
          metricActiveLabel: "Active",
          metricActiveHintPrefix:
            "Replenishment entries tracked across suppliers:",
          metricVolumeLabel: "Selected volume",
          metricVolumeHint:
            "Accumulated procurement value for the supplier currently in focus.",
          loadSuppliersFallback:
            "Unable to load supplier records right now. Please try again.",
          loadProfileFallback:
            "Unable to load this supplier profile right now. Please try again.",
        },
      },
      list: {
        eyebrow: "Supplier directory",
        title:
          "Keep contacts and replenishment history visible.",
        refreshing: "Refreshing...",
        visibleCountSuffix: "visible",
        totalCountSuffix: "total",
        searchLabel: "Search suppliers",
        searchPlaceholder: "Search by name, email or phone",
        loadErrorTitle: "Unable to load suppliers",
        loadingTitle: "Loading suppliers...",
        loadingDescription:
          "Fetching contacts and procurement signals from the server.",
        emptyTitle: "No suppliers match the current search",
        emptyDescription:
          "Try another name, phone number or email to reveal more records.",
        noContact: "No contact information yet",
        restocksSuffix: "restocks",
        newSupplier: "New supplier",
        lastRestock: "Last restock",
        noHistory: "No history",
      },
      detail: {
        eyebrow: "Supplier profile",
        selectPrompt: "Select a supplier",
        active: "Active procurement",
        noHistory: "No history",
        loadErrorTitle: "Unable to load supplier profile",
        loadingTitle: "Loading supplier...",
        loadingDescription:
          "Fetching procurement history, contact details and purchase context.",
        emptyTitle: "Choose a supplier to inspect the record",
        emptyDescription:
          "Select a supplier from the directory to reveal contact context and replenishment history.",
        volumeLabel: "Purchased volume",
        volumeHint:
          "Total procurement value recorded for this supplier.",
        averageLabel: "Average restock",
        averageHint:
          "Average purchase ticket across this supplier's history.",
        email: "Email",
        phone: "Phone",
        purchaseCount: "Restock count",
        lastPurchase: "Last restock",
        created: "Created",
        updated: "Updated",
        notRegistered: "Not registered",
      },
      history: {
        eyebrow: "Supply history",
        timeline: "Replenishment timeline",
        entrySingular: "entry",
        entryPlural: "entries",
        loadingTitle: "Loading supply history...",
        loadingDescription:
          "Fetching procurement records and replenishment totals.",
        emptyTitle: "No replenishment history yet",
        emptyDescription:
          "Once this supplier is used for procurement, the timeline will appear here.",
        restockPrefix: "Restock",
        procurementRecord: "Procurement record",
        supplyTimeline: "Supply chain timeline",
      },
    },
    employees: {
      page: {
        restrictedEyebrow: "Management access required",
        restrictedTitle:
          "The employees workspace is reserved for administrators and managers.",
        restrictedDescription:
          "Sign in with an account that can create, edit or revoke team access.",
        confirmDeletePrefix: "Delete",
        confirmDeleteSuffix: "from this business?",
        retailCreate: "Create employee",
        retailPremiumTitle: "Oops! You cannot create more employees.",
        retailPremiumDescription:
          "Unlock the premium feature, access more information and keep growing without limits.",
        retailPremiumLink: "View benefits",
        retailNoPhone: "No phone",
        retailActive: "Active",
        retailPending: "Pending",
        retailEdit: "Edit",
        retailNoResults: "No employees match that search.",
        heroEyebrow: "Team management",
        heroTitle: "Organize your team with fast access and clear roles.",
        heroDescription:
          "Create employees, assign the right operational role and review who already activated access from one view.",
        newEmployee: "New employee",
        refreshTeam: "Refresh team",
        metricSizeLabel: "Team size",
        metricSizeHint: "Employees currently assigned to the active business.",
        metricActiveLabel: "Active access",
        metricActiveHint:
          "People who already signed in with their assigned access.",
        metricPendingLabel: "Pending",
        metricPendingHint:
          "Employees still waiting for their first sign-in.",
        metricPhoneLabel: "Phone missing",
        metricPhoneHint:
          "Profiles that still need a phone number before they can sign in.",
        loadTeamFallback:
          "We could not load the team right now. Please try again.",
      },
      roster: {
        eyebrow: "Team directory",
        title: "Create and manage your team",
        description:
          "Keep a clear directory with access phone number, activation status and role-based permissions.",
        refreshing: "Refreshing...",
        create: "Create employee",
        searchLabel: "Search employees",
        searchPlaceholder: "Search by name, phone, email or role",
        loadErrorTitle: "We could not load your team",
        loadingTitle: "Loading employees...",
        loadingDescription:
          "Fetching roles, access and activation status from the business.",
        emptyTitle: "You do not have employees yet",
        emptyDescription:
          "Start by creating the first employee and assigning the operational role that fits best.",
        tableEmployee: "Employee",
        tableAccess: "Access",
        tableRole: "Role",
        tableStatus: "Status",
        tableActions: "Actions",
        createdPrefix: "Created",
        phoneMissing: "Phone not configured",
        lastLoginPrefix: "Last sign-in",
        noLoginYet: "Has not signed in yet",
        delete: "Delete",
      },
      form: {
        createEyebrow: "New employee",
        editEyebrow: "Edit employee",
        createTitle: "Invite a new team member",
        description:
          "Configure who this person is, how they enter the system and which permissions fit their role best.",
        createAnother: "Create another",
        clear: "Clear form",
        name: "Employee name",
        phone: "Access phone",
        role: "Operational role",
        email: "Email (optional)",
        emailPlaceholder:
          "Optional. If omitted, Cashgo creates an internal email.",
        passwordCreate: "Temporary access code",
        passwordEdit: "New temporary code (optional)",
        passwordPlaceholder: "Minimum 8 characters",
        missingPassword: "The temporary access code is required.",
        confirmTitle: "Confirm setup",
        confirmDescriptionPrefix: "This person will use",
        confirmDescriptionFallback: "the configured phone number",
        confirmDescriptionSuffix:
          "as the main sign-in identifier. Check it before saving.",
        recommendedEyebrow: "Recommended profile",
        helperCreate:
          "New employees will appear in the list as soon as you save.",
        helperEdit: "Use this edit to keep the team up to date.",
        savingCreate: "Creating employee...",
        savingEdit: "Saving employee...",
        submitCreate: "Create employee",
        submitEdit: "Save employee",
        genericError:
          "We could not save the employee right now. Please try again.",
      },
    },
    quotes: {
      create: "Create quote",
      premiumTitle: "You reached a premium feature.",
      premiumDescription:
        "Upgrade to Pro, unlock more information and keep growing without limits.",
      premiumLink: "View benefits",
      emptyTitle: "There are no quotes in this account yet.",
      emptyDescription:
        "Once this feature is active, you will be able to record quotes, filter by customer and review status from this same view.",
      table: {
        name: "Name",
        phone: "Phone",
        concept: "Concept",
        status: "Status",
        balance: "Total due",
        view: "View",
      },
    },
    money: {
      title: "My money",
      description:
        "Get your Cashgo card reader and collect sales safely, conveniently and in sync with your operation.",
      advisor: "Talk to an advisor",
      device: "I want my card reader",
    },
    expenses: {
      page: {
        confirmDeletePrefix: 'Do you want to cancel the expense "',
        confirmDeleteSuffix: '"?',
        eyebrow: "Expenses",
        title: "Track and classify every cash outflow in one view.",
        description:
          "Register expenses, group them by category, detect pending obligations and keep reports and daily cash flow ready.",
        refresh: "Refresh",
        newExpense: "New expense",
        metricTotalLabel: "Total outflow",
        metricTotalHint:
          "Sum of visible expenses with the current filters.",
        metricPaidLabel: "Paid",
        metricPaidHint:
          "Expenses already paid and ready to reflect in operations or cash flow.",
        metricPendingLabel: "Pending",
        metricPendingHint:
          "Commitments still waiting to be paid or closed.",
        metricCategoriesLabel: "Categories in use",
        metricCategoriesHintPrefix: "visible movements right now.",
        metricCategoriesHintEmpty:
          "Create categories to read your outflows more clearly.",
        loadErrorFallback:
          "We could not load the expenses workspace right now.",
        loadExpensesFallback:
          "We could not load expenses for the active business.",
      },
      filters: {
        eyebrow: "Quick filters",
        title: "Search by concept, status or date",
        clear: "Clear",
        concept: "Concept",
        conceptPlaceholder:
          "Search rent, transport, utilities...",
        status: "Status",
        category: "Category",
        from: "From",
        to: "To",
        all: "All",
        paid: "Paid",
        pending: "Pending",
        cancelled: "Cancelled",
        allCategories: "All categories",
      },
      form: {
        createEyebrow: "New expense",
        editEyebrow: "Edit expense",
        createTitle: "Register a new expense",
        description:
          "Save concept, category, payment method and status to keep cash flow, reports and classification aligned.",
        createAnother: "Create another",
        clear: "Clear",
        concept: "Concept",
        conceptPlaceholder: "Store rent",
        category: "Category",
        uncategorized: "Uncategorized",
        amount: "Amount",
        paymentMethod: "Payment method",
        status: "Status",
        expenseDate: "Expense date",
        notes: "Notes",
        notesPlaceholder:
          "Additional detail for audit, supplier or payment context.",
        helperCash:
          "If there is an open cash register, this expense will automatically affect the daily reconciliation.",
        footerHint:
          "Use clear categories so reports and cash flow are more useful later.",
        saving: "Saving...",
        creating: "Creating...",
        save: "Save changes",
        create: "Create expense",
        genericError: "We could not save the expense right now.",
      },
      categories: {
        eyebrow: "Classification",
        title: "Active categories",
        description:
          "Define simple groups to separate operations, transport, utilities, payroll or any recurring business expense.",
        expenseSingular: "expense",
        expensePlural: "expenses",
        createTitle: "New category",
        createDescription:
          "Use it to classify outflows and enrich reports.",
        name: "Name",
        namePlaceholder: "Rent",
        color: "Color",
        create: "Create category",
        creating: "Creating...",
        genericError:
          "We could not create the category right now.",
      },
      table: {
        eyebrow: "Outgoing movements",
        title: "Registered expenses",
        description:
          "Select an expense to edit it, review how it was paid or clean up manual records.",
        recordsSuffix: "records",
        refreshing: "Refreshing...",
        loadErrorTitle: "We could not load expenses.",
        loadingTitle: "Loading expenses...",
        loadingDescription:
          "We are fetching the latest movements and categories from your active business.",
        emptyTitle: "There are no visible expenses yet.",
        emptyDescription:
          "Create the first expense to start classifying outflows and feeding reports, cash register and cash flow.",
        uncategorized: "Uncategorized",
        concept: "Concept",
        category: "Category",
        amount: "Amount",
        method: "Method",
        date: "Date",
        status: "Status",
        actions: "Actions",
        createdPrefix: "Created",
        delete: "Delete",
      },
    },
  },
} as const;

export const appDictionary = {
  es: {
    common: {
      back: "Volver",
      close: "Cerrar",
      continue: "Continuar",
      confirm: "Confirmar",
      clear: "Limpiar",
      loading: "Cargando...",
      language: "Idioma",
      search: "Buscar",
      noResults: "No encontramos resultados con ese criterio.",
      refresh: "Actualizar",
      retry: "Reintentar",
    },
    auth: {
      brand: "Cashgo",
      landing: {
        title: "Administra tu negocio desde un solo lugar.",
        description:
          "Ventas, inventario, clientes, proveedores y caja conectados en una experiencia preparada para el día a día.",
        existingLabel: "Si ya usas Cashgo:",
        firstTimeLabel: "Si es tu primera vez usando Cashgo:",
        signInCta: "Inicia sesión",
        registerCta: "Crea una cuenta",
        highlights: [
          "Administra la contabilidad de tu negocio.",
          "Carga fácilmente todo tu inventario y lleva un control de tu stock.",
          "Gestiona tus clientes y proveedores.",
        ],
      },
      login: {
        eyebrow: "Acceso",
        title: "Inicia sesión",
        description:
          "Usa tu correo o teléfono y tu contraseña para entrar a tu negocio.",
        identifierLabel: "Correo o teléfono",
        identifierPlaceholder: "correo@negocio.com o +573001234567",
        passwordLabel: "Contraseña",
        passwordPlaceholder: "Ingresa tu contraseña",
        submit: "Entrar",
        pending: "Ingresando...",
        backToLanding: "Volver al inicio",
      },
      register: {
        stepLabels: ["Tu número", "Verificación", "Tu negocio"],
        phone: {
          title: "Regístrate para comenzar",
          description:
            "Ingresa tu número de teléfono. Te enviaremos un código de verificación.",
          phoneLabel: "Tu número",
          terms:
            "He leído y acepto los Términos y Condiciones, y autorizo el tratamiento de mis datos personales conforme a la Política de Privacidad.",
          submit: "Enviar código",
          pending: "Enviando código...",
        },
        verification: {
          title: "Código de verificación",
          description: "Ingresa el código que enviamos al número seleccionado.",
          info: "El mensaje puede tardar unos instantes.",
          resend: "Editar número",
          submit: "Verificar código",
          pending: "Verificando...",
          developmentHint: "Código de desarrollo",
        },
        business: {
          title: "Datos de tu negocio",
          description:
            "Completa tu perfil inicial para crear tu cuenta y comenzar a usar la app.",
          fullNameLabel: "¿Cuál es tu nombre?",
          businessNameLabel: "¿Cuál es el nombre de tu negocio?",
          categoryLabel: "¿A qué categoría pertenece tu negocio?",
          sellerCodeLabel: "¿Tienes un código de vendedor? (opcional)",
          emailLabel: "Correo de acceso",
          passwordLabel: "Crea una contraseña",
          languageLabel: "Idioma preferido",
          submit: "Comenzar a usar Cashgo",
          pending: "Creando cuenta...",
        },
        footer: {
          hasAccount: "¿Ya tienes cuenta en Cashgo?",
          signIn: "Inicia sesión",
        },
      },
      categories: {
        title: "Selecciona una categoría",
        description:
          "Elige el tipo de negocio que mejor representa tu operación para adaptar la plataforma.",
        searchPlaceholder: "Busca una categoría",
      },
    },
    layout: {
      header: {
        currentSection: "Sección actual",
        activeBusiness: "Negocio activo",
        workspace: "Espacio de trabajo",
        menu: "Menú",
        expandSidebar: "Expandir menú",
        collapseSidebar: "Colapsar menú",
        promoTitle:
          "Compra el plan Pro, disfruta de beneficios extra y lleva tu negocio al siguiente nivel.",
        promoCta: "Conocer más",
        primaryAction: "Abrir caja",
        secondaryAction: "Descargar reporte",
        interfaceLanguage: "Idioma de la interfaz",
        actions: {
          openCashRegister: "Abrir caja",
          downloadReport: "Descargar reporte",
          newSale: "Nueva venta",
          newExpense: "Nuevo gasto",
        },
      },
      sidebar: {
        eyebrow: "Cashgo",
        title: "Centro de operaciones",
        close: "Cerrar",
        businessSectionTitle: "Negocio activo",
        addBusiness: "Agregar otro negocio",
        proBadge: "PRO",
        createBusiness: {
          title: "Crear un nuevo negocio",
          requiredHint: "Los campos marcados con asterisco (*) son obligatorios.",
          nameLabel: "Nombre del negocio",
          namePlaceholder: "Ej. Cashgo Bistro Centro",
          categoryLabel: "Tipo de negocio",
          categoryPlaceholder: "Elige una categoría",
          addressLabel: "Dirección del negocio",
          addressPlaceholder: "Escribe la dirección",
          cityLabel: "Ciudad donde se ubica el negocio",
          cityPlaceholder: "Escribe la ciudad",
          phoneLabel: "Número de celular",
          phonePlaceholder: "Escribe el número",
          emailLabel: "Correo electrónico",
          emailPlaceholder: "Escribe el correo",
          documentLabel: "Documento",
          documentPlaceholder: "Escribe el documento",
          submit: "Crear negocio",
          pending: "Creando negocio...",
          errorMessage:
            "No pudimos crear el negocio en este momento. Inténtalo nuevamente.",
          validation: {
            name: "Ingresa un nombre de negocio válido.",
            category: "Selecciona una categoría para continuar.",
            email: "Ingresa un correo electrónico válido.",
          },
        },
        businessManagement: "Gestiona tu negocio",
        contactManagement: "Gestiona tus contactos",
        generalManagement: "General",
        help: "Ayuda",
        learn: "Aprende a usar Cashgo",
        terms: "Términos y condiciones",
        privacy: "Política de privacidad",
        logout: "Cerrar sesión",
        version: "Versión web",
        expandSupport: "Ver ayuda",
        collapseSupport: "Ocultar ayuda",
      },
      roles: {
        OWNER: "Propietario",
        ADMIN: "Administrador",
        MANAGER: "Gerente",
        CASHIER: "Cajero",
        SELLER: "Vendedor",
        ACCOUNTANT: "Contador",
        STAFF: "Colaborador",
      },
      routes: {
        dashboard: {
          label: "Resumen",
          description:
            "Vista general, métricas y entrada principal del negocio.",
        },
        products: {
          label: "Productos",
          description: "Catálogo, inventario y operaciones del producto.",
        },
        deliveries: {
          label: "Domicilios",
          description: "Pedidos para entrega y coordinación de despacho.",
        },
        billing: {
          label: "Facturación",
          description: "Comprobantes, cobros y control documental.",
        },
        quotes: {
          label: "Cotizaciones",
          description: "Cotizaciones, estados y seguimiento comercial.",
        },
        money: {
          label: "Mi dinero",
          description: "Cobros, datáfono y soluciones financieras.",
        },
        inventory: {
          label: "Inventario",
          description: "Movimientos de stock, ajustes manuales y alertas.",
        },
        sales: {
          label: "Vender",
          description: "Caja rápida, historial de ventas y flujo comercial.",
        },
        movements: {
          label: "Movimientos",
          description:
            "Caja diaria, arqueo operativo y control de transacciones en efectivo.",
        },
        expenses: {
          label: "Gastos",
          description: "Salidas de dinero y control operativo.",
        },
        customers: {
          label: "Clientes",
          description: "Relaciones, saldos e historial de compras.",
        },
        suppliers: {
          label: "Proveedores",
          description: "Abastecimiento y seguimiento de proveedores.",
        },
        employees: {
          label: "Empleados",
          description: "Accesos, roles y gestión de empleados.",
        },
        reports: {
          label: "Estadísticas",
          description: "Reportes operativos y financieros.",
        },
        settings: {
          label: "Configuraciones",
          description: "Preferencias globales, negocio y usuarios.",
        },
      },
    },
    states: stateDictionary.es,
    modules: moduleDictionary.es,
    categories: {
      clothing_footwear: "Ropa y calzado",
      restaurant_fast_food: "Restaurante o comida rápida",
      beauty: "Artículos de belleza",
      corner_store: "Tienda de barrio",
      minimarket: "Minimercado",
      electronics_it: "Electrónica e informática",
      industry_manufacturing: "Industria o manufactura",
      pharmacy_drugstore: "Farmacia y droguería",
      pet_store_vet: "Tienda de mascotas o vet",
      hardware_construction: "Ferretería y construcción",
      stationery_books: "Papelería y libros",
      liquor_store: "Licorería",
      hotels_tourism: "Hoteles y turismo",
      coffee_shop: "Cafetería",
      bar: "Bar",
      transport_logistics: "Transporte y logística",
      home_goods: "Artículos para el hogar",
      bakery_pastry: "Panadería y repostería",
      auto_repair_workshop: "Taller automotriz",
      marketing_advertising: "Marketing y publicidad",
      sporting_goods: "Artículos deportivos",
      gym: "Gimnasio",
      tattoos_piercings: "Tatuajes y piercings",
      repairs_maintenance: "Reparaciones y mantenimiento",
      educational_services: "Servicios educativos",
      event_planning: "Organización de eventos",
      beauty_health: "Estética y salud",
      barbershop_beauty_salon: "Barbería y salón de belleza",
      lending_financing: "Préstamos y financiamiento",
      natural_store_supplements: "Tienda naturista y/o suplementos",
      entertainment_leisure: "Entretenimiento y ocio",
      auto_sales: "Venta de automóviles",
      auto_parts_accessories: "Artículos automotrices",
      agricultural_supplies: "Insumos agropecuarios",
      butcher_shop: "Carnicería",
      deli_charcuterie: "Salsamentaria",
      wholesale_distributor: "Distribuidora / Mayorista",
      accessories_jewelry: "Accesorios y bisutería",
      gift_store: "Tiendas de regalos",
    } satisfies Record<BusinessCategoryOption, string>,
  },
  en: {
    common: {
      back: "Back",
      close: "Close",
      continue: "Continue",
      confirm: "Confirm",
      clear: "Clear",
      loading: "Loading...",
      language: "Language",
      search: "Search",
      noResults: "No results found for that search.",
      refresh: "Refresh",
      retry: "Retry",
    },
    auth: {
      brand: "Cashgo",
      landing: {
        title: "Run your business from one place.",
        description:
          "Sales, inventory, customers, suppliers and cash flow connected in a workspace built for daily operations.",
        existingLabel: "If you already use Cashgo:",
        firstTimeLabel: "If this is your first time using Cashgo:",
        signInCta: "Sign in",
        registerCta: "Create an account",
        highlights: [
          "Manage your business bookkeeping.",
          "Upload inventory faster and keep your stock under control.",
          "Organize your customers and suppliers.",
        ],
      },
      login: {
        eyebrow: "Access",
        title: "Sign in",
        description:
          "Use your email or phone number and password to enter your workspace.",
        identifierLabel: "Email or phone",
        identifierPlaceholder: "owner@business.com or +573001234567",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter your password",
        submit: "Sign in",
        pending: "Signing in...",
        backToLanding: "Back to start",
      },
      register: {
        stepLabels: ["Your number", "Verification", "Your business"],
        phone: {
          title: "Register to get started",
          description:
            "Enter your phone number. We will send you a verification code.",
          phoneLabel: "Your number",
          terms:
            "I have read and accept the Terms and Conditions, and I authorize the processing of my personal data according to the Privacy Policy.",
          submit: "Send code",
          pending: "Sending code...",
        },
        verification: {
          title: "Verification code",
          description: "Enter the code we sent to the selected phone number.",
          info: "The message may take a few moments.",
          resend: "Edit number",
          submit: "Verify code",
          pending: "Verifying...",
          developmentHint: "Development code",
        },
        business: {
          title: "Business details",
          description:
            "Complete your initial profile to create your account and start using the app.",
          fullNameLabel: "What is your name?",
          businessNameLabel: "What is the name of your business?",
          categoryLabel: "Which category does your business belong to?",
          sellerCodeLabel: "Do you have a seller code? (optional)",
          emailLabel: "Login email",
          passwordLabel: "Create a password",
          languageLabel: "Preferred language",
          submit: "Start using Cashgo",
          pending: "Creating account...",
        },
        footer: {
          hasAccount: "Already have an account in Cashgo?",
          signIn: "Sign in",
        },
      },
      categories: {
        title: "Select a category",
        description:
          "Choose the business type that best matches your operation so we can adapt the platform.",
        searchPlaceholder: "Search for a category",
      },
    },
    layout: {
      header: {
        currentSection: "Current section",
        activeBusiness: "Active business",
        workspace: "Workspace",
        menu: "Menu",
        expandSidebar: "Expand sidebar",
        collapseSidebar: "Collapse sidebar",
        promoTitle:
          "Upgrade to Pro and unlock more tools to run your business with confidence.",
        promoCta: "Learn more",
        primaryAction: "Open cash register",
        secondaryAction: "Download report",
        interfaceLanguage: "Interface language",
        actions: {
          openCashRegister: "Open cash register",
          downloadReport: "Download report",
          newSale: "New sale",
          newExpense: "New expense",
        },
      },
      sidebar: {
        eyebrow: "Cashgo",
        title: "Operations center",
        close: "Close",
        businessSectionTitle: "Active business",
        addBusiness: "Add another business",
        proBadge: "PRO",
        createBusiness: {
          title: "Create a new business",
          requiredHint: "Fields marked with an asterisk (*) are required.",
          nameLabel: "Business name",
          namePlaceholder: "Example: Cashgo Bistro Downtown",
          categoryLabel: "Business type",
          categoryPlaceholder: "Choose a category",
          addressLabel: "Business address",
          addressPlaceholder: "Enter the address",
          cityLabel: "City where the business is located",
          cityPlaceholder: "Enter the city",
          phoneLabel: "Phone number",
          phonePlaceholder: "Enter the phone number",
          emailLabel: "Email address",
          emailPlaceholder: "Enter the email",
          documentLabel: "Document",
          documentPlaceholder: "Enter the document",
          submit: "Create business",
          pending: "Creating business...",
          errorMessage:
            "We could not create the business right now. Please try again.",
          validation: {
            name: "Enter a valid business name.",
            category: "Select a category to continue.",
            email: "Enter a valid email address.",
          },
        },
        businessManagement: "Run your business",
        contactManagement: "Manage your contacts",
        generalManagement: "General",
        help: "Help",
        learn: "Learn Cashgo",
        terms: "Terms and conditions",
        privacy: "Privacy policy",
        logout: "Sign out",
        version: "Web version",
        expandSupport: "Show help",
        collapseSupport: "Hide help",
      },
      roles: {
        OWNER: "Owner",
        ADMIN: "Administrator",
        MANAGER: "Manager",
        CASHIER: "Cashier",
        SELLER: "Seller",
        ACCOUNTANT: "Accountant",
        STAFF: "Staff",
      },
      routes: {
        dashboard: {
          label: "Overview",
          description: "Overview, metrics and the main business entry point.",
        },
        products: {
          label: "Products",
          description: "Catalog, inventory and product operations.",
        },
        deliveries: {
          label: "Deliveries",
          description: "Delivery orders and dispatch coordination.",
        },
        billing: {
          label: "Billing",
          description: "Receipts, collections and document control.",
        },
        quotes: {
          label: "Quotes",
          description: "Quotes, statuses and commercial follow-up.",
        },
        money: {
          label: "My money",
          description: "Collections, card reader and financial tools.",
        },
        inventory: {
          label: "Inventory",
          description: "Stock movements, manual adjustments and alerts.",
        },
        sales: {
          label: "Sales",
          description: "Fast checkout, sales history and commercial flow.",
        },
        movements: {
          label: "Movements",
          description:
            "Daily cash control, reconciliation and operational money tracking.",
        },
        expenses: {
          label: "Expenses",
          description: "Outgoing cash and operational control.",
        },
        customers: {
          label: "Customers",
          description: "Relationships, balances and purchase history.",
        },
        suppliers: {
          label: "Suppliers",
          description: "Procurement and supplier follow-up.",
        },
        employees: {
          label: "Employees",
          description: "Team access, roles and employee management.",
        },
        reports: {
          label: "Reports",
          description: "Operational and financial reporting.",
        },
        settings: {
          label: "Configuration",
          description: "Global preferences, business setup and users.",
        },
      },
    },
    states: stateDictionary.en,
    modules: moduleDictionary.en,
    categories: {
      clothing_footwear: "Clothing and footwear",
      restaurant_fast_food: "Restaurant or fast food",
      beauty: "Beauty products",
      corner_store: "Corner store",
      minimarket: "Mini market",
      electronics_it: "Electronics and IT",
      industry_manufacturing: "Industry or manufacturing",
      pharmacy_drugstore: "Pharmacy and drugstore",
      pet_store_vet: "Pet store or vet",
      hardware_construction: "Hardware and construction",
      stationery_books: "Stationery and books",
      liquor_store: "Liquor store",
      hotels_tourism: "Hotels and tourism",
      coffee_shop: "Coffee shop",
      bar: "Bar",
      transport_logistics: "Transport and logistics",
      home_goods: "Home goods",
      bakery_pastry: "Bakery and pastry",
      auto_repair_workshop: "Auto repair workshop",
      marketing_advertising: "Marketing and advertising",
      sporting_goods: "Sporting goods",
      gym: "Gym",
      tattoos_piercings: "Tattoos and piercings",
      repairs_maintenance: "Repairs and maintenance",
      educational_services: "Educational services",
      event_planning: "Event planning",
      beauty_health: "Beauty and health",
      barbershop_beauty_salon: "Barbershop and beauty salon",
      lending_financing: "Lending and financing",
      natural_store_supplements: "Natural store and supplements",
      entertainment_leisure: "Entertainment and leisure",
      auto_sales: "Car sales",
      auto_parts_accessories: "Automotive goods",
      agricultural_supplies: "Agricultural supplies",
      butcher_shop: "Butcher shop",
      deli_charcuterie: "Delicatessen and cold cuts",
      wholesale_distributor: "Distributor / wholesaler",
      accessories_jewelry: "Accessories and jewelry",
      gift_store: "Gift store",
    } satisfies Record<BusinessCategoryOption, string>,
  },
} as const;
