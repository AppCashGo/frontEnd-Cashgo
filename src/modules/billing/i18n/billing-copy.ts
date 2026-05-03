import type { CashRegisterPaymentMethod } from "@/modules/cash-register/types/cash-register";
import type {
  BillingDocumentStatus,
  BillingDocumentStatusFilter,
  BillingInvoiceStatus,
  BillingInvoiceType,
} from "@/modules/billing/types/billing";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";

const billingCopy = {
  es: {
    pageTitle: "Facturación",
    pageDescription:
      "Consulta comprobantes, controla cobros pendientes y descarga soportes del negocio.",
    createButton: "Crear factura",
    configureButton: "Configuración fiscal",
    exportButton: "Descargar reporte",
    searchPlaceholder: "Buscar comprobante o cliente",
    allCustomers: "Todos los clientes",
    allStatuses: "Todos los estados",
    totalBilled: "Facturado",
    totalBilledHint: "Total acumulado de los comprobantes visibles.",
    totalPaid: "Cobrado",
    totalPaidHint: "Dinero ya recibido sobre este conjunto de comprobantes.",
    totalPending: "Por cobrar",
    totalPendingHint: "Saldo pendiente por recaudar.",
    overdueCount: "Vencidas",
    overdueCountHint: "Comprobantes vencidos que requieren seguimiento.",
    tableTitle: "Comprobantes emitidos",
    emptyTitle: "Todavía no hay comprobantes registrados.",
    emptyDescription:
      "En cuanto crees ventas desde el flujo de vender, aquí verás cada comprobante listo para cobrar, revisar o descargar.",
    columns: {
      document: "Comprobante",
      invoiceType: "Tipo",
      invoiceStatus: "Factura",
      customer: "Cliente",
      total: "Total",
      paid: "Cobrado",
      balance: "Saldo",
      status: "Estado",
      createdAt: "Fecha y hora",
      actions: "Acciones",
    },
    viewDetail: "Ver detalle",
    noDianStatus: "Sin estado DIAN",
    createInvoiceTitle: "Facturar venta",
    createInvoiceDescription:
      "Selecciona una venta disponible y conviértela en un documento formal del negocio.",
    createInvoiceSearch: "Buscar venta o cliente",
    createInvoiceType: "Tipo de documento",
    createInvoiceNote: "Nota del documento",
    createInvoiceSubmit: "Generar factura",
    createInvoiceEmptyTitle: "No hay ventas disponibles para facturar.",
    createInvoiceEmptyDescription:
      "Primero registra una venta y luego podrás convertirla en recibo, documento POS o factura.",
    createInvoiceSelected: "Venta seleccionada",
    availableSaleCustomer: "Cliente",
    availableSaleBalance: "Saldo pendiente",
    availableSaleDate: "Fecha",
    configTitle: "Configuración fiscal",
    configDescription:
      "Completa los datos tributarios del negocio y la resolución activa para emitir documentos formales.",
    configBusinessSection: "Datos del negocio",
    configResolutionSection: "Resolución activa",
    configSave: "Guardar configuración",
    configLegalName: "Razón social",
    configTaxId: "NIT / documento",
    configCity: "Ciudad",
    configEmail: "Correo",
    configPhone: "Teléfono",
    configAddress: "Dirección",
    configTaxResponsibility: "Responsabilidad tributaria",
    configTaxRegime: "Régimen",
    configInvoiceNote: "Mensaje final del comprobante",
    configResolutionPrefix: "Prefijo",
    configResolutionNumber: "Número de resolución",
    configResolutionStartNumber: "Rango inicial",
    configResolutionEndNumber: "Rango final",
    configResolutionCurrentNumber: "Número actual",
    configResolutionStartDate: "Fecha inicial",
    configResolutionEndDate: "Fecha final",
    configResolutionActive: "Activar resolución",
    configSaved: "Configuración actualizada.",
    drawerTitle: "Detalle del comprobante",
    drawerDescription:
      "Revisa el documento, controla el saldo pendiente y descarga el soporte cuando lo necesites.",
    receiptNote: "Nota del comprobante",
    manualSale: "Venta libre sin productos asociados.",
    collectTitle: "Registrar abono",
    collectDescription:
      "Aplica un pago parcial o total para actualizar cartera, cliente y caja.",
    collectAmount: "Valor recibido",
    collectMethod: "Medio de pago",
    collectReference: "Referencia",
    collectNotes: "Notas del abono",
    collectButton: "Registrar abono",
    downloadReceipt: "Descargar comprobante",
    printReceipt: "Imprimir comprobante",
    noPayments: "No hay pagos registrados todavía.",
    noCustomer: "Venta sin cliente asociado",
    noSeller: "Sin vendedor asignado",
    createdBy: "Registrada por",
    dueDate: "Vence",
    customerLabel: "Cliente",
    totalLabel: "Total",
    paidLabel: "Cobrado",
    balanceLabel: "Saldo",
    dateLabel: "Fecha",
    statusLabel: "Estado",
    productLabel: "Producto",
    quantityLabel: "Cant.",
    unitPriceLabel: "Unitario",
    lineTotalLabel: "Total",
    paymentTypeLabel: "Tipo",
    loadingDocument: "Cargando comprobante...",
    missingDocument: "No encontramos este comprobante.",
    cashRegisterHelper:
      "Este abono impactará la caja abierta actual del negocio.",
    saving: "Guardando...",
    itemCountSuffix: "ítems",
    detailItems: "Detalle de productos",
    detailPayments: "Historial de pagos",
    paymentSourceSale: "Pago inicial",
    paymentSourceCollection: "Abono",
    summaryTaxId: "NIT / documento",
    summaryResolution: "Resolución activa",
    summaryPrefix: "Prefijo",
    summaryCurrentNumber: "Consecutivo actual",
    summaryMissingResolution: "Sin resolución configurada",
    documentSummary: "Resumen del documento",
    backToSales: "Ir a vender",
    loadError: "No pudimos cargar la facturación en este momento.",
    paymentError: "No pudimos registrar el abono en este momento.",
    exportError: "No pudimos descargar el reporte.",
    receiptError: "No pudimos generar el comprobante.",
    createInvoiceError: "No pudimos generar la factura.",
    configError: "No pudimos guardar la configuración fiscal.",
    validationAmount: "Ingresa un valor mayor a 0 para registrar el abono.",
    validationReference:
      "La referencia no puede superar los 120 caracteres.",
    validationNotes: "Las notas no pueden superar los 255 caracteres.",
    validationEmail: "Ingresa un correo válido.",
    validationNumericField: "Ingresa un número válido.",
    validationRequiredSale: "Selecciona una venta para facturar.",
  },
  en: {
    pageTitle: "Billing",
    pageDescription:
      "Review receipts, control pending collections and download business support documents.",
    createButton: "Create invoice",
    configureButton: "Fiscal settings",
    exportButton: "Download report",
    searchPlaceholder: "Search receipt or customer",
    allCustomers: "All customers",
    allStatuses: "All statuses",
    totalBilled: "Billed",
    totalBilledHint: "Total amount across the visible documents.",
    totalPaid: "Collected",
    totalPaidHint: "Cash already received for these billing documents.",
    totalPending: "Outstanding",
    totalPendingHint: "Balance still pending collection.",
    overdueCount: "Overdue",
    overdueCountHint: "Overdue billing documents that need follow-up.",
    tableTitle: "Issued documents",
    emptyTitle: "There are no billing documents yet.",
    emptyDescription:
      "As soon as you create sales from the sell flow, every receipt will appear here ready to collect, review or download.",
    columns: {
      document: "Document",
      invoiceType: "Type",
      invoiceStatus: "Invoice",
      customer: "Customer",
      total: "Total",
      paid: "Paid",
      balance: "Balance",
      status: "Status",
      createdAt: "Date and time",
      actions: "Actions",
    },
    viewDetail: "View detail",
    noDianStatus: "No DIAN status",
    createInvoiceTitle: "Invoice sale",
    createInvoiceDescription:
      "Select an available sale and convert it into a formal business document.",
    createInvoiceSearch: "Search sale or customer",
    createInvoiceType: "Document type",
    createInvoiceNote: "Document note",
    createInvoiceSubmit: "Generate invoice",
    createInvoiceEmptyTitle: "There are no sales available to invoice.",
    createInvoiceEmptyDescription:
      "Register a sale first and then you can convert it into a receipt, POS document or invoice.",
    createInvoiceSelected: "Selected sale",
    availableSaleCustomer: "Customer",
    availableSaleBalance: "Outstanding balance",
    availableSaleDate: "Date",
    configTitle: "Fiscal settings",
    configDescription:
      "Complete the business tax data and the active resolution required to issue formal documents.",
    configBusinessSection: "Business details",
    configResolutionSection: "Active resolution",
    configSave: "Save configuration",
    configLegalName: "Legal name",
    configTaxId: "Tax ID",
    configCity: "City",
    configEmail: "Email",
    configPhone: "Phone",
    configAddress: "Address",
    configTaxResponsibility: "Tax responsibility",
    configTaxRegime: "Regime",
    configInvoiceNote: "Document footer note",
    configResolutionPrefix: "Prefix",
    configResolutionNumber: "Resolution number",
    configResolutionStartNumber: "Start range",
    configResolutionEndNumber: "End range",
    configResolutionCurrentNumber: "Current number",
    configResolutionStartDate: "Start date",
    configResolutionEndDate: "End date",
    configResolutionActive: "Active resolution",
    configSaved: "Configuration updated.",
    drawerTitle: "Document detail",
    drawerDescription:
      "Review the document, control the outstanding balance and download support whenever you need it.",
    receiptNote: "Receipt note",
    manualSale: "Free sale without linked products.",
    collectTitle: "Register payment",
    collectDescription:
      "Apply a partial or full payment to update receivables, customer balance and cash register.",
    collectAmount: "Received amount",
    collectMethod: "Payment method",
    collectReference: "Reference",
    collectNotes: "Payment notes",
    collectButton: "Register payment",
    downloadReceipt: "Download receipt",
    printReceipt: "Print receipt",
    noPayments: "There are no recorded payments yet.",
    noCustomer: "Sale without linked customer",
    noSeller: "No assigned seller",
    createdBy: "Recorded by",
    dueDate: "Due",
    customerLabel: "Customer",
    totalLabel: "Total",
    paidLabel: "Paid",
    balanceLabel: "Balance",
    dateLabel: "Date",
    statusLabel: "Status",
    productLabel: "Product",
    quantityLabel: "Qty.",
    unitPriceLabel: "Unit price",
    lineTotalLabel: "Total",
    paymentTypeLabel: "Type",
    loadingDocument: "Loading document...",
    missingDocument: "We couldn't find this document.",
    cashRegisterHelper:
      "This payment will impact the current open cash register.",
    saving: "Saving...",
    itemCountSuffix: "items",
    detailItems: "Product detail",
    detailPayments: "Payment history",
    paymentSourceSale: "Initial payment",
    paymentSourceCollection: "Collection",
    summaryTaxId: "Tax ID",
    summaryResolution: "Active resolution",
    summaryPrefix: "Prefix",
    summaryCurrentNumber: "Current sequence",
    summaryMissingResolution: "No configured resolution",
    documentSummary: "Document summary",
    backToSales: "Go to sell",
    loadError: "We couldn't load billing right now.",
    paymentError: "We couldn't register the payment right now.",
    exportError: "We couldn't download the report.",
    receiptError: "We couldn't generate the receipt.",
    createInvoiceError: "We couldn't generate the invoice.",
    configError: "We couldn't save the fiscal configuration.",
    validationAmount: "Enter an amount greater than 0 to register the payment.",
    validationReference:
      "Reference cannot be longer than 120 characters.",
    validationNotes: "Notes cannot be longer than 255 characters.",
    validationEmail: "Enter a valid email.",
    validationNumericField: "Enter a valid number.",
    validationRequiredSale: "Select a sale to invoice.",
  },
} as const;

