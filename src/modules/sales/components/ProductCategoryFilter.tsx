import { SearchableSelect } from '@/shared/components/ui/SearchableSelect'
import styles from './ProductCategoryFilter.module.css'

export type ProductCategoryFilterOption = {
  id: string
  name: string
  productCount: number
}

type ProductCategoryFilterProps = {
  activeCategoryId: string | null
  categories: ProductCategoryFilterOption[]
  onChange: (categoryId: string | null) => void
}

const QUICK_CATEGORY_LIMIT = 5
const MORE_CATEGORIES_VALUE = '__MORE_CATEGORIES__'

function getCategoryOptionLabel(category: ProductCategoryFilterOption) {
  const productLabel = category.productCount === 1 ? 'producto' : 'productos'
  return `${category.name} · ${category.productCount} ${productLabel}`
}

export function ProductCategoryFilter({
  activeCategoryId,
  categories,
  onChange,
}: ProductCategoryFilterProps) {
  const quickCategories = categories.slice(0, QUICK_CATEGORY_LIMIT)
  const quickCategoryIds = new Set(quickCategories.map((category) => category.id))
  const remainingCategories = categories.filter(
    (category) => !quickCategoryIds.has(category.id),
  )
  const activeCategoryIsInMore =
    activeCategoryId !== null && !quickCategoryIds.has(activeCategoryId)
  const morePickerValue = activeCategoryIsInMore
    ? activeCategoryId
    : MORE_CATEGORIES_VALUE

  return (
    <div
      aria-label="Filtrar productos por categoría"
      className={styles.root}
      role="group"
    >
      <div className={styles.desktopFilter}>
        <button
          aria-pressed={activeCategoryId === null}
          className={
            activeCategoryId === null ? styles.chipActive : styles.chip
          }
          type="button"
          onClick={() => onChange(null)}
        >
          Todos
        </button>

        <div className={styles.quickCategories}>
          {quickCategories.map((category) => (
            <button
              aria-pressed={activeCategoryId === category.id}
              className={
                activeCategoryId === category.id
                  ? styles.chipActive
                  : styles.chip
              }
              key={category.id}
              title={`${category.name} · ${category.productCount} productos`}
              type="button"
              onClick={() => onChange(category.id)}
            >
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {remainingCategories.length > 0 ? (
          <div className={styles.morePicker}>
            <SearchableSelect
              aria-label="Más categorías"
              className={
                activeCategoryIsInMore
                  ? styles.morePickerActive
                  : styles.morePickerTrigger
              }
              emptyMessage="No hay categorías coincidentes"
              searchPlaceholder="Buscar categoría..."
              value={morePickerValue}
              onChange={(event) => {
                if (event.target.value !== MORE_CATEGORIES_VALUE) {
                  onChange(event.target.value)
                }
              }}
            >
              <option disabled value={MORE_CATEGORIES_VALUE}>
                Más categorías ({remainingCategories.length})
              </option>
              {remainingCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {getCategoryOptionLabel(category)}
                </option>
              ))}
            </SearchableSelect>
          </div>
        ) : null}
      </div>

      <div className={styles.mobileFilter}>
        <SearchableSelect
          aria-label="Filtrar por categoría"
          className={styles.mobilePicker}
          emptyMessage="No hay categorías coincidentes"
          searchPlaceholder="Buscar categoría..."
          value={activeCategoryId ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {getCategoryOptionLabel(category)}
            </option>
          ))}
        </SearchableSelect>
      </div>
    </div>
  )
}
