import { ChangeEvent, useRef, useState } from 'react'
import type {
  ProductImportMutationInput,
  ProductImportResult,
  ProductImportRowInput,
} from '@/modules/products/types/product'
import { parseProductsImportFile } from '@/modules/products/utils/parse-products-import-csv'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { ApiError } from '@/shared/services/api-client'
import { downloadBlobFile } from '@/shared/utils/download-blob-file'
import styles from './ProductImportPanel.module.css'

type ProductImportPanelProps = {
  isImporting: boolean
  onImport: (input: ProductImportMutationInput) => Promise<ProductImportResult>
}

const templateHeaders = [
  'name',
  'description',
  'sku',
  'barcode',
  'cost',
  'price',
  'stock',
  'minStock',
  'unit',
  'isActive',
] as const

const templateRows = [
  [
    'Notebook A5',
    'Hardcover notebook for daily sales',
    'NB-A5-001',
    '770000000001',
    '8500',
    '12900',
    '24',
    '5',
    'UNIT',
    'true',
  ],
  [
    'Ground coffee 500g',
    'House blend bag',
    'COF-500',
    '',
    '14000',
    '19800',
    '18',
    '4',
    'PACK',
    'true',
  ],
] as const

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'No pudimos completar la importación en este momento.'
}

function formatBoolean(value: boolean | undefined) {
  if (value === undefined) {
    return 'Predeterminado'
  }

  return value ? 'Activo' : 'Inactivo'
}