const paymentMethodLabels: Record<
  AppLanguageCode,
  Record<CashRegisterPaymentMethod, string>
> = {
  es: {
    CASH: "Efectivo",
    CARD: "Tarjeta",
    TRANSFER: "Transferencia",
    DIGITAL_WALLET: "Billetera digital",
    BANK_DEPOSIT: "Consignación",
    CREDIT: "Crédito",
    OTHER: "Otro",
  },
  en: {
    CASH: "Cash",
    CARD: "Card",
    TRANSFER: "Transfer",
    DIGITAL_WALLET: "Digital wallet",
    BANK_DEPOSIT: "Bank deposit",
    CREDIT: "Credit",
    OTHER: "Other",
  },
};

const statusLabels: Record<
  AppLanguageCode,
  Record<BillingDocumentStatusFilter, string>
> = {
  es: {
    ALL: "Todos",
    PAID: "Pagada",
    PARTIAL: "Parcial",
    PENDING: "Pendiente",
    OVERDUE: "Vencida",
    CANCELLED: "Cancelada",
  },
  en: {
    ALL: "All",
    PAID: "Paid",
    PARTIAL: "Partial",
    PENDING: "Pending",
    OVERDUE: "Overdue",
    CANCELLED: "Cancelled",
  },
};

const invoiceTypeLabels: Record<
  AppLanguageCode,
  Record<BillingInvoiceType, string>
