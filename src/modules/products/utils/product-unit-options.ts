import type { ProductUnit } from '@/modules/products/types/product'

export const productUnitOptions: Array<{
  label: string
  value: ProductUnit
}> = [
  { value: 'UNIT', label: 'Unit' },
  { value: 'KG', label: 'Kilogram' },
  { value: 'GRAM', label: 'Gram' },
  { value: 'LITER', label: 'Liter' },
  { value: 'MILLILITER', label: 'Milliliter' },
  { value: 'METER', label: 'Meter' },
  { value: 'BOX', label: 'Box' },
  { value: 'PACK', label: 'Pack' },
  { value: 'SERVICE', label: 'Service' },
]

export function getProductUnitLabel(unit: ProductUnit) {
  return (
    productUnitOptions.find((option) => option.value === unit)?.label ?? unit
  )
}
