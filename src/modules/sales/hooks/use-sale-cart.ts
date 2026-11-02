import { useEffect, useMemo, useState } from 'react'
import type { Product } from '@/modules/products/types/product'
import type { SaleCartItem, SaleReceipt } from '@/modules/sales/types/sale'

type CartEntry = {
  productId: string
  quantity: number
  unitPrice: number
}

type UseSaleCartOptions = {
  allowSaleWithoutStock?: boolean
  persistenceKey?: string
}

function removePersistedCart(persistenceKey: string) {
  try {
    window.localStorage.removeItem(persistenceKey)
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function useSaleCart(
  products: Product[],
  options: UseSaleCartOptions = {},
) {
  const allowSaleWithoutStock = options.allowSaleWithoutStock ?? false
  const persistenceKey = options.persistenceKey
  const [cartEntries, setCartEntries] = useState<CartEntry[]>([])
  const [hydratedPersistenceKey, setHydratedPersistenceKey] = useState<
    string | null
  >(null)
  const [checkoutErrorMessage, setCheckoutErrorMessage] = useState<
    string | null
  >(null)
  const [completedSale, setCompletedSale] = useState<SaleReceipt | null>(null)

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )
  const cartQuantitiesByProductId = new Map(
    cartEntries.map((entry) => [entry.productId, entry.quantity]),
  )
  const cartItems: SaleCartItem[] = cartEntries.flatMap((entry) => {
    const product = productsById.get(entry.productId)

    if (!product) {
      return []
    }

    return [
      {
        product,
        quantity: entry.quantity,
        unitPrice: entry.unitPrice,
        lineTotal: entry.unitPrice * entry.quantity,
      },
    ]
  })
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = cartItems.reduce((sum, item) => sum + item.lineTotal, 0)

  useEffect(() => {
    if (
      !persistenceKey ||
      products.length === 0 ||
      hydratedPersistenceKey === persistenceKey
    ) {
      return
    }

    try {
      const storedDraft = window.localStorage.getItem(persistenceKey)
      const parsedDraft = storedDraft ? (JSON.parse(storedDraft) as unknown) : null
      const storedEntries =
        parsedDraft &&
        typeof parsedDraft === 'object' &&
        'entries' in parsedDraft &&
        Array.isArray(parsedDraft.entries)
          ? parsedDraft.entries
          : []

      setCartEntries(
        storedEntries.flatMap((entry) => {
          if (!entry || typeof entry !== 'object') return []

          const candidate = entry as Partial<CartEntry>
          if (
            typeof candidate.productId !== 'string' ||
            !productsById.has(candidate.productId) ||
            !Number.isInteger(candidate.quantity) ||
            (candidate.quantity ?? 0) <= 0 ||
            !Number.isFinite(candidate.unitPrice) ||
            (candidate.unitPrice ?? -1) < 0
          ) {
            return []
          }

          return [candidate as CartEntry]
        }),
      )
    } catch {
      removePersistedCart(persistenceKey)
    } finally {
      setHydratedPersistenceKey(persistenceKey)
    }
  }, [hydratedPersistenceKey, persistenceKey, products.length, productsById])

  useEffect(() => {
    if (
      !persistenceKey ||
      hydratedPersistenceKey !== persistenceKey
    ) {
      return
    }

    if (cartEntries.length === 0) {
      removePersistedCart(persistenceKey)
      return
    }

    try {
      window.localStorage.setItem(
        persistenceKey,
        JSON.stringify({ entries: cartEntries, updatedAt: new Date().toISOString() }),
      )
    } catch {
      // The sale remains usable when storage is unavailable or full.
    }
  }, [cartEntries, hydratedPersistenceKey, persistenceKey])

  function clearCheckoutFeedback() {
    setCheckoutErrorMessage(null)
    setCompletedSale(null)
  }

  function addProduct(product: Product) {
    clearCheckoutFeedback()

    setCartEntries((currentEntries) => {
      const existingEntry = currentEntries.find(
        (entry) => entry.productId === product.id,
      )

      if (!existingEntry) {
        if (!allowSaleWithoutStock && product.stock <= 0) {
          return currentEntries
        }

        return [
          ...currentEntries,
          {
            productId: product.id,
            quantity: 1,
            unitPrice: product.price,
          },
        ]
      }

      if (!allowSaleWithoutStock && existingEntry.quantity >= product.stock) {
        return currentEntries
      }

      return currentEntries.map((entry) =>
        entry.productId === product.id
          ? {
              ...entry,
              quantity: entry.quantity + 1,
            }
          : entry,
      )
    })
  }

  function increaseProductQuantity(productId: string) {
    clearCheckoutFeedback()

    setCartEntries((currentEntries) =>
      currentEntries.map((entry) => {
        if (entry.productId !== productId) {
          return entry
        }

        const product = productsById.get(productId)

        if (
          !product ||
          (!allowSaleWithoutStock && entry.quantity >= product.stock)
        ) {
          return entry
        }

        return {
          ...entry,
          quantity: entry.quantity + 1,
        }
      }),
    )
  }

  function decreaseProductQuantity(productId: string) {
    clearCheckoutFeedback()

    setCartEntries((currentEntries) =>
      currentEntries.flatMap((entry) => {
        if (entry.productId !== productId) {
          return [entry]
        }

        if (entry.quantity <= 1) {
          return []
        }

        return [
          {
            ...entry,
            quantity: entry.quantity - 1,
          },
        ]
      }),
    )
  }

  function setProductQuantity(productId: string, quantity: number) {
    clearCheckoutFeedback()

    if (!Number.isInteger(quantity) || quantity < 1) {
      return
    }

    setCartEntries((currentEntries) =>
      currentEntries.map((entry) => {
        if (entry.productId !== productId) {
          return entry
        }

        const product = productsById.get(productId)

        if (!product) {
          return entry
        }

        return {
          ...entry,
          quantity: allowSaleWithoutStock
            ? quantity
            : Math.min(quantity, product.stock),
        }
      }),
    )
  }

  function removeProduct(productId: string) {
    clearCheckoutFeedback()

    setCartEntries((currentEntries) =>
      currentEntries.filter((entry) => entry.productId !== productId),
    )
  }

  function clearCart() {
    clearCheckoutFeedback()
    setCartEntries([])
  }

  function loadCart(
    entries: Array<{ productId: string; quantity: number; unitPrice: number }>,
  ) {
    clearCheckoutFeedback()
    setCartEntries(
      entries
        .filter(
          (entry) =>
            productsById.has(entry.productId) &&
            Number.isInteger(entry.quantity) &&
            entry.quantity > 0 &&
            Number.isFinite(entry.unitPrice) &&
            entry.unitPrice >= 0,
        )
        .map((entry) => ({ ...entry })),
    )
  }

  function markCheckoutError(message: string) {
    setCompletedSale(null)
    setCheckoutErrorMessage(message)
  }

  function completeSale(saleReceipt: SaleReceipt) {
    setCartEntries([])
    setCheckoutErrorMessage(null)
    setCompletedSale(saleReceipt)
  }

  return {
    cartItems,
    cartQuantitiesByProductId,
    checkoutErrorMessage,
    completedSale,
    totalItems,
    totalAmount,
    addProduct,
    clearCart,
    clearCheckoutFeedback,
    completeSale,
    decreaseProductQuantity,
    increaseProductQuantity,
    loadCart,
    markCheckoutError,
    removeProduct,
    setProductQuantity,
  }
}
