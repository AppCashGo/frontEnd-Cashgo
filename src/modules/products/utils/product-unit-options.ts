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

export function getProductUnitStockLabel(
  unit: ProductUnit,
  quantity: number,
) {
  const labels: Record<ProductUnit, [string, string]> = {
    UNIT: ['unidad', 'unidades'],
    KG: ['kg', 'kg'],
    GRAM: ['g', 'g'],
    LITER: ['L', 'L'],
    MILLILITER: ['ml', 'ml'],
    METER: ['m', 'm'],
    BOX: ['caja', 'cajas'],
    PACK: ['paquete', 'paquetes'],
    SERVICE: ['servicio', 'servicios'],
  }

  return labels[unit][quantity === 1 ? 0 : 1]
}
