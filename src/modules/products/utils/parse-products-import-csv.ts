import { productImportColumns } from '@/modules/products/i18n/product-import-template'
import {
  productImportRowSchema,
  type ProductImportRowSchemaValues,
} from '@/modules/products/schemas/product-import-row-schema'
import type {
  ProductImportRowInput,
  ProductUnit,
} from '@/modules/products/types/product'

export const MAX_PRODUCT_IMPORT_ROWS = 500
export const MAX_PRODUCT_IMPORT_BYTES = 10 * 1024 * 1024

type ParsedImportData = {
  rows: ProductImportRowInput[]
  issues: string[]
}

const legacyHeaders = {
  name: 'name',
  description: 'description',
  sku: 'sku',
  barcode: 'barcode',
  cost: 'cost',
  price: 'price',
  stock: 'stock',
  minstock: 'minStock',
  unit: 'unit',
  isactive: 'isActive',
  nombre: 'name',
  producto: 'name',
  descripcion: 'description',
  codigosku: 'sku',
  codigodebarras: 'barcode',
  costo: 'cost',
  precio: 'price',
  preciodeventa: 'price',
  existencias: 'stock',
  cantidad: 'stock',
  stockminimo: 'minStock',
  existenciasminimas: 'minStock',
  unidad: 'unit',
  activo: 'isActive',
  estado: 'isActive',
} as const

const supportedHeaders = new Map<string, string>(Object.entries(legacyHeaders))
for (const { key, es, en } of productImportColumns) {
  supportedHeaders.set(normalizeHeaderKey(es), key)
  supportedHeaders.set(normalizeHeaderKey(en), key)
}
const importColumnKeys = new Set<string>(productImportColumns.map(({ key }) => key))

const acceptedUnits = new Set<ProductUnit>([
  'UNIT',
  'KG',
  'GRAM',
  'LITER',
  'MILLILITER',
  'METER',
  'BOX',
  'PACK',
  'SERVICE',
])

export function parseProductsImportCsv(csvContent: string): ParsedImportData {
  const table = parseCsvRows(csvContent.replace(/^\uFEFF/, ''))
  return table
    ? parseProductsImportRows(table)
    : {
        rows: [],
        issues: [
          'Hay comillas sin cerrar en el CSV. Revisa el archivo y vuelve a seleccionarlo.',
        ],
      }
}

export async function parseProductsImportFile(
  file: File,
): Promise<ParsedImportData> {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
    return { rows: [], issues: ['Selecciona un archivo CSV, XLSX o XLS.'] }
  }
  if (file.size > MAX_PRODUCT_IMPORT_BYTES) {
    return { rows: [], issues: ['El archivo supera el máximo de 10 MB.'] }
  }

  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const XLSX = await import('xlsx')
    const workbookBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(workbookBuffer, {
      type: 'array',
    })
    const firstSheetName = workbook.SheetNames[0]

    if (!firstSheetName) {
      return {
        rows: [],
        issues: ['El libro no contiene hojas para importar.'],
      }
    }

    const worksheet = workbook.Sheets[firstSheetName]
    const sheetRows = XLSX.utils
      .sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        raw: false,
        defval: '',
        blankrows: true,
        range: 0,
      })
      .map((row) => row.map((cell) => String(cell ?? '')))
    const headerIndex = sheetRows.findIndex((row) =>
      row.some((cell) => cell.trim()),
    )
    const numericColumns = sheetRows[headerIndex]?.map(normalizeHeader)
    for (
      let index = headerIndex + 1;
      numericColumns && index < sheetRows.length;
      index += 1
    ) {
      numericColumns.forEach((header, column) => {
        if (!['cost', 'price', 'stock', 'minStock', 'barcode'].includes(header))
          return
        const cell = worksheet[XLSX.utils.encode_cell({ r: index, c: column })]
        if (typeof cell?.v !== 'number') return
        if (header === 'barcode') {
          if (
            Number.isSafeInteger(cell.v) &&
            !/^\d+$/.test(sheetRows[index][column])
          ) {
            sheetRows[index][column] = String(cell.v)
          }
        } else if (header === 'cost' || header === 'price') {
          const fixed = cell.v.toFixed(2)
          sheetRows[index][column] =
            Math.abs(Number(fixed) - cell.v) < 1e-8 ? fixed : '—'
        } else {
          sheetRows[index][column] = String(cell.v)
        }
      })
    }
    return parseProductsImportRows(sheetRows)
  }

  const fileContent = await file.text()

  return parseProductsImportCsv(fileContent)
}