export function ProductImportPanel({
  isImporting,
  onImport,
}: ProductImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<ProductImportRowInput[]>([])
  const [issues, setIssues] = useState<string[]>([])
  const [result, setResult] = useState<ProductImportResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const parsedImportData = await parseProductsImportFile(file)

    setFileName(file.name)
    setPreviewRows(parsedImportData.rows)
    setIssues(parsedImportData.issues)
    setResult(null)
    setSubmitError(null)
  }

  function handleClear() {
    setFileName(null)
    setPreviewRows([])
    setIssues([])
    setResult(null)
    setSubmitError(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleImport() {
    if (previewRows.length === 0 || issues.length > 0) {
      return
    }

    try {
      const importResult = await onImport({
        rows: previewRows,
      })

      setResult(importResult)
      setSubmitError(null)
    } catch (error) {
      setSubmitError(getErrorMessage(error))
    }
  }

  function handleDownloadTemplate() {
    const csvLines = [
      templateHeaders.join(','),
      ...templateRows.map((row) => row.map(escapeCsvCell).join(',')),
    ]
    const templateBlob = new Blob([csvLines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    })

    downloadBlobFile(templateBlob, 'cashgo-product-import-template.csv')
  }

  const canImport = previewRows.length > 0 && issues.length === 0 && !isImporting

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Carga masiva</p>
          <h2 className={styles.title}>Importa tu catálogo</h2>
          <p className={styles.description}>
            Sube un archivo Excel o CSV, revisa la vista previa e importa los
            productos. Los existentes se identifican primero por SKU y luego por nombre.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={handleDownloadTemplate}
          >
            Descargar plantilla
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Elegir archivo
          </button>
        </div>
      </div>

      <div className={styles.dropzone}>
        <div className={styles.dropzoneCopy}>
          <p className={styles.dropzoneTitle}>
            {fileName ? fileName : 'Selecciona tu archivo de productos'}
          </p>
          <p className={styles.dropzoneDescription}>
            Columnas admitidas: name, price, stock, sku, cost, minStock, unit e
            isActive. Formatos: .csv, .xlsx y .xls.
          </p>
        </div>

        <div className={styles.dropzoneActions}>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            {fileName ? 'Reemplazar archivo' : 'Subir archivo'}
          </button>

          <button
            className={styles.ghostButton}
            disabled={!fileName}
            type="button"
            onClick={handleClear}
          >
            Limpiar
          </button>
        </div>

        <input
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className={styles.fileInput}
          ref={fileInputRef}
          type="file"
          onChange={(event) => {
            void handleFileChange(event)
          }}
        />
      </div>

      <div className={styles.tipGrid}>
        <div className={styles.tipCard}>
          <strong>1. Prepara el archivo</strong>
          <span>Usa la plantilla o exporta un CSV desde tu hoja de cálculo.</span>
        </div>
        <div className={styles.tipCard}>
          <strong>2. Revisa la vista previa</strong>
          <span>Cashgo valida precios, stock, SKU y unidad antes de importar.</span>
        </div>
        <div className={styles.tipCard}>
          <strong>3. Sincroniza el catálogo</strong>
          <span>Las filas crean o actualizan productos y ajustan su stock.</span>
        </div>
      </div>

      {issues.length > 0 ? (
        <div className={styles.issueBox} role="alert">
          <p className={styles.issueTitle}>Hay datos que debes corregir primero</p>
          <ul className={styles.issueList}>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {previewRows.length > 0 ? (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <div>
              <p className={styles.previewEyebrow}>Vista previa</p>
              <h3 className={styles.previewTitle}>
                {previewRows.length} fila{previewRows.length === 1 ? '' : 's'} lista{previewRows.length === 1 ? '' : 's'} para importar
              </h3>
            </div>

            <button
              className={styles.primaryButton}
              disabled={!canImport}
              type="button"
              onClick={() => {
                void handleImport()
              }}
            >
              {isImporting ? 'Importando productos...' : 'Importar productos'}
            </button>
          </div>

          <div className={styles.previewTableWrapper}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th scope="col">Fila</th>
                  <th scope="col">Producto</th>
                  <th scope="col">SKU</th>
                  <th scope="col">Precio</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Unidad</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, 6).map((row) => (
                  <tr key={`${row.rowNumber}-${row.name}`}>
                    <td>{row.rowNumber}</td>
                    <td>
                      <div className={styles.productCell}>
                        <strong>{row.name}</strong>
                        <span>{row.description ?? 'Sin descripción'}</span>
                      </div>
                    </td>
                    <td>{row.sku ?? 'Sin SKU'}</td>
                    <td>{row.price}</td>
                    <td>
                      {row.stock}
                      {row.minStock !== undefined ? ` / mín. ${row.minStock}` : ''}
                    </td>
                    <td>{row.unit ?? 'UNIT'}</td>
                    <td>{formatBoolean(row.isActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewRows.length > 6 ? (
            <p className={styles.previewFootnote}>
              Mostrando las primeras 6 filas de {previewRows.length}. Se
              importará el archivo completo.
            </p>
          ) : null}
        </div>
      ) : null}

      {submitError ? (
        <div className={styles.issueBox} role="alert">
          <p className={styles.issueTitle}>La importación falló</p>
          <p className={styles.submitError}>{submitError}</p>
        </div>
      ) : null}

      {result ? (
        <div className={styles.resultBox}>
          <div className={styles.resultSummary}>
            <div>
              <span className={styles.resultValue}>{result.createdCount}</span>
              <span className={styles.resultLabel}>Creados</span>
            </div>
            <div>
              <span className={styles.resultValue}>{result.updatedCount}</span>
              <span className={styles.resultLabel}>Actualizados</span>
            </div>
            <div>
              <span className={styles.resultValue}>
                {result.stockAdjustedCount}
              </span>
              <span className={styles.resultLabel}>Stock ajustado</span>
            </div>
          </div>

          <div className={styles.resultList}>
            {result.results.slice(0, 5).map((line) => (
              <div className={styles.resultItem} key={`${line.rowNumber}-${line.productId}`}>
                <strong>
                  Fila {line.rowNumber} · {line.productName}
                </strong>
                <span>{line.message}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </SurfaceCard>
  )
}

function escapeCsvCell(value: string) {
  if (value.includes(',') || value.includes('"')) {
    return `"${value.split('"').join('""')}"`
  }

  return value
}
