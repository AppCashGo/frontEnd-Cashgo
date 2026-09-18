import { useEffect, useState } from 'react'

type SaleQuantityInputProps = {
  className?: string
  max?: number
  productName: string
  quantity: number
  onQuantityChange: (quantity: number) => void
}

export function SaleQuantityInput({
  className,
  max,
  productName,
  quantity,
  onQuantityChange,
}: SaleQuantityInputProps) {
  const [draftQuantity, setDraftQuantity] = useState(quantity.toString())

  useEffect(() => {
    setDraftQuantity(quantity.toString())
  }, [quantity])

  function restoreValidQuantity() {
    const parsedQuantity = Number(draftQuantity)

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setDraftQuantity(quantity.toString())
      return
    }

    const nextQuantity = max === undefined
      ? parsedQuantity
      : Math.min(parsedQuantity, max)

    setDraftQuantity(nextQuantity.toString())

    if (nextQuantity !== quantity) {
      onQuantityChange(nextQuantity)
    }
  }

  return (
    <input
      aria-label={`Cantidad de ${productName}`}
      className={className}
      inputMode="numeric"
      max={max}
      min={1}
      pattern="[0-9]*"
      type="number"
      value={draftQuantity}
      onBlur={restoreValidQuantity}
      onChange={(event) => {
        const nextDraft = event.target.value

        if (nextDraft !== '' && !/^\d+$/.test(nextDraft)) {
          return
        }

        setDraftQuantity(nextDraft)

        if (nextDraft === '') {
          return
        }

        const parsedQuantity = Number(nextDraft)

        if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
          return
        }

        const nextQuantity = max === undefined
          ? parsedQuantity
          : Math.min(parsedQuantity, max)

        if (nextQuantity !== parsedQuantity) {
          setDraftQuantity(nextQuantity.toString())
        }

        if (nextQuantity !== quantity) {
          onQuantityChange(nextQuantity)
        }
      }}
      onFocus={(event) => event.currentTarget.select()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        }
      }}
    />
  )
}
