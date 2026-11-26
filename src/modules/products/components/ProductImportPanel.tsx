import { useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  UploadCloud,
  X,
} from 'lucide-react'
import { AppButton } from '@/shared/components/ui/AppButton'
import {
  getProductImportTemplateRows,
  productImportTemplateCopy,
} from '@/modules/products/i18n/product-import-template'
import type {
  ProductImportMutationInput,
  ProductImportResult,
  ProductImportRowInput,
} from '@/modules/products/types/product'
import {
  MAX_PRODUCT_IMPORT_ROWS,
  parseProductsImportFile,
} from '@/modules/products/utils/parse-products-import-csv'
import { downloadBlobFile } from '@/shared/utils/download-blob-file'
import { getProductUnitLabel } from '@/modules/products/utils/product-unit-options'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { useLanguageStore } from '@/shared/i18n/use-language-store'
import styles from './ProductImportPanel.module.css'

type ProductImportPanelProps = {
  isImporting: boolean
  onImport: (input: ProductImportMutationInput) => Promise<ProductImportResult>
}

const previewSize = 10
const priceFormat = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function ProductImportPanel({
  isImporting,
  onImport,
}: ProductImportPanelProps) {
  const language = useLanguageStore((state) => state.code)
  const templateCopy = productImportTemplateCopy[language]
  const fileInput = useRef<HTMLInputElement>(null)
  const readingId = useRef(0)
  const submitting = useRef(false)
  const [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [rows, setRows] = useState<ProductImportRowInput[]>([])
  const [issues, setIssues] = useState<string[]>([])
  const [visibleRows, setVisibleRows] = useState(previewSize)
  const [result, setResult] = useState<ProductImportResult>()
  const [submitError, setSubmitError] = useState('')
  const [templateError, setTemplateError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const canImport =
    rows.length > 0 && !issues.length && !reading && !isImporting && !result

  function clear() {
    readingId.current += 1
    setReading(false)
    setFileName('')
    setRows([])
    setIssues([])
    setVisibleRows(previewSize)
    setResult(undefined)
    setSubmitError('')
    if (fileInput.current) fileInput.current.value = ''
  }

  async function readFile(file: File) {
    if (submitting.current) return
    clear()
    const id = readingId.current
    setFileName(file.name)
    setReading(true)
    try {
      const parsed = await parseProductsImportFile(file)
      if (id !== readingId.current) return
      setRows(parsed.rows)
      setIssues(parsed.issues)
    } catch {
      if (id === readingId.current)
        setIssues([
          'No pudimos leer el archivo. Ábrelo en Excel, guárdalo de nuevo y vuelve a seleccionarlo.',
        ])
    } finally {
      if (id === readingId.current) setReading(false)
    }
  }

  async function downloadTemplate() {
    setTemplateError('')
    setDownloading(true)
    try {
      const XLSX = await import('xlsx')
      const { headers, example } = getProductImportTemplateRows(language)
      const book = XLSX.utils.book_new()
      const sheet = XLSX.utils.aoa_to_sheet([headers, example])
      sheet['!cols'] = headers.map((header, index) => ({
        wch: Math.max(header.length, String(example[index]).length, 13) + 3,
      }))
      XLSX.utils.book_append_sheet(book, sheet, templateCopy.sheetName)
      const bytes = XLSX.write(book, { bookType: 'xlsx', type: 'array' })
      downloadBlobFile(
        new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        templateCopy.fileName,
      )
    } catch {
      setTemplateError(templateCopy.error)
    } finally {
      setDownloading(false)
    }
  }

  async function importProducts() {
    if (!canImport || submitting.current) return
    submitting.current = true
    setSubmitError('')
    try {
      setResult(await onImport({ rows }))
      setVisibleRows(previewSize)
    } catch (error) {
      setSubmitError(
        getErrorMessage(
          error,
          'No pudimos importar el archivo. Inténtalo de nuevo.',
        ),
      )
    } finally {
      submitting.current = false
    }
  }

  return (
    <div className={styles.panel} aria-busy={reading || isImporting}>
      <div className={styles.toolbar}>
        <p>
          Prepara hasta <strong>{MAX_PRODUCT_IMPORT_ROWS} productos</strong> por
          archivo. Los campos obligatorios son nombre, precio y existencias.
        </p>
        <AppButton
          size="sm"
          variant="secondary"
          isLoading={downloading}
          startIcon={<Download aria-hidden="true" />}
          onClick={() => void downloadTemplate()}
        >
          {templateCopy.button}
        </AppButton>
      </div>
      {templateError ? (
        <p className={styles.error} role="alert">
          {templateError}
        </p>
      ) : null}

      <div
        className={styles.dropzone}
        data-dragging={dragging}
        onDragOver={(event) => {
          event.preventDefault()
          if (!isImporting) setDragging(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const files = event.dataTransfer.files
          if (submitting.current || !files.length) return
          if (files.length > 1) {
            clear()
            setIssues(['Selecciona un solo archivo por carga.'])
          } else {
            void readFile(files[0])
          }
        }}
      >
        <span className={styles.fileIcon}>
          <FileSpreadsheet aria-hidden="true" />
        </span>
        <div className={styles.fileDetails}>
          <strong>{fileName || 'Selecciona o arrastra un archivo'}</strong>
          <span>
            {reading
              ? 'Validando el archivo…'
              : 'CSV, XLSX o XLS · Hasta 10 MB'}
          </span>
        </div>
        <div className={styles.fileActions}>
          <AppButton
            size="sm"
            variant={fileName ? 'secondary' : 'primary'}
            disabled={isImporting}
            startIcon={<UploadCloud aria-hidden="true" />}
            onClick={() => fileInput.current?.click()}
          >
            {fileName ? 'Cambiar archivo' : 'Elegir archivo'}
          </AppButton>
          {fileName ? (
            <AppButton
              size="sm"
              variant="ghost"
              disabled={isImporting}
              iconOnly
              aria-label="Quitar archivo"
              onClick={clear}
            >
              <X aria-hidden="true" />
            </AppButton>
          ) : null}
        </div>
        <input
          aria-label="Archivo de productos"
          type="file"
          hidden
          ref={fileInput}
          accept=".csv,.xlsx,.xls"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void readFile(file)
          }}
        />
      </div>

      {!fileName && !issues.length ? (
        <details className={styles.notes}>
          <summary>¿Cómo se actualizan los productos?</summary>
          <p>
            CashGo busca primero el SKU o el código de barras. Si no incluyes
            ninguno, busca un nombre único. Las columnas opcionales vacías
            conservan los datos guardados. Las existencias del archivo
            reemplazan las actuales.
          </p>
        </details>
      ) : null}

      {issues.length > 0 ? (
        <section className={styles.error} role="alert">
          <h3>
            <AlertCircle aria-hidden="true" /> Corrige el archivo para importar
          </h3>
          <ul>
            {issues.slice(0, 5).map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
          {issues.length > 5 ? (
            <details>
              <summary>Ver {issues.length - 5} avisos más</summary>
              <ul>
                {issues.slice(5).map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <section className={styles.section}>
          <div className={styles.success} role="status">
            <h3>
              <CheckCircle2 aria-hidden="true" /> Importación completada
            </h3>
            <dl>
              <div>
                <dt>Creados</dt>
                <dd>{result.createdCount}</dd>
              </div>
              <div>
                <dt>Actualizados</dt>
                <dd>{result.updatedCount}</dd>
              </div>
              <div>
                <dt>Stock ajustado</dt>
                <dd>{result.stockAdjustedCount}</dd>
              </div>
            </dl>
          </div>
          <ul className={styles.rows}>
            {result.results.slice(0, visibleRows).map((row) => (
              <li className={styles.resultRow} key={row.rowNumber}>
                <strong>
                  Fila {row.rowNumber} · {row.productName}
                </strong>
                <span>{row.message}</span>
              </li>
            ))}
          </ul>
          <MoreRows
            count={result.results.length}
            visible={visibleRows}
            onMore={() => setVisibleRows((current) => current + previewSize)}
          />
        </section>
      ) : rows.length ? (
        <section className={styles.section} aria-label="Vista previa">
          <div className={styles.sectionHeader}>
            <h3>Vista previa</h3>
            <span>
              {rows.length}{' '}
              {rows.length === 1 ? 'fila válida' : 'filas válidas'}
            </span>
          </div>
          <ul className={styles.rows}>
            {rows.slice(0, visibleRows).map((row) => (
              <li className={styles.previewRow} key={row.rowNumber}>
                <div className={styles.product}>
                  <strong>{row.name}</strong>
                  <span>
                    Fila {row.rowNumber}
                    {row.sku ? ` · SKU ${row.sku}` : ''}
                    {row.barcode ? ` · Código ${row.barcode}` : ''}
                  </span>
                </div>
                <div>
                  <span>Precio</span>
                  <strong>{priceFormat.format(row.price)}</strong>
                </div>
                <div>
                  <span>Existencias</span>
                  <strong>{row.stock}</strong>
                </div>
                {row.description ||
                row.cost !== undefined ||
                row.minStock !== undefined ||
                row.unit ||
                row.isActive !== undefined ? (
                  <details className={styles.rowDetails}>
                    <summary>Más datos</summary>
                    {row.description ? <span>{row.description}</span> : null}
                    {row.cost !== undefined ? (
                      <span>Costo: {priceFormat.format(row.cost)}</span>
                    ) : null}
                    {row.minStock !== undefined ? (
                      <span>Stock mínimo: {row.minStock}</span>
                    ) : null}
                    {row.unit ? (
                      <span>Unidad: {getProductUnitLabel(row.unit)}</span>
                    ) : null}
                    {row.isActive !== undefined ? (
                      <span>
                        Estado: {row.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    ) : null}
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
          <MoreRows
            count={rows.length}
            visible={visibleRows}
            onMore={() => setVisibleRows((current) => current + previewSize)}
          />
        </section>
      ) : null}

      {submitError ? (
        <p className={styles.error} role="alert">
          {submitError}
        </p>
      ) : null}
      {!result && rows.length > 0 ? (
        <div className={styles.confirmBar}>
          <p>
            {issues.length
              ? 'Corrige los errores antes de importar.'
              : 'Las existencias de este archivo reemplazarán las actuales.'}
          </p>
          <AppButton
            disabled={!canImport}
            isLoading={isImporting}
            loadingLabel="Importando…"
            onClick={() => void importProducts()}
          >
            Importar {rows.length}{' '}
            {rows.length === 1 ? 'producto' : 'productos'}
          </AppButton>
        </div>
      ) : null}
    </div>
  )
}

function MoreRows({
  count,
  visible,
  onMore,
}: {
  count: number
  visible: number
  onMore: () => void
}) {
  return count > previewSize ? (
    <div className={styles.more}>
      <span>
        Mostrando {Math.min(visible, count)} de {count}
      </span>
      {visible < count ? (
        <AppButton size="sm" variant="secondary" onClick={onMore}>
          Ver más filas
        </AppButton>
      ) : null}
    </div>
  ) : null
}
