import { useState } from 'react'
import type { Product } from '@/modules/products/types/product'
import type { SaleCartItem, SaleReceipt } from '@/modules/sales/types/sale'

type CartEntry = {
  productId: string
  quantity: number
}

type UseSaleCartOptions = {
  allowSaleWithoutStock?: boolean
}

export function useSaleCart(
  products: Product[],
  options: UseSaleCartOptions = {},
) {
  const allowSaleWithoutStock = options.allowSaleWithoutStock ?? false
  const [cartEntries, setCartEntries] = useState<CartEntry[]>([])
  const [checkoutErrorMessage, setCheckoutErrorMessage] = useState<
    string | null
  >(null)
  const [completedSale, setCompletedSale] = useState<SaleReceipt | null>(null)

  const productsById = new Map(products.map((product) => [product.id, product]))
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
        lineTotal: product.price * entry.quantity,
      },
    ]
  })
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = cartItems.reduce((sum, item) => sum + item.lineTotal, 0)

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
    markCheckoutError,
    removeProduct,
  }
}
