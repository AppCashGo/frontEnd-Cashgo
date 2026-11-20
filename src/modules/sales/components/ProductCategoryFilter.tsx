import { SearchableSelect } from '@/shared/components/ui/SearchableSelect'
import { Star } from 'lucide-react'
import styles from './ProductCategoryFilter.module.css'

export type ProductCategoryFilterOption = {
  id: string
  name: string
  productCount: number
}

type ProductCategoryFilterProps = {
  activeCategoryId: string | null
  categories: ProductCategoryFilterOption[]
  favoriteCount?: number
  favoritesActive?: boolean
  onChange: (categoryId: string | null) => void
  onFavoritesChange?: (active: boolean) => void
}

const QUICK_CATEGORY_LIMIT = 5
const MORE_CATEGORIES_VALUE = '__MORE_CATEGORIES__'
const FAVORITES_VALUE = '__FAVORITES__'

function getCategoryOptionLabel(category: ProductCategoryFilterOption) {
  const productLabel = category.productCount === 1 ? 'producto' : 'productos'
  return `${category.name} · ${category.productCount} ${productLabel}`
}

export function ProductCategoryFilter({
  activeCategoryId,
  categories,
  favoriteCount = 0,
  favoritesActive = false,
  onChange,
  onFavoritesChange,
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
          aria-pressed={activeCategoryId === null && !favoritesActive}
          className={
            activeCategoryId === null && !favoritesActive
              ? styles.chipActive
              : styles.chip
          }
          type="button"
          onClick={() => {
            onFavoritesChange?.(false)
            onChange(null)
          }}
        >
          Todos
        </button>

        {favoriteCount > 0 ? (
          <button
            aria-pressed={favoritesActive}
            className={favoritesActive ? styles.chipActive : styles.chip}
            type="button"
            onClick={() => {
              onChange(null)
              onFavoritesChange?.(true)
            }}
          >
            <Star aria-hidden="true" size={16} /> Favoritos
          </button>
        ) : null}

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
              onClick={() => {
                onFavoritesChange?.(false)
                onChange(category.id)
              }}
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
                  onFavoritesChange?.(false)
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
          value={favoritesActive ? FAVORITES_VALUE : (activeCategoryId ?? '')}
          onChange={(event) => {
            if (event.target.value === FAVORITES_VALUE) {
              onChange(null)
              onFavoritesChange?.(true)
              return
            }
            onFavoritesChange?.(false)
            onChange(event.target.value || null)
          }}
        >
          <option value="">Todas las categorías</option>
          {favoriteCount > 0 ? (
            <option value={FAVORITES_VALUE}>Favoritos · {favoriteCount}</option>
          ) : null}
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