function parseProductsImportRows(parsedRows: string[][]): ParsedImportData {
  const headerIndex = parsedRows.findIndex((row) =>
    row.some((cell) => cell.trim()),
  )
  if (headerIndex < 0) return { rows: [], issues: ['El archivo está vacío.'] }

  const headers = parsedRows[headerIndex].map(normalizeHeader)
  const dataRows = parsedRows.slice(headerIndex + 1)
  const dataCount = dataRows.filter((row) =>
    row.some((cell) => cell.trim()),
  ).length
  const issues: string[] = []
  const rows: ProductImportRowInput[] = []
  for (const [header, label] of [
    ['name', 'Nombre'],
    ['price', 'Precio'],
    ['stock', 'Existencias'],
  ]) {
    if (!headers.includes(header))
      issues.push(`Falta la columna obligatoria «${label}».`)
  }
  const knownHeaders = headers.filter((header) => importColumnKeys.has(header))
  if (new Set(knownHeaders).size !== knownHeaders.length)
    issues.push('El archivo tiene encabezados repetidos.')
  if (!dataCount)
    issues.push('Agrega al menos un producto debajo de los encabezados.')
  if (dataCount > MAX_PRODUCT_IMPORT_ROWS) {
    issues.push(
      `El archivo tiene ${dataCount} productos. Divide la carga en archivos de hasta ${MAX_PRODUCT_IMPORT_ROWS} filas.`,
    )
  }
  if (issues.length) return { rows, issues }

  const identifiers = new Map<string, number>()
  const names = new Map<string, { rowNumber: number; hasIdentifier: boolean }>()
  dataRows.forEach((rawRow, index) => {
    if (!rawRow.some((cell) => cell.trim())) return
    const rowNumber = headerIndex + index + 2
    if (rawRow.slice(headers.length).some((cell) => cell.trim())) {
      issues.push(
        `Fila ${rowNumber}: hay valores fuera de las columnas del archivo.`,
      )
      return
    }
    const parsed = productImportRowSchema.safeParse(
      mapRowToRecord(headers, rawRow, rowNumber),
    )
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        issues.push(`Fila ${rowNumber}: ${issue.message}`)
      return
    }

    const row = toImportRowInput(parsed.data)
    const nameKey = normalizeKey(row.name)
    const hasIdentifier = Boolean(row.sku || row.barcode)
    const sameName = names.get(nameKey)
    if (sameName && (!hasIdentifier || !sameName.hasIdentifier)) {
      issues.push(
        `Fila ${rowNumber}: comparte nombre con la fila ${sameName.rowNumber}. Incluye identificadores distintos en ambas filas.`,
      )
      return
    }
    const keys =
      row.sku || row.barcode
        ? [
            ['SKU', row.sku],
            ['código de barras', row.barcode],
          ]
        : [['nombre', row.name]]
    for (const [label, value] of keys) {
      if (!value) continue
      const key = `${label}:${normalizeKey(value)}`
      const previous = identifiers.get(key)
      if (previous !== undefined) {
        issues.push(
          `Fila ${rowNumber}: repite el ${label} de la fila ${previous}.`,
        )
        return
      }
    }
    for (const [label, value] of keys) {
      if (value) identifiers.set(`${label}:${normalizeKey(value)}`, rowNumber)
    }
    names.set(nameKey, { rowNumber, hasIdentifier })
    rows.push(row)
  })

  return { rows, issues }
}

function parseCsvRows(csvContent: string) {
  const header = csvContent.split(/\r?\n|\r/).find((line) => line.trim()) ?? ''
  const unquotedHeader = header.replace(/"(?:""|[^"])*"/g, '')
  const separators = [',', ';', '\t']
  const delimiter = separators.reduce((best, candidate) =>
    unquotedHeader.split(candidate).length > unquotedHeader.split(best).length
      ? candidate
      : best,
  )
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentValue = ''
  let insideQuotes = false

  for (let index = 0; index < csvContent.length; index += 1) {
    const character = csvContent[index]
    const nextCharacter = csvContent[index + 1]

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (character === delimiter && !insideQuotes) {
      currentRow.push(currentValue)
      currentValue = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !insideQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }

      currentRow.push(currentValue)
      rows.push(currentRow)
      currentRow = []
      currentValue = ''
      continue
    }

    currentValue += character
  }

  if (insideQuotes) return null
  currentRow.push(currentValue)

  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow)
  }

  return rows
}

