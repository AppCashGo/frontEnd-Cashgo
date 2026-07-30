import type {
  ProductImportMutationInput,
  ProductImportResult,
  ProductMutationInput,
} from '@/modules/products/types/product'
import {
  normalizeProductRecord,
  type ProductApiRecord,
} from '@/modules/products/utils/normalize-product-record'
import {
  deleteJson,
  getJson,
  patchJson,
  postFormData,
  postJson,
} from '@/shared/services/api-client'
import { getAuthAccessToken } from '@/shared/services/auth-session'

type ProductImageUploadResponse = {
  imageUrls: string[]
}

export async function getProducts() {
  const products = await getJson<ProductApiRecord[]>('/products', {
    accessToken: getAuthAccessToken(),
  })

  return products.map(normalizeProductRecord)
}

export async function createProduct(input: ProductMutationInput) {
  const product = await postJson<ProductApiRecord, ProductMutationInput>(
    '/products',
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeProductRecord(product)
}

export async function updateProduct(
  productId: string,
  input: ProductMutationInput,
) {
  const product = await patchJson<ProductApiRecord, ProductMutationInput>(
    `/products/${productId}`,
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeProductRecord(product)
}

export async function deleteProduct(productId: string) {
  const product = await deleteJson<ProductApiRecord>(`/products/${productId}`, {
    accessToken: getAuthAccessToken(),
  })

  return normalizeProductRecord(product)
}

export async function uploadProductImages(files: File[]) {
  const formData = new FormData()

  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await postFormData<ProductImageUploadResponse>(
    '/products/images',
    formData,
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return response.imageUrls
}

export async function importProducts(input: ProductImportMutationInput) {
  return postJson<ProductImportResult, ProductImportMutationInput>(
    '/products/import',
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  )
}
