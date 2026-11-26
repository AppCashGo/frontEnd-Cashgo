import type { AppLanguageCode } from '@/shared/i18n/app-dictionary'

export const productImportColumns = [
  { key: 'name', es: 'Nombre del producto', en: 'Product name' },
  { key: 'description', es: 'Descripción', en: 'Description' },
  { key: 'sku', es: 'Código SKU', en: 'SKU code' },
  { key: 'barcode', es: 'Código de barras', en: 'Barcode' },
  { key: 'cost', es: 'Costo unitario', en: 'Unit cost' },
  { key: 'price', es: 'Precio de venta', en: 'Selling price' },
  { key: 'stock', es: 'Existencias', en: 'Stock on hand' },
  { key: 'minStock', es: 'Existencias mínimas', en: 'Minimum stock' },
  { key: 'unit', es: 'Unidad de medida', en: 'Unit of measure' },
  { key: 'isActive', es: 'Producto activo', en: 'Active product' },
] as const

type ProductImportColumn = (typeof productImportColumns)[number]['key']

export const productImportTemplateCopy = {
  es: {
    button: 'Descargar plantilla Excel',
    error: 'No pudimos descargar la plantilla. Inténtalo de nuevo.',
    fileName: 'cashgo-plantilla-productos.xlsx',
    sheetName: 'Productos',
    example: {
      name: 'Café molido 500 g',
      description: 'Bolsa de café',
      unit: 'Paquete',
      isActive: 'Sí',
    },
  },
  en: {
    button: 'Download Excel template',
    error: 'We could not download the template. Please try again.',
    fileName: 'cashgo-product-template.xlsx',
    sheetName: 'Products',
    example: {
      name: 'Ground coffee 500 g',
      description: 'Bag of coffee',
      unit: 'Pack',
      isActive: 'Yes',
    },
  },
} satisfies Record<
  AppLanguageCode,
  {
    button: string
    error: string
    fileName: string
    sheetName: string
    example: Record<'name' | 'description' | 'unit' | 'isActive', string>
  }
>

export function getProductImportTemplateRows(language: AppLanguageCode) {
  const example: Record<ProductImportColumn, string | number> = {
    ...productImportTemplateCopy[language].example,
    sku: 'CAF-500',
    barcode: '0770000000001',
    cost: 14000,
    price: 19800,
    stock: 18,
    minStock: 4,
  }

  return {
    headers: productImportColumns.map((column) => column[language]),
    example: productImportColumns.map(({ key }) => example[key]),
  }
}
