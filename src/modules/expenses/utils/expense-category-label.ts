const defaultCategoryLabels: Record<string, string> = {
  Operations: 'Operaciones',
  Payroll: 'Nómina',
  Transport: 'Transporte',
  Supplies: 'Suministros',
  Services: 'Servicios',
}

export function getExpenseCategoryLabel(name: string) {
  return defaultCategoryLabels[name] ?? name
}