function normalizeKey(value: string) {
  return value.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function normalizeHeaderKey(header: string) {
  return normalizeKey(header).replace(/[\s_-]+/g, '')
}

function normalizeHeader(header: string): string {
  const sanitizedHeader = normalizeHeaderKey(header)
  return supportedHeaders.get(sanitizedHeader) ?? sanitizedHeader
}

function mapRowToRecord(
  headers: string[],
  values: string[],
  rowNumber: number,
) {
  const record: Record<string, unknown> = {
    rowNumber,
  }

  headers.forEach((header, headerIndex) => {
    const rawValue = values[headerIndex]?.trim() ?? ''

    if (!header || rawValue.length === 0) {
      return
    }

    if (header === 'cost' || header === 'price') {
      record[header] = parseDecimalValue(rawValue)
      return
    }

    if (header === 'stock' || header === 'minStock') {
      record[header] = parseIntegerValue(rawValue)
      return
    }

    if (header === 'isActive') {
      record[header] = parseBooleanValue(rawValue)
      return
    }

    if (header === 'unit') {
      record[header] = normalizeUnitValue(rawValue)
      return
    }

    record[header] =
      header === 'barcode'
        ? rawValue.replace(/[\s\p{Cc}]+/gu, '') || undefined
        : rawValue
  })

  return record
}

function parseDecimalValue(value: string) {
  const number = value.replace(/^\s*(?:COP\s*)?\$?\s*/i, '').replace(/\s+/g, '')
  if (/^-?\d+(?:[.,]\d{1,2})?$/.test(number))
    return Number(number.replace(',', '.'))
  if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(number)) {
    return Number(number.replace(/\./g, '').replace(',', '.'))
  }
  if (/^-?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(number)) {
    return Number(number.replace(/,/g, ''))
  }
  return NaN
}

function parseIntegerValue(value: string) {
  const number = value.trim()
  return /^-?\d+$/.test(number) ? Number(number) : NaN
}

function parseBooleanValue(value: string) {
  const normalizedValue = normalizeKey(value)

  if (
    ['true', '1', 'yes', 'y', 'active', 'si', 'activo'].includes(
      normalizedValue,
    )
  ) {
    return true
  }

  if (
    ['false', '0', 'no', 'n', 'inactive', 'inactivo'].includes(normalizedValue)
  ) {
    return false
  }

  return value
}

function normalizeUnitValue(value: string) {
  const aliases: Record<string, ProductUnit> = {
    unidad: 'UNIT',
    unidades: 'UNIT',
    und: 'UNIT',
    kilo: 'KG',
    kilogramo: 'KG',
    gramo: 'GRAM',
    g: 'GRAM',
    litro: 'LITER',
    l: 'LITER',
    mililitro: 'MILLILITER',
    ml: 'MILLILITER',
    metro: 'METER',
    m: 'METER',
    caja: 'BOX',
    paquete: 'PACK',
    servicio: 'SERVICE',
  }
  const normalizedValue =
    aliases[normalizeKey(value)] ??
    value.trim().toUpperCase().replace(/\s+/g, '_')

  return acceptedUnits.has(normalizedValue as ProductUnit)
    ? normalizedValue
    : value
}

function toImportRowInput(
  parsedRow: ProductImportRowSchemaValues,
): ProductImportRowInput {
  return {
    rowNumber: parsedRow.rowNumber,
    name: parsedRow.name.trim(),
    description: normalizeOptionalText(parsedRow.description),
    sku: normalizeOptionalText(parsedRow.sku),
    barcode: normalizeOptionalText(parsedRow.barcode),
    cost: parsedRow.cost,
    price: parsedRow.price,
    stock: parsedRow.stock,
    minStock: parsedRow.minStock,
    unit: parsedRow.unit,
    isActive: parsedRow.isActive,
  }
}

function normalizeOptionalText(value: string | undefined) {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : undefined
}
