import { useEffect, useMemo, useState } from 'react'
import { ChefHat, Plus, Save, Trash2, Wheat } from 'lucide-react'
import {
  useDeleteProductRecipeMutation,
  useUpsertProductRecipeMutation,
} from '@/modules/inventory/hooks/use-inventory-query'
import type { ProductRecipe } from '@/modules/inventory/types/inventory'
import type { Product } from '@/modules/products/types/product'
import { AppDrawer } from '@/shared/components/ui/AppDrawer'
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './BakeryRecipeDrawer.module.css'

type IngredientDraft = { key: string; productId: string; quantity: string }

type Props = {
  isOpen: boolean
  product: Product | null
  products: Product[]
  recipe: ProductRecipe | null
  onClose: () => void
}

function createDraft(productId = '', quantity = ''): IngredientDraft {
  return { key: crypto.randomUUID(), productId, quantity }
}

const unitLabels: Record<Product['unit'], string> = {
  UNIT: 'unidades',
  KG: 'kg',
  GRAM: 'g',
  LITER: 'L',
  MILLILITER: 'ml',
  METER: 'm',
  BOX: 'cajas',
  PACK: 'paquetes',
  SERVICE: 'servicios',
}

export function BakeryRecipeDrawer({ isOpen, onClose, product, products, recipe }: Props) {
  const [yieldQuantity, setYieldQuantity] = useState('1')
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([createDraft()])
  const [feedback, setFeedback] = useState<string | null>(null)
  const upsertMutation = useUpsertProductRecipeMutation()
  const deleteMutation = useDeleteProductRecipeMutation()
  const ingredientProducts = useMemo(
    () => products.filter((candidate) =>
      candidate.id !== product?.id &&
      candidate.isActive &&
      candidate.productType !== 'VARIANT_PARENT' &&
      candidate.inventoryBehavior !== 'MADE_TO_ORDER'),
    [product?.id, products],
  )

  useEffect(() => {
    if (!isOpen) return
    setYieldQuantity(recipe ? String(recipe.yieldQuantity) : '1')
    setIngredients(
      recipe?.ingredients.length
        ? recipe.ingredients.map((ingredient) =>
            createDraft(ingredient.productId, String(ingredient.quantity)))
        : [createDraft()],
    )
    setFeedback(null)
  }, [isOpen, recipe])

  async function saveRecipe() {
    if (!product) return
    const parsedYield = Number(yieldQuantity)
    const parsedIngredients = ingredients.flatMap((ingredient) => {
      const quantity = Number(ingredient.quantity)
      return ingredient.productId && Number.isInteger(quantity) && quantity > 0
        ? [{ productId: ingredient.productId, quantity }]
        : []
    })
    if (!Number.isInteger(parsedYield) || parsedYield < 1) {
      setFeedback('La cantidad producida por receta debe ser un número entero mayor que cero.')
      return
    }
    if (parsedIngredients.length !== ingredients.length || parsedIngredients.length === 0) {
      setFeedback('Selecciona un producto y una cantidad válida para cada insumo.')
      return
    }
    if (new Set(parsedIngredients.map((ingredient) => ingredient.productId)).size !== parsedIngredients.length) {
      setFeedback('Cada insumo solo puede aparecer una vez en la receta.')
      return
    }
    try {
      await upsertMutation.mutateAsync({
        productId: product.id,
        input: { yieldQuantity: parsedYield, ingredients: parsedIngredients },
      })
      setFeedback('Receta guardada. Los insumos se descontarán al registrar producción.')
    } catch (error) {
      setFeedback(getErrorMessage(error, 'No fue posible guardar la receta.'))
    }
  }

  async function deleteRecipe() {
    if (!product || !recipe) return
    try {
      await deleteMutation.mutateAsync(product.id)
      onClose()
    } catch (error) {
      setFeedback(getErrorMessage(error, 'No fue posible eliminar la receta.'))
    }
  }

  return (
    <AppDrawer
      description="Define los insumos utilizados para una cantidad estándar de producto terminado."
      isOpen={isOpen}
      size="lg"
      title={product ? `Receta de ${product.name}` : 'Configurar receta'}
      titleAccessory={<span className={styles.titleIcon}><ChefHat aria-hidden="true" /></span>}
      footer={
        <div className={styles.footer}>
          {recipe ? (
            <button className={styles.deleteButton} disabled={deleteMutation.isPending} type="button" onClick={() => void deleteRecipe()}>
              <Trash2 aria-hidden="true" /> Eliminar receta
            </button>
          ) : <span />}
          <button className={styles.saveButton} disabled={upsertMutation.isPending} type="button" onClick={() => void saveRecipe()}>
            <Save aria-hidden="true" /> {upsertMutation.isPending ? 'Guardando…' : 'Guardar receta'}
          </button>
        </div>
      }
      onClose={onClose}
    >
      <div className={styles.explainer}>
        <Wheat aria-hidden="true" />
        <div>
          <strong>Usa unidades base para mayor precisión</strong>
          <p>Ejemplo: registra la harina en gramos y la leche en mililitros. Así el descuento será exacto.</p>
        </div>
      </div>

      <label className={styles.field}>
        <span>Esta receta produce</span>
        <div className={styles.yieldControl}>
          <input min="1" inputMode="numeric" type="number" value={yieldQuantity} onChange={(event) => setYieldQuantity(event.target.value)} />
          <span>{product ? unitLabels[product.unit] : 'unidades'} de producto terminado</span>
        </div>
      </label>

      <div className={styles.sectionHeading}>
        <div><strong>Insumos necesarios</strong><span>{ingredients.length} configurados</span></div>
        <button type="button" onClick={() => setIngredients((current) => [...current, createDraft()])}>
          <Plus aria-hidden="true" /> Agregar insumo
        </button>
      </div>

      <div className={styles.ingredients}>
        {ingredients.map((ingredient, index) => {
          const selectedProduct = ingredientProducts.find((candidate) => candidate.id === ingredient.productId)
          return (
            <div className={styles.ingredientRow} key={ingredient.key}>
              <span className={styles.rowNumber}>{index + 1}</span>
              <label>
                <span>Producto de inventario</span>
                <SearchableSelect
                  aria-label={`Insumo ${index + 1}`}
                  value={ingredient.productId}
                  onChange={(event) => setIngredients((current) => current.map((item) => item.key === ingredient.key ? { ...item, productId: event.target.value } : item))}
                >
                  <option value="">Selecciona un insumo</option>
                  {ingredientProducts.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{candidate.name} · stock {candidate.stock} {unitLabels[candidate.unit]}</option>
                  ))}
                </SearchableSelect>
              </label>
              <label>
                <span>Cantidad</span>
                <div className={styles.quantityControl}>
                  <input min="1" inputMode="numeric" type="number" value={ingredient.quantity} onChange={(event) => setIngredients((current) => current.map((item) => item.key === ingredient.key ? { ...item, quantity: event.target.value } : item))} />
                  <small>{selectedProduct ? unitLabels[selectedProduct.unit] : 'unidades'}</small>
                </div>
              </label>
              <button aria-label={`Quitar insumo ${index + 1}`} className={styles.removeButton} disabled={ingredients.length === 1} type="button" onClick={() => setIngredients((current) => current.filter((item) => item.key !== ingredient.key))}>
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>

      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
    </AppDrawer>
  )
}
