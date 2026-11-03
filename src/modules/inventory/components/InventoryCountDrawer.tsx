import { Camera, Check, ClipboardList, ScanBarcode, Search, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarcodeScannerModal } from '@/shared/barcode/BarcodeScannerModal'
import { normalizeBarcode } from '@/shared/barcode/normalize-barcode'
import { playBarcodeScanSound } from '@/shared/barcode/barcode-scan-sound'
import { useHardwareBarcodeScanner } from '@/shared/barcode/use-hardware-barcode-scanner'
import { useApplyInventoryCountMutation } from '@/modules/inventory/hooks/use-inventory-query'
import type { InventoryCountResult, InventoryProductCategory } from '@/modules/inventory/types/inventory'
import type { Product } from '@/modules/products/types/product'
import { matchesProductSearch } from '@/modules/products/utils/matches-product-search'
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './InventoryCountDrawer.module.css'

type CountStep = 'COUNT' | 'REVIEW'
type CountDraft = Record<string, string>

type InventoryCountDrawerProps = {
  isOpen: boolean
  products: Product[]
  categories: InventoryProductCategory[]
  persistenceKey: string
  onClose: () => void
  onApplied: (result: InventoryCountResult) => void
}

type StoredCountDraft = {
  version: 1
  counts: CountDraft
}

function readDraft(key: string): CountDraft {
  try {
    const rawDraft = window.localStorage.getItem(key)
    if (!rawDraft) return {}
    const parsedDraft = JSON.parse(rawDraft) as Partial<StoredCountDraft>
    if (parsedDraft.version !== 1 || !parsedDraft.counts) return {}

    return Object.fromEntries(
      Object.entries(parsedDraft.counts).filter(
        ([productId, value]) => productId && typeof value === 'string' && /^\d+$/.test(value),
      ),
    )
  } catch {
    return {}
  }
}

function getDifferenceLabel(difference: number) {
  if (difference === 0) return 'Sin diferencia'
  return difference > 0 ? `Sobran ${difference}` : `Faltan ${Math.abs(difference)}`
}

