export const inventoryTaxOptions = [
  {
    id: 'iva-general',
    label: 'IVA General',
    rate: 19,
  },
  {
    id: 'iva-reducido',
    label: 'IVA Reducido',
    rate: 5,
  },
  {
    id: 'impoconsumo-rest',
    label: 'Impoconsumo Bares y Rest.',
    rate: 8,
  },
  {
    id: 'iva-exento',
    label: 'IVA Exento / Excluido',
    rate: 0,
  },
  {
    id: 'ninguno',
    label: 'Ninguno',
    rate: 0,
  },
] as const
