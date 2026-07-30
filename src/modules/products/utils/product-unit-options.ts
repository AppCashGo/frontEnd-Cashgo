import type { ProductUnit } from '@/modules/products/types/product'

export const productUnitOptions: Array<{
  label: string
  value: ProductUnit
}> = [
  { value: 'UNIT', label: 'Unidad' },
  { value: 'KG', label: 'Kilogramo' },
  { value: 'GRAM', label: 'Gramo' },
  { value: 'LITER', label: 'Litro' },
  { value: 'MILLILITER', label: 'Mililitro' },
  { value: 'METER', label: 'Metro' },
  { value: 'BOX', label: 'Caja' },
  { value: 'PACK', label: 'Pack' },
  { value: 'SERVICE', label: 'Servicio' },
]

export function getProductUnitLabel(unit: ProductUnit) {
  return (
    productUnitOptions.find((option) => option.value === unit)?.label ?? unit
  )
}