> = {
  es: {
    SIMPLE_RECEIPT: "Recibo simple",
    POS_DOCUMENT: "Documento POS",
    ELECTRONIC_INVOICE: "Factura electrónica",
  },
  en: {
    SIMPLE_RECEIPT: "Simple receipt",
    POS_DOCUMENT: "POS document",
    ELECTRONIC_INVOICE: "Electronic invoice",
  },
};

const invoiceStatusLabels: Record<
  AppLanguageCode,
  Record<BillingInvoiceStatus, string>
> = {
  es: {
    DRAFT: "Borrador",
    PENDING: "Pendiente",
    SENT: "Enviada",
    APPROVED: "Aprobada",
    REJECTED: "Rechazada",
    CANCELLED: "Anulada",
  },
  en: {
    DRAFT: "Draft",
    PENDING: "Pending",
    SENT: "Sent",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
  },
};

export function getBillingCopy(languageCode: AppLanguageCode) {
  return billingCopy[languageCode];
}

export function getBillingStatusLabel(
  status: BillingDocumentStatus | BillingDocumentStatusFilter,
  languageCode: AppLanguageCode,
) {
  return statusLabels[languageCode][status];
}

export function getBillingPaymentMethodLabel(
  method: CashRegisterPaymentMethod,
  languageCode: AppLanguageCode,
) {
  return paymentMethodLabels[languageCode][method];
}

export function getBillingInvoiceTypeLabel(
  type: BillingInvoiceType,
  languageCode: AppLanguageCode,
) {
  return invoiceTypeLabels[languageCode][type];
}

export function getBillingInvoiceStatusLabel(
  status: BillingInvoiceStatus,
  languageCode: AppLanguageCode,
) {
  return invoiceStatusLabels[languageCode][status];
}