export function InventoryCountDrawer({
  isOpen,
  products,
  categories,
  persistenceKey,
  onClose,
  onApplied,
}: InventoryCountDrawerProps) {
  const applyCountMutation = useApplyInventoryCountMutation()
  const [step, setStep] = useState<CountStep>('COUNT')
  const [counts, setCounts] = useState<CountDraft>({})
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [reason, setReason] = useState('Conteo físico general')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isScannerOpen, setScannerOpen] = useState(false)
  const countInputRefs = useRef(new Map<string, HTMLInputElement>())

  const countableProducts = useMemo(
    () => products.filter((product) => product.isActive && product.productType !== 'VARIANT_PARENT'),
    [products],
  )
  const countableProductIds = useMemo(
    () => new Set(countableProducts.map((product) => product.id)),
    [countableProducts],
  )

  useEffect(() => {
    if (!isOpen) return
    const storedCounts = readDraft(persistenceKey)
    setCounts(
      Object.fromEntries(
        Object.entries(storedCounts).filter(([productId]) => countableProductIds.has(productId)),
      ),
    )
    setStep('COUNT')
    setErrorMessage(null)
  }, [countableProductIds, isOpen, persistenceKey])

  useEffect(() => {
    if (!isOpen) return
    try {
      const draft: StoredCountDraft = { version: 1, counts }
      window.localStorage.setItem(persistenceKey, JSON.stringify(draft))
    } catch {
      // The count remains available in memory when storage is unavailable.
    }
  }, [counts, isOpen, persistenceKey])

  const countedProducts = useMemo(
    () =>
      countableProducts.flatMap((product) => {
        const rawCount = counts[product.id]
        if (rawCount === undefined || rawCount === '') return []
        const countedStock = Number(rawCount)
        if (!Number.isInteger(countedStock) || countedStock < 0) return []
        return [{ product, countedStock, difference: countedStock - product.stock }]
      }),
    [countableProducts, counts],
  )
  const discrepancyProducts = useMemo(
    () => countedProducts.filter((item) => item.difference !== 0),
    [countedProducts],
  )
  const visibleProducts = useMemo(() => {
    return countableProducts.filter((product) => {
      if (categoryId && product.categoryId !== categoryId) return false
      if (pendingOnly && counts[product.id] !== undefined) return false
      return matchesProductSearch(product, search)
    })
  }, [categoryId, countableProducts, counts, pendingOnly, search])
  const countedValue = discrepancyProducts.reduce(
    (total, item) => total + item.difference * item.product.cost,
    0,
  )
  const progress = countableProducts.length
    ? Math.round((countedProducts.length / countableProducts.length) * 100)
    : 0

  const handleScan = useCallback(
    (rawBarcode: string, shouldPlaySound = true) => {
      const barcode = normalizeBarcode(rawBarcode)
      const product = countableProducts.find(
        (candidate) => normalizeBarcode(candidate.barcode ?? '') === barcode,
      )
      setScannerOpen(false)

      if (!product) {
        setErrorMessage(`No encontramos un producto con el código ${barcode}.`)
        return
      }

      if (shouldPlaySound) playBarcodeScanSound()
      setErrorMessage(null)
      setSearch(barcode)
      setCategoryId('')
      setPendingOnly(false)
      window.requestAnimationFrame(() => {
        const input = countInputRefs.current.get(product.id)
        input?.focus()
        input?.select()
      })
    },
    [countableProducts],
  )

  useHardwareBarcodeScanner({
    enabled: isOpen && step === 'COUNT' && !isScannerOpen,
    onScan: handleScan,
  })

  function updateCount(productId: string, value: string) {
    const normalizedValue = value.replace(/\D/g, '')
    setCounts((currentCounts) => {
      if (normalizedValue === '') {
        const nextCounts = { ...currentCounts }
        delete nextCounts[productId]
        return nextCounts
      }
      return { ...currentCounts, [productId]: normalizedValue }
    })
  }

  function focusNextPending(productId: string) {
    const currentIndex = visibleProducts.findIndex((product) => product.id === productId)
    const nextProduct = visibleProducts
      .slice(currentIndex + 1)
      .find((product) => counts[product.id] === undefined)
    if (!nextProduct) return
    const input = countInputRefs.current.get(nextProduct.id)
    input?.focus()
    input?.select()
  }

  async function applyCount() {
    if (countedProducts.length === 0) {
      setErrorMessage('Cuenta al menos un producto antes de finalizar.')
      setStep('COUNT')
      return
    }

    try {
      setErrorMessage(null)
      const result = await applyCountMutation.mutateAsync({
        items: countedProducts.map(({ product, countedStock }) => ({
          productId: product.id,
          countedStock,
        })),
        reason: reason.trim() || undefined,
      })
      window.localStorage.removeItem(persistenceKey)
      setCounts({})
      setStep('COUNT')
      onApplied(result)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'No pudimos aplicar el conteo. Revisa la información e inténtalo de nuevo.'))
    }
  }

  const footer = step === 'COUNT' ? (
    <div className={styles.footerActions}>
      <button className={styles.secondaryButton} type="button" onClick={onClose}>
        Guardar y salir
      </button>
      <button
        className={styles.primaryButton}
        disabled={countedProducts.length === 0}
        type="button"
        onClick={() => setStep('REVIEW')}
      >
        Revisar {countedProducts.length > 0 ? `(${countedProducts.length})` : ''}
      </button>
    </div>
  ) : (
    <div className={styles.footerActions}>
      <button className={styles.secondaryButton} type="button" onClick={() => setStep('COUNT')}>
        Volver al conteo
      </button>
      <button
        className={styles.primaryButton}
        disabled={applyCountMutation.isPending}
        type="button"
        onClick={() => void applyCount()}
      >
        {applyCountMutation.isPending ? 'Aplicando…' : 'Aplicar diferencias'}
      </button>
    </div>
  )

  return (
    <>
      <SideDrawer
        bodyClassName={styles.drawerBody}
        description="El avance se guarda automáticamente en este dispositivo."
        footer={footer}
        isCloseDisabled={applyCountMutation.isPending}
        isOpen={isOpen}
        panelClassName={styles.drawer}
        title={step === 'COUNT' ? 'Inventario físico' : 'Revisar diferencias'}
        onClose={onClose}
      >
        <div className={styles.progressCard}>
          <div>
            <span>Progreso del conteo</span>
            <strong>{countedProducts.length} de {countableProducts.length}</strong>
          </div>
          <div className={styles.progressTrack}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>{progress}% completado</small>
        </div>

        {errorMessage ? (
          <div className={styles.errorMessage} role="alert">
            <TriangleAlert aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {step === 'COUNT' ? (
          <>
            <div className={styles.filters}>
              <label className={styles.searchField}>
                <Search aria-hidden="true" />
                <input
                  data-barcode-scanner="true"
                  placeholder="Nombre, SKU o código de barras"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <button className={styles.scanButton} type="button" onClick={() => setScannerOpen(true)}>
                <Camera aria-hidden="true" />
                Escanear
              </button>
              <SearchableSelect value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">Todas las categorías</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </SearchableSelect>
              <label className={styles.pendingToggle}>
                <input
                  checked={pendingOnly}
                  type="checkbox"
                  onChange={(event) => setPendingOnly(event.target.checked)}
                />
                Mostrar solo pendientes
              </label>
            </div>

            <div className={styles.tip}>
              <ScanBarcode aria-hidden="true" />
              <span>Escanea el producto, escribe lo que encuentras físicamente y presiona Enter para continuar.</span>
            </div>

            <div className={styles.productList}>
              {visibleProducts.map((product) => {
                const rawCount = counts[product.id]
                const difference = rawCount === undefined ? null : Number(rawCount) - product.stock
                return (
                  <article className={styles.productRow} key={product.id}>
                    <div className={styles.productInfo}>
                      <strong>{product.name}</strong>
                      <span>{product.sku ?? product.barcode ?? 'Sin SKU ni código'}</span>
                    </div>
                    <div className={styles.systemStock}>
                      <span>Sistema</span>
                      <strong>{product.stock}</strong>
                    </div>
                    <label className={styles.countField}>
                      <span>Conteo físico</span>
                      <input
                        ref={(node) => {
                          if (node) countInputRefs.current.set(product.id, node)
                          else countInputRefs.current.delete(product.id)
                        }}
                        inputMode="numeric"
                        min="0"
                        placeholder="—"
                        type="text"
                        value={rawCount ?? ''}
                        onChange={(event) => updateCount(product.id, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            focusNextPending(product.id)
                          }
                        }}
                      />
                    </label>
                    <button
                      className={styles.sameButton}
                      type="button"
                      onClick={() => updateCount(product.id, String(product.stock))}
                    >
                      <Check aria-hidden="true" /> Igual
                    </button>
                    {difference !== null ? (
                      <span className={difference === 0 ? styles.differenceOk : difference > 0 ? styles.differencePositive : styles.differenceNegative}>
                        {getDifferenceLabel(difference)}
                      </span>
                    ) : (
                      <span className={styles.pendingLabel}>Pendiente</span>
                    )}
                  </article>
                )
              })}
              {visibleProducts.length === 0 ? (
                <div className={styles.emptyState}>No hay productos que coincidan con los filtros.</div>
              ) : null}
            </div>
          </>
        ) : (
          <div className={styles.reviewStack}>
            <div className={styles.reviewSummary}>
              <article><span>Contados</span><strong>{countedProducts.length}</strong></article>
              <article><span>Con diferencia</span><strong>{discrepancyProducts.length}</strong></article>
              <article><span>Impacto al costo</span><strong>{countedValue.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</strong></article>
            </div>
            <label className={styles.reasonField}>
              <span>Motivo que quedará en el historial</span>
              <input maxLength={255} value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            {discrepancyProducts.length > 0 ? (
              <div className={styles.discrepancyList}>
                {discrepancyProducts.map(({ product, countedStock, difference }) => (
                  <article key={product.id}>
                    <div><strong>{product.name}</strong><span>Sistema {product.stock} → Conteo {countedStock}</span></div>
                    <b className={difference > 0 ? styles.differencePositive : styles.differenceNegative}>
                      {difference > 0 ? '+' : ''}{difference}
                    </b>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.allGoodState}>
                <ClipboardList aria-hidden="true" />
                <strong>Todo coincide</strong>
                <span>No se modificará el stock de los productos contados.</span>
              </div>
            )}
          </div>
        )}
      </SideDrawer>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        title="Escanear producto para contar"
        onClose={() => setScannerOpen(false)}
        onDetected={(barcode) => handleScan(barcode, false)}
      />
    </>
  )
}
