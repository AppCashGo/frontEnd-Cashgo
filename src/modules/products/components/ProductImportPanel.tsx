import { ChangeEvent, useRef, useState } from 'react'
import type {
  ProductImportMutationInput,
  ProductImportResult,
  ProductImportRowInput,
} from '@/modules/products/types/product'
import { parseProductsImportFile } from '@/modules/products/utils/parse-products-import-csv'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { ApiError } from '@/shared/services/api-client'
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

  return 'The inventory import could not be completed right now.'
}

function formatBoolean(value: boolean | undefined) {
  if (value === undefined) {
    return 'Default'
  }

  return value ? 'Active' : 'Inactive'
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
    const templateUrl = URL.createObjectURL(templateBlob)
    const linkElement = document.createElement('a')

    linkElement.href = templateUrl
    linkElement.download = 'cashgo-product-import-template.csv'
    linkElement.click()

    URL.revokeObjectURL(templateUrl)
  }

  const canImport = previewRows.length > 0 && issues.length === 0 && !isImporting

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Bulk upload</p>
          <h2 className={styles.title}>Load inventory from CSV</h2>
          <p className={styles.description}>
            Upload an Excel or CSV file, preview the rows and import products in
            one pass. Existing products match by SKU first and then by exact name.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={handleDownloadTemplate}
          >
            Download template
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose file
          </button>
        </div>
      </div>

      <div className={styles.dropzone}>
        <div className={styles.dropzoneCopy}>
          <p className={styles.dropzoneTitle}>
            {fileName ? fileName : 'Bring your inventory file here'}
          </p>
          <p className={styles.dropzoneDescription}>
            Accepted columns: name, price, stock, sku, cost, minStock, unit and
            isActive. File types: .csv, .xlsx and .xls.
          </p>
        </div>

        <div className={styles.dropzoneActions}>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            {fileName ? 'Replace file' : 'Upload file'}
          </button>

          <button
            className={styles.ghostButton}
            disabled={!fileName}
            type="button"
            onClick={handleClear}
          >
            Clear
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
          <strong>1. Prepare the file</strong>
          <span>Use the template or export a CSV from your spreadsheet.</span>
        </div>
        <div className={styles.tipCard}>
          <strong>2. Review the preview</strong>
          <span>Cashgo validates prices, stock, SKU and unit before import.</span>
        </div>
        <div className={styles.tipCard}>
          <strong>3. Sync the catalog</strong>
          <span>Rows create or update products and adjust stock automatically.</span>
        </div>
      </div>

      {issues.length > 0 ? (
        <div className={styles.issueBox} role="alert">
          <p className={styles.issueTitle}>We found a few things to fix first</p>
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
              <p className={styles.previewEyebrow}>Preview</p>
              <h3 className={styles.previewTitle}>
                {previewRows.length} row{previewRows.length === 1 ? '' : 's'} ready
                to import
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
              {isImporting ? 'Importing inventory...' : 'Import inventory'}
            </button>
          </div>

          <div className={styles.previewTableWrapper}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Product</th>
                  <th scope="col">SKU</th>
                  <th scope="col">Price</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, 6).map((row) => (
                  <tr key={`${row.rowNumber}-${row.name}`}>
                    <td>{row.rowNumber}</td>
                    <td>
                      <div className={styles.productCell}>
                        <strong>{row.name}</strong>
                        <span>{row.description ?? 'No description'}</span>
                      </div>
                    </td>
                    <td>{row.sku ?? 'No SKU'}</td>
                    <td>{row.price}</td>
                    <td>
                      {row.stock}
                      {row.minStock !== undefined ? ` / min ${row.minStock}` : ''}
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
              Showing the first 6 rows of {previewRows.length}. The full file
              will be imported.
            </p>
          ) : null}
        </div>
      ) : null}

      {submitError ? (
        <div className={styles.issueBox} role="alert">
          <p className={styles.issueTitle}>Import failed</p>
          <p className={styles.submitError}>{submitError}</p>
        </div>
      ) : null}

      {result ? (
        <div className={styles.resultBox}>
          <div className={styles.resultSummary}>
            <div>
              <span className={styles.resultValue}>{result.createdCount}</span>
              <span className={styles.resultLabel}>Created</span>
            </div>
            <div>
              <span className={styles.resultValue}>{result.updatedCount}</span>
              <span className={styles.resultLabel}>Updated</span>
            </div>
            <div>
              <span className={styles.resultValue}>
                {result.stockAdjustedCount}
              </span>
              <span className={styles.resultLabel}>Stock adjusted</span>
            </div>
          </div>

          <div className={styles.resultList}>
            {result.results.slice(0, 5).map((line) => (
              <div className={styles.resultItem} key={`${line.rowNumber}-${line.productId}`}>
                <strong>
                  Row {line.rowNumber} · {line.productName}
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
