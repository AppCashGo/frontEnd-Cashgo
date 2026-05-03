import * as XLSX from 'xlsx'
import {
  productImportRowSchema,
  type ProductImportRowSchemaValues,
} from '@/modules/products/schemas/product-import-row-schema'
import type {
  ProductImportRowInput,
  ProductUnit,
} from '@/modules/products/types/product'

type ParsedImportData = {
  rows: ProductImportRowInput[]
  issues: string[]
}

const supportedHeaders = {
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
} as const

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
  return parseProductsImportRows(parseCsvRows(csvContent))
}

export async function parseProductsImportFile(
  file: File,
): Promise<ParsedImportData> {
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const workbookBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(workbookBuffer, {
      type: 'array',
    })
    const firstSheetName = workbook.SheetNames[0]

    if (!firstSheetName) {
      return {
        rows: [],
        issues: ['The spreadsheet does not include any sheets to import.'],
      }
    }

    const worksheet = workbook.Sheets[firstSheetName]
    const sheetRows = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(
      worksheet,
      {
        header: 1,
        raw: false,
        defval: '',
      },
    )

    return parseProductsImportRows(
      sheetRows.map((row) => row.map((cell) => String(cell ?? ''))),
    )
  }

  const fileContent = await file.text()

  return parseProductsImportCsv(fileContent)
}

function parseProductsImportRows(parsedRows: string[][]): ParsedImportData {

  if (parsedRows.length === 0) {
    return {
      rows: [],
      issues: ['The file is empty. Please upload a CSV with at least one row.'],
    }
  }

  const [headerRow, ...dataRows] = parsedRows
  const normalizedHeaderMap = headerRow.map((header) =>
    normalizeHeader(header),
  )
  const issues: string[] = []
  const rows: ProductImportRowInput[] = []

  if (!normalizedHeaderMap.includes('name')) {
    issues.push('The CSV must include a "name" column.')
  }

  if (!normalizedHeaderMap.includes('price')) {
    issues.push('The CSV must include a "price" column.')
  }

  if (!normalizedHeaderMap.includes('stock')) {
    issues.push('The CSV must include a "stock" column.')
  }

  if (issues.length > 0) {
    return {
      rows: [],
      issues,
    }
  }

  dataRows.forEach((rawRow, rowIndex) => {
    if (rawRow.every((cell) => cell.trim().length === 0)) {
      return
    }

    const rowNumber = rowIndex + 2
    const record = mapRowToRecord(normalizedHeaderMap, rawRow, rowNumber)
    const parsedRecord = productImportRowSchema.safeParse(record)

    if (!parsedRecord.success) {
      parsedRecord.error.issues.forEach((issue) => {
        issues.push(`Row ${rowNumber}: ${issue.message}`)
      })
      return
    }

    rows.push(toImportRowInput(parsedRecord.data))
  })

  return {
    rows,
    issues,
  }
}

function parseCsvRows(csvContent: string) {
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

    if (character === ',' && !insideQuotes) {
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

  currentRow.push(currentValue)

  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow)
  }

  return rows
}

function normalizeHeader(header: string) {
  const sanitizedHeader = header.trim().toLowerCase().replace(/[\s_-]+/g, '')

  return (
    supportedHeaders[sanitizedHeader as keyof typeof supportedHeaders] ??
    sanitizedHeader
  )
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

    record[header] = rawValue
  })

  return record
}

function parseDecimalValue(value: string) {
  const normalizedValue = value.replace(/\s/g, '').replace(',', '.')

  return Number(normalizedValue)
}

function parseIntegerValue(value: string) {
  const normalizedValue = value.replace(/\s/g, '')

  return Number.parseInt(normalizedValue, 10)
}

function parseBooleanValue(value: string) {
  const normalizedValue = value.trim().toLowerCase()

  if (['true', '1', 'yes', 'y', 'active'].includes(normalizedValue)) {
    return true
  }

  if (['false', '0', 'no', 'n', 'inactive'].includes(normalizedValue)) {
    return false
  }

  return value
}

function normalizeUnitValue(value: string) {
  const normalizedValue = value.trim().toUpperCase().replace(/\s+/g, '_')

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
