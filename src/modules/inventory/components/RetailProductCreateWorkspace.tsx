import { zodResolver } from "@hookform/resolvers/zod";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useProductsQuery,
  useUpdateProductMutation,
} from "@/modules/products/hooks/use-products-query";
import type {
  Product,
  ProductMutationInput,
  ProductUnit,
} from "@/modules/products/types/product";
import { productUnits } from "@/modules/products/types/product";
import {
  retailProductCreateSchema,
  type RetailProductCreateValues,
} from "@/modules/inventory/schemas/retail-product-create-schema";
import { inventoryTaxOptions } from "@/modules/inventory/constants/inventory-tax-options";
import {
  useCreateInventoryCategoryMutation,
  useInventoryCategoriesQuery,
} from "@/modules/inventory/hooks/use-inventory-query";
import { getInventoryCopy } from "@/modules/inventory/i18n/inventory-copy";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { formatCurrency } from "@/shared/utils/format-currency";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./RetailProductCreateWorkspace.module.css";

export type RetailProductCreateWorkspaceTab = "basic" | "variants" | "measures";

type RetailProductCreateWorkspaceProps = {
  onBack: () => void;
  onTabChange?: (tab: RetailProductCreateWorkspaceTab) => void;
  productId?: string | null;
  initialTab?: RetailProductCreateWorkspaceTab;
};

type ConfirmSwitchState = {
  title: string;
  description: string;
  targetTab: RetailProductCreateWorkspaceTab;
} | null;

type ProductImageMenuState = {
  index: number;
} | null;

const MAX_PRODUCT_IMAGES = 3;
const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;
const PRODUCT_IMAGE_MAX_SIZE = 500;

function normalizeOptionalText(value?: string) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function normalizeOptionalRelationId(value?: string) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

function BackIcon() {
  return (
    <svg aria-hidden="true" className={styles.backIcon} viewBox="0 0 24 24">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" className={styles.uploadIcon} viewBox="0 0 24 24">
      <path d="M12 16V6m0 0-4 4m4-4 4 4M5 18h14" />
    </svg>
  );
}

function CatalogIcon() {
  return (
    <svg aria-hidden="true" className={styles.catalogIcon} viewBox="0 0 24 24">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18v16H6.5A2.5 2.5 0 0 0 4 22V6.5Zm2 1.5h7" />
      <path d="M8.5 10H15M8.5 13H15" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg aria-hidden="true" className={styles.warningIcon} viewBox="0 0 24 24">
      <path d="M12 4 21 20H3L12 4Z" />
      <path d="M12 9v5M12 17h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className={styles.closeIcon} viewBox="0 0 24 24">
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" className={styles.chevronIcon} viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className={styles.searchIcon} viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className={styles.plusIcon} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className={styles.menuIcon} viewBox="0 0 24 24">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg aria-hidden="true" className={styles.menuIcon} viewBox="0 0 24 24">
      <rect height="15" rx="2" width="18" x="3" y="5" />
      <path d="m7 17 4.5-4.5 3.5 3.5 2-2 3 3" />
      <circle cx="8.5" cy="9.5" r="1.5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" className={styles.pencilIcon} viewBox="0 0 24 24">
      <path d="m4 20 4.6-1L19 8.6 15.4 5 5 15.4 4 20Z" />
      <path d="m14 6 4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className={styles.menuIcon} viewBox="0 0 24 24">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

function loadImageFromObjectUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No pudimos leer la imagen."));
    image.src = url;
  });
}

async function resizeProductImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen válido.");
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("Cada imagen debe pesar máximo 2MB.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageFromObjectUrl(objectUrl);
    const ratio = Math.min(
      PRODUCT_IMAGE_MAX_SIZE / image.naturalWidth,
      PRODUCT_IMAGE_MAX_SIZE / image.naturalHeight,
      1,
    );
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No pudimos preparar la imagen.");
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/webp", 0.84);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getDefaultValues(product?: Product | null): RetailProductCreateValues {
  if (!product) {
    return {
      barcode: "",
      name: "",
      stock: 0,
      minStock: 5,
      price: 0,
      cost: 0,
      unit: "UNIT",
      categoryId: "",
      description: "",
      taxOptionId: "ninguno",
      isVisibleInCatalog: true,
      variants: [],
    };
  }

  const matchingTaxOption =
    inventoryTaxOptions.find(
      (option) =>
        option.rate === product.taxRate &&
        (option.rate === 0 || option.label === product.taxLabel),
    ) ?? inventoryTaxOptions[inventoryTaxOptions.length - 1];

  return {
    barcode: product.barcode ?? "",
    name: product.name,
    stock: product.stock,
    minStock: product.minStock,
    price: product.price,
    cost: product.cost,
    unit: product.unit,
    categoryId: product.categoryId ?? "",
    description: product.description ?? "",
    taxOptionId: matchingTaxOption.id,
    isVisibleInCatalog: product.isVisibleInCatalog,
    variants: [],
  };
}

function unitLabel(unit: ProductUnit) {
  const labels: Record<ProductUnit, string> = {
    UNIT: "Unidad (Und)",
    KG: "Kilogramo (Kg)",
    GRAM: "Gramo (g)",
    LITER: "Litro (L)",
    MILLILITER: "Mililitro (ml)",
    METER: "Metro (m)",
    BOX: "Caja",
    PACK: "Paquete",
    SERVICE: "Servicio",
  };

  return labels[unit];
}

function ConfirmSwitchDrawer({
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
}) {
  return (
    <div
      className={styles.confirmBackdrop}
      role="presentation"
      onClick={onCancel}
    >
      <aside
        aria-label={title}
        aria-modal="true"
        className={styles.confirmDrawer}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Cerrar"
          className={styles.confirmClose}
          type="button"
          onClick={onCancel}
        >
          <CloseIcon />
        </button>

        <div className={styles.confirmIconWrap}>
          <WarningIcon />
        </div>

        <div className={styles.confirmCopy}>
          <h3 className={styles.confirmTitle}>{title}</h3>
          <p className={styles.confirmDescription}>{description}</p>
        </div>

        <div className={styles.confirmActions}>
          <button
            className={styles.confirmPrimary}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button
            className={styles.confirmSecondary}
            type="button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </aside>
    </div>
  );
}

type CategorySelectorCategory = {
  id: string;
  name: string;
};

function CategorySelector({
  categories,
  filteredCategories,
  selectedCategoryId,
  selectedCategoryName,
  isOpen,
  searchTerm,
  label,
  placeholder,
  searchPlaceholder,
  uncategorizedLabel,
  addCategoryLabel,
  onCreateCategory,
  onSearchChange,
  onSelectCategory,
  onToggleOpen,
}: {
  categories: CategorySelectorCategory[];
  filteredCategories: CategorySelectorCategory[];
  selectedCategoryId: string;
  selectedCategoryName?: string;
  isOpen: boolean;
  searchTerm: string;
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  uncategorizedLabel: string;
  addCategoryLabel: string;
  onCreateCategory: () => void;
  onSearchChange: (value: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onToggleOpen: () => void;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>

      <div className={styles.categorySelect}>
        <button
          aria-expanded={isOpen}
          className={
            isOpen
              ? `${styles.categoryTrigger} ${styles.categoryTriggerOpen}`
              : styles.categoryTrigger
          }
          type="button"
          onClick={onToggleOpen}
        >
          <span
            className={
              selectedCategoryName
                ? styles.categoryValue
                : styles.categoryPlaceholder
            }
          >
            {selectedCategoryName ?? placeholder}
          </span>
          <ChevronIcon />
        </button>

        {isOpen ? (
          <div className={styles.categoryMenu}>
            <label className={styles.categorySearch}>
              <SearchIcon />
              <input
                autoFocus
                className={styles.categorySearchInput}
                placeholder={searchPlaceholder}
                type="search"
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
              />
              {searchTerm ? (
                <button
                  aria-label="Limpiar busqueda"
                  className={styles.categorySearchClear}
                  type="button"
                  onClick={() => onSearchChange("")}
                >
                  <CloseIcon />
                </button>
              ) : null}
            </label>

            <div className={styles.categoryOptions}>
              <button
                className={
                  selectedCategoryId === ""
                    ? styles.categoryOptionActive
                    : styles.categoryOption
                }
                type="button"
                onClick={() => onSelectCategory("")}
              >
                {uncategorizedLabel}
              </button>

              {(searchTerm ? filteredCategories : categories).map(
                (category) => (
                  <button
                    className={
                      selectedCategoryId === category.id
                        ? styles.categoryOptionActive
                        : styles.categoryOption
                    }
                    key={category.id}
                    type="button"
                    onClick={() => onSelectCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ),
              )}
            </div>

            <button
              className={styles.categoryCreateButton}
              type="button"
              onClick={onCreateCategory}
            >
              <PlusIcon />
              <span>{addCategoryLabel}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CategoryCreateDrawer({
  copy,
  errorMessage,
  isSubmitting,
  isVisibleInCatalog,
  name,
  productSearchTerm,
  products,
  selectedProductIds,
  onClose,
  onNameChange,
  onProductSearchChange,
  onSubmit,
  onToggleProduct,
  onToggleVisibility,
}: {
  copy: ReturnType<typeof getInventoryCopy>;
  errorMessage: string | null;
  isSubmitting: boolean;
  isVisibleInCatalog: boolean;
  name: string;
  productSearchTerm: string;
  products: Product[];
  selectedProductIds: string[];
  onClose: () => void;
  onNameChange: (value: string) => void;
  onProductSearchChange: (value: string) => void;
  onSubmit: () => void;
  onToggleProduct: (productId: string) => void;
  onToggleVisibility: () => void;
}) {
  const canSubmit = name.trim().length >= 2 && !isSubmitting;

  return (
    <div
      className={styles.categoryDrawerBackdrop}
      role="presentation"
      onClick={onClose}
    >
      <aside
        aria-label={copy.createCategorySubmit}
        aria-modal="true"
        className={styles.categoryDrawer}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.categoryDrawerHeader}>
          <h3 className={styles.categoryDrawerTitle}>{copy.categories}</h3>
          <button
            aria-label="Cerrar"
            className={styles.categoryDrawerClose}
            type="button"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>

        <div className={styles.categoryDrawerBody}>
          <label className={styles.field}>
            <span className={styles.label}>
              {copy.categoryName}
              <span className={styles.required}>*</span>
            </span>
            <input
              className={styles.input}
              placeholder={copy.categoryNamePlaceholder}
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </label>

          <button
            className={styles.categoryVisibilityCard}
            type="button"
            onClick={onToggleVisibility}
          >
            <CatalogIcon />
            <span className={styles.categoryVisibilityCopy}>
              <strong>{copy.showInStore}</strong>
              <span>{copy.showInStoreHint}</span>
            </span>
            <span
              className={
                isVisibleInCatalog
                  ? styles.toggleTrackActive
                  : styles.toggleTrack
              }
            >
              <span className={styles.toggleThumb} />
            </span>
          </button>

          <label className={styles.categoryProductSearch}>
            <SearchIcon />
            <input
              className={styles.categoryProductSearchInput}
              placeholder={copy.searchProduct}
              type="search"
              value={productSearchTerm}
              onChange={(event) => onProductSearchChange(event.target.value)}
            />
          </label>

          <div className={styles.categoryProductList}>
            {products.map((product) => (
              <label className={styles.categoryProductRow} key={product.id}>
                <input
                  checked={selectedProductIds.includes(product.id)}
                  type="checkbox"
                  onChange={() => onToggleProduct(product.id)}
                />
                <span className={styles.categoryProductName}>
                  {product.name}
                </span>
                <span className={styles.categoryProductPrice}>
                  {formatCurrency(product.price)}
                </span>
              </label>
            ))}
          </div>

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        </div>

        <footer className={styles.categoryDrawerFooter}>
          <button
            className={styles.categoryDrawerSubmit}
            disabled={!canSubmit}
            type="button"
            onClick={onSubmit}
          >
            {copy.createCategorySubmit}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function ProductImagePreviewDialog({
  images,
  selectedIndex,
  onClose,
  onSelect,
}: {
  images: string[];
  selectedIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  const currentImage = images[selectedIndex];
  const canGoBack = selectedIndex > 0;
  const canGoForward = selectedIndex < images.length - 1;

  if (!currentImage) {
    return null;
  }

  return (
    <div
      className={styles.imagePreviewBackdrop}
      role="presentation"
      onClick={onClose}
    >
      <aside
        aria-label="Vista previa de imagen"
        aria-modal="true"
        className={styles.imagePreviewDialog}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Cerrar vista previa"
          className={styles.imagePreviewClose}
          type="button"
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        <div className={styles.imagePreviewFrame}>
          <img
            alt={`Imagen ${selectedIndex + 1} del producto`}
            className={styles.imagePreviewMedia}
            src={currentImage}
          />
        </div>

        {images.length > 1 ? (
          <div className={styles.imagePreviewActions}>
            <button
              disabled={!canGoBack}
              type="button"
              onClick={() => onSelect(selectedIndex - 1)}
            >
              Anterior
            </button>
            <button
              disabled={!canGoForward}
              type="button"
              onClick={() => onSelect(selectedIndex + 1)}
            >
              Siguiente
            </button>
          </div>
        ) : null}

        <span className={styles.imagePreviewCounter}>
          {selectedIndex + 1} de {images.length}
        </span>
      </aside>
    </div>
  );
}

export function RetailProductCreateWorkspace({
  onBack,
  onTabChange,
  productId,
  initialTab = "basic",
}: RetailProductCreateWorkspaceProps) {
  const { languageCode } = useAppTranslation();
  const copy = getInventoryCopy(languageCode);
  const categoriesQuery = useInventoryCategoriesQuery();
  const productsQuery = useProductsQuery();
  const createCategoryMutation = useCreateInventoryCategoryMutation();
  const createProductMutation = useCreateProductMutation();
  const updateProductMutation = useUpdateProductMutation();
  const deleteProductMutation = useDeleteProductMutation();
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );
  const products = useMemo(
    () => productsQuery.data ?? [],
    [productsQuery.data],
  );
  const currentProduct = useMemo(
    () => products.find((product) => product.id === productId) ?? null,
    [productId, products],
  );
  const isEditMode =
    productId !== null && productId !== undefined && currentProduct !== null;
  const [activeTab, setActiveTab] =
    useState<RetailProductCreateWorkspaceTab>(initialTab);
  const [purchaseUnit, setPurchaseUnit] = useState<ProductUnit>("UNIT");
  const [saleUnit, setSaleUnit] = useState<ProductUnit>("UNIT");
  const [confirmSwitchState, setConfirmSwitchState] =
    useState<ConfirmSwitchState>(null);
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [isCategoryCreateDrawerOpen, setIsCategoryCreateDrawerOpen] =
    useState(false);
  const [categoryDraftName, setCategoryDraftName] = useState("");
  const [isCategoryVisibleInCatalog, setIsCategoryVisibleInCatalog] =
    useState(true);
  const [categoryProductSearchTerm, setCategoryProductSearchTerm] =
    useState("");
  const [categoryProductIds, setCategoryProductIds] = useState<string[]>([]);
  const [categoryCreateError, setCategoryCreateError] = useState<string | null>(
    null,
  );
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productImageError, setProductImageError] = useState<string | null>(
    null,
  );
  const [imageReplaceIndex, setImageReplaceIndex] = useState<number | null>(
    null,
  );
  const [imageMenuState, setImageMenuState] =
    useState<ProductImageMenuState>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(
    null,
  );
  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<RetailProductCreateValues>({
    resolver: zodResolver(retailProductCreateSchema),
    defaultValues: getDefaultValues(),
    mode: "onChange",
  });
  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control,
    name: "variants",
  });
  const isVisibleInCatalog = watch("isVisibleInCatalog");
  const selectedCategoryId = watch("categoryId") ?? "";
  const selectedCategory = useMemo(
    () =>
      categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );
  const filteredCategories = useMemo(() => {
    const normalizedSearchTerm = categorySearchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return categories;
    }

    return categories.filter((category) =>
      category.name.toLowerCase().includes(normalizedSearchTerm),
    );
  }, [categories, categorySearchTerm]);
  const categoryDrawerProducts = useMemo(() => {
    const normalizedSearchTerm = categoryProductSearchTerm.trim().toLowerCase();

    return products
      .filter((product) =>
        normalizedSearchTerm
          ? product.name.toLowerCase().includes(normalizedSearchTerm)
          : true,
      )
      .slice(0, 20);
  }, [categoryProductSearchTerm, products]);

  useEffect(() => {
    const nextValues = getDefaultValues(currentProduct);
    reset(nextValues);
    setProductImages(currentProduct?.imageUrls ?? []);
    setProductImageError(null);
    setImageMenuState(null);
    setPreviewImageIndex(null);
    setPurchaseUnit(currentProduct?.unit ?? "UNIT");
    setSaleUnit(currentProduct?.unit ?? "UNIT");
  }, [currentProduct, reset]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);

  function handleSelectCategory(categoryId: string) {
    setValue("categoryId", categoryId, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setIsCategorySelectorOpen(false);
    setCategorySearchTerm("");
  }

  function handleOpenCreateCategoryFromSelector() {
    setCategoryDraftName(categorySearchTerm.trim());
    setCategoryProductIds(isEditMode && productId ? [productId] : []);
    setCategoryProductSearchTerm("");
    setCategoryCreateError(null);
    setIsCategorySelectorOpen(false);
    setIsCategoryVisibleInCatalog(true);
    setIsCategoryCreateDrawerOpen(true);
  }

  function handleCloseCategoryCreateDrawer() {
    setIsCategoryCreateDrawerOpen(false);
    setCategoryDraftName("");
    setCategoryProductIds([]);
    setCategoryProductSearchTerm("");
    setCategoryCreateError(null);
    setIsCategoryVisibleInCatalog(true);
  }

  function handleToggleCategoryProduct(productIdToToggle: string) {
    setCategoryProductIds((currentProductIds) =>
      currentProductIds.includes(productIdToToggle)
        ? currentProductIds.filter(
            (currentId) => currentId !== productIdToToggle,
          )
        : [...currentProductIds, productIdToToggle],
    );
  }

  async function handleCreateCategory() {
    const name = categoryDraftName.trim();

    if (name.length < 2) {
      setCategoryCreateError(copy.categoryNameRequired);
      return;
    }

    try {
      const createdCategory = await createCategoryMutation.mutateAsync({
        name,
        isVisibleInCatalog: isCategoryVisibleInCatalog,
        productIds: categoryProductIds,
      });

      setValue("categoryId", createdCategory.id, {
        shouldDirty: true,
        shouldValidate: true,
      });
      handleCloseCategoryCreateDrawer();
    } catch (error) {
      setCategoryCreateError(getErrorMessage(error, copy.categoryCreateError));
    }
  }

  function requestProductImageUpload(replaceIndex?: number) {
    setProductImageError(null);
    setImageMenuState(null);
    setImageReplaceIndex(
      typeof replaceIndex === "number" ? replaceIndex : null,
    );
    imageInputRef.current?.click();
  }

  async function handleProductImageFiles(
    files: File[],
    replaceIndex: number | null,
  ) {
    if (files.length === 0) {
      return;
    }

    const availableSlots =
      replaceIndex === null ? MAX_PRODUCT_IMAGES - productImages.length : 1;

    if (availableSlots <= 0) {
      setProductImageError("Solo puedes cargar hasta 3 imágenes.");
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);

    try {
      const optimizedImages = await Promise.all(
        filesToProcess.map((file) => resizeProductImage(file)),
      );

      setProductImages((currentImages) => {
        if (replaceIndex !== null) {
          const replacementImage = optimizedImages[0];

          if (!replacementImage || !currentImages[replaceIndex]) {
            return currentImages;
          }

          const nextImages = [...currentImages];
          nextImages[replaceIndex] = replacementImage;

          return nextImages;
        }

        return [...currentImages, ...optimizedImages].slice(
          0,
          MAX_PRODUCT_IMAGES,
        );
      });

      setProductImageError(
        files.length > availableSlots
          ? "Solo se cargaron las primeras imágenes permitidas."
          : null,
      );
    } catch (error) {
      setProductImageError(
        getErrorMessage(error, "No pudimos cargar la imagen."),
      );
    }
  }

  function handleProductImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);

    void handleProductImageFiles(selectedFiles, imageReplaceIndex);
    event.target.value = "";
  }

  function handleRemoveProductImage(index: number) {
    setProductImages((currentImages) =>
      currentImages.filter((_, currentIndex) => currentIndex !== index),
    );
    setImageMenuState(null);
    setProductImageError(null);
    setPreviewImageIndex(null);
  }

  function handleOpenProductImagePreview(index: number) {
    setImageMenuState(null);
    setPreviewImageIndex(index);
  }

  function renderProductImageUploader() {
    const remainingImages = MAX_PRODUCT_IMAGES - productImages.length;
    const addImagesLabel =
      remainingImages === 1
        ? "Añade 1 imagen más"
        : `Añade ${remainingImages} imágenes más`;

    return (
      <div className={styles.imageUploader}>
        {productImages.length === 0 ? (
          <button
            className={styles.uploadPanel}
            type="button"
            onClick={() => requestProductImageUpload()}
          >
            <UploadIcon />
            <strong>Carga hasta 3 imágenes</strong>
            <p>
              Recomendamos: Tamaño de 500 x 500 px, formato PNG y peso máximo
              2MB.
            </p>
          </button>
        ) : (
          <div className={styles.imageGallery}>
            {productImages.map((imageUrl, index) => (
              <article
                className={
                  index === 0 ? styles.imageTileCover : styles.imageTile
                }
                key={`${imageUrl}-${index}`}
              >
                <button
                  aria-label={`Ver imagen ${index + 1}`}
                  className={styles.imagePreviewButton}
                  type="button"
                  onClick={() => handleOpenProductImagePreview(index)}
                >
                  <img
                    alt={`Imagen ${index + 1} del producto`}
                    className={styles.productImage}
                    src={imageUrl}
                  />
                </button>

                {index === 0 ? (
                  <span className={styles.coverBadge}>Portada</span>
                ) : null}

                <button
                  aria-label={`Editar imagen ${index + 1}`}
                  className={styles.imageEditButton}
                  type="button"
                  onClick={() =>
                    setImageMenuState((currentMenuState) =>
                      currentMenuState?.index === index ? null : { index },
                    )
                  }
                >
                  <PencilIcon />
                </button>

                {imageMenuState?.index === index ? (
                  <div className={styles.imageMenu}>
                    <button
                      type="button"
                      onClick={() => handleOpenProductImagePreview(index)}
                    >
                      <EyeIcon />
                      <span>Ver imagen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => requestProductImageUpload(index)}
                    >
                      <ImageIcon />
                      <span>Cargar imagen</span>
                    </button>
                    <button
                      className={styles.imageMenuDanger}
                      type="button"
                      onClick={() => handleRemoveProductImage(index)}
                    >
                      <TrashIcon />
                      <span>Eliminar imagen</span>
                    </button>
                  </div>
                ) : null}
              </article>
            ))}

            {remainingImages > 0 ? (
              <button
                className={styles.addImageTile}
                type="button"
                onClick={() => requestProductImageUpload()}
              >
                <PlusIcon />
                <span>{addImagesLabel}</span>
              </button>
            ) : null}
          </div>
        )}

        {productImageError ? (
          <p className={styles.imageError}>{productImageError}</p>
        ) : null}
      </div>
    );
  }

  function renderCategorySelector() {
    return (
      <>
        <input type="hidden" {...register("categoryId")} />
        <CategorySelector
          addCategoryLabel={copy.addCategory}
          categories={categories}
          filteredCategories={filteredCategories}
          isOpen={isCategorySelectorOpen}
          label="Categoria"
          placeholder={copy.selectOption}
          searchPlaceholder={copy.searchCategory}
          searchTerm={categorySearchTerm}
          selectedCategoryId={selectedCategoryId}
          selectedCategoryName={selectedCategory?.name}
          uncategorizedLabel={copy.uncategorized}
          onCreateCategory={handleOpenCreateCategoryFromSelector}
          onSearchChange={setCategorySearchTerm}
          onSelectCategory={handleSelectCategory}
          onToggleOpen={() =>
            setIsCategorySelectorOpen((currentIsOpen) => !currentIsOpen)
          }
        />
      </>
    );
  }

  function handleRequestTabChange(targetTab: RetailProductCreateWorkspaceTab) {
    if (targetTab === activeTab) {
      return;
    }

    if (targetTab === "variants") {
      setConfirmSwitchState({
        title: copy.confirmVariantSwitchTitle,
        description: copy.confirmVariantSwitchDescription,
        targetTab,
      });
      return;
    }

    if (targetTab === "measures") {
      setConfirmSwitchState({
        title: copy.confirmMeasureSwitchTitle,
        description: copy.confirmMeasureSwitchDescription,
        targetTab,
      });
      return;
    }

    setActiveTab(targetTab);
  }

  async function handlePersistProduct(values: RetailProductCreateValues) {
    const normalizedVariants = (values.variants ?? []).map((variant) => ({
      name: variant.name.trim(),
      sku: normalizeOptionalText(variant.sku),
      barcode: normalizeOptionalText(variant.barcode),
      stock: variant.stock,
      minStock: variant.minStock,
      price: variant.price,
      cost: variant.cost,
    }));

    if (activeTab === "variants" && normalizedVariants.length === 0) {
      setError("root", {
        message: "Agrega al menos una variante para crear este producto.",
      });
      return;
    }

    const selectedTaxOption =
      inventoryTaxOptions.find((option) => option.id === values.taxOptionId) ??
      inventoryTaxOptions[inventoryTaxOptions.length - 1];
    const firstVariant = normalizedVariants[0];

    const input: ProductMutationInput = {
      barcode: normalizeOptionalText(values.barcode),
      name: values.name.trim(),
      stock:
        activeTab === "variants"
          ? normalizedVariants.reduce(
              (total, variant) => total + variant.stock,
              0,
            )
          : values.stock,
      minStock: activeTab === "variants" ? 0 : values.minStock,
      price:
        activeTab === "variants" ? (firstVariant?.price ?? 0) : values.price,
      cost: activeTab === "variants" ? (firstVariant?.cost ?? 0) : values.cost,
      unit: saleUnit,
      categoryId: normalizeOptionalRelationId(values.categoryId),
      description: normalizeOptionalText(values.description),
      taxLabel:
        selectedTaxOption.rate > 0 ? selectedTaxOption.label : undefined,
      taxRate: selectedTaxOption.rate,
      isVisibleInCatalog: values.isVisibleInCatalog,
      imageUrls: productImages,
      variants: activeTab === "variants" ? normalizedVariants : undefined,
    };

    try {
      if (isEditMode && productId) {
        await updateProductMutation.mutateAsync({
          productId,
          input,
        });
      } else {
        await createProductMutation.mutateAsync(input);
      }

      onBack();
    } catch (error) {
      setError("root", {
        message: getErrorMessage(
          error,
          isEditMode
            ? "No fue posible guardar los cambios del producto."
            : "No fue posible crear el producto.",
        ),
      });
    }
  }

  async function handleDeleteProduct() {
    if (!productId) {
      return;
    }

    const shouldDelete = window.confirm(
      "Este producto se marcará como inactivo y dejará de mostrarse en inventario. ¿Quieres continuar?",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteProductMutation.mutateAsync(productId);
      onBack();
    } catch (error) {
      setError("root", {
        message: getErrorMessage(
          error,
          "No fue posible eliminar el producto en este momento.",
        ),
      });
    }
  }

  const currentTitle =
    activeTab === "measures"
      ? copy.measuresTitle
      : activeTab === "variants"
        ? copy.variantsTitle
        : copy.createProductTitle;

  const isMutationPending =
    isSubmitting ||
    createProductMutation.isPending ||
    updateProductMutation.isPending ||
    deleteProductMutation.isPending;

  return (
    <>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <button className={styles.backButton} type="button" onClick={onBack}>
            <BackIcon />
            <span>{currentTitle}</span>
          </button>
        </header>

        <div className={styles.tabs}>
          <button
            className={activeTab === "basic" ? styles.tabActive : styles.tab}
            type="button"
            onClick={() => handleRequestTabChange("basic")}
          >
            {copy.createProductTitle}
          </button>
          <button
            className={activeTab === "variants" ? styles.tabActive : styles.tab}
            type="button"
            onClick={() => handleRequestTabChange("variants")}
          >
            {copy.variantsTitle}
          </button>
          <button
            className={activeTab === "measures" ? styles.tabActive : styles.tab}
            type="button"
            onClick={() => handleRequestTabChange("measures")}
          >
            {copy.measuresTitle}
          </button>
        </div>

        <form
          className={styles.form}
          noValidate
          onSubmit={handleSubmit(handlePersistProduct)}
        >
          <input
            ref={imageInputRef}
            accept="image/png,image/jpeg,image/webp"
            className={styles.imageInput}
            multiple={imageReplaceIndex === null}
            type="file"
            onChange={handleProductImageInputChange}
          />

          {(activeTab === "basic" || activeTab === "measures") && (
            <section className={styles.column}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Datos del producto</h3>

                {renderProductImageUploader()}

                <label className={styles.field}>
                  <span className={styles.label}>Codigo</span>
                  <input
                    className={styles.input}
                    placeholder="Escanea o escribe el codigo del producto"
                    type="text"
                    {...register("barcode")}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>
                    Nombre del producto
                    <span className={styles.required}>*</span>
                  </span>
                  <input
                    className={styles.input}
                    placeholder="Camiseta, perfume, aretes..."
                    type="text"
                    {...register("name")}
                  />
                  {errors.name ? (
                    <p className={styles.error}>{errors.name.message}</p>
                  ) : null}
                </label>

                {activeTab === "measures" ? (
                  <>
                    <label className={styles.field}>
                      <span className={styles.label}>
                        {copy.purchaseUnit}
                        <span className={styles.required}>*</span>
                      </span>
                      <select
                        className={styles.select}
                        value={purchaseUnit}
                        onChange={(event) =>
                          setPurchaseUnit(event.target.value as ProductUnit)
                        }
                      >
                        {productUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unitLabel(unit)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className={styles.gridTwo}>
                      <label className={styles.field}>
                        <span className={styles.label}>
                          {copy.availableQuantityUnit} ({purchaseUnit})
                        </span>
                        <input
                          className={styles.input}
                          inputMode="numeric"
                          min="0"
                          type="number"
                          {...register("stock")}
                        />
                        {errors.stock ? (
                          <p className={styles.error}>{errors.stock.message}</p>
                        ) : null}
                      </label>

                      <label className={styles.field}>
                        <span className={styles.label}>
                          Cantidad minima
                          <span className={styles.required}>*</span>
                        </span>
                        <input
                          className={styles.input}
                          inputMode="numeric"
                          min="0"
                          type="number"
                          {...register("minStock")}
                        />
                        {errors.minStock ? (
                          <p className={styles.error}>
                            {errors.minStock.message}
                          </p>
                        ) : null}
                      </label>
                    </div>

                    <label className={styles.field}>
                      <span className={styles.label}>
                        {copy.purchaseCostPerUnit} {purchaseUnit}
                      </span>
                      <input
                        className={styles.input}
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        type="number"
                        {...register("cost")}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <div className={styles.gridTwo}>
                      <label className={styles.field}>
                        <span className={styles.label}>
                          Cantidad disponible
                        </span>
                        <input
                          className={styles.input}
                          inputMode="numeric"
                          min="0"
                          type="number"
                          {...register("stock")}
                        />
                        {errors.stock ? (
                          <p className={styles.error}>{errors.stock.message}</p>
                        ) : null}
                      </label>

                      <label className={styles.field}>
                        <span className={styles.label}>Cantidad minima</span>
                        <input
                          className={styles.input}
                          inputMode="numeric"
                          min="0"
                          type="number"
                          {...register("minStock")}
                        />
                        {errors.minStock ? (
                          <p className={styles.error}>
                            {errors.minStock.message}
                          </p>
                        ) : null}
                      </label>
                    </div>

                    <label className={styles.field}>
                      <span className={styles.label}>
                        Precio de venta
                        <span className={styles.required}>*</span>
                      </span>
                      <input
                        className={styles.input}
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        type="number"
                        {...register("price")}
                      />
                      {errors.price ? (
                        <p className={styles.error}>{errors.price.message}</p>
                      ) : null}
                    </label>

                    <label className={styles.field}>
                      <span className={styles.label}>Costo de compra</span>
                      <input
                        className={styles.input}
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        type="number"
                        {...register("cost")}
                      />
                      {errors.cost ? (
                        <p className={styles.error}>{errors.cost.message}</p>
                      ) : null}
                    </label>
                  </>
                )}
              </div>
            </section>
          )}

          <section className={styles.column}>
            {activeTab === "variants" ? (
              <div className={styles.variantLayout}>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>Datos del producto</h3>

                  {renderProductImageUploader()}

                  <label className={styles.field}>
                    <span className={styles.label}>
                      Nombre del producto
                      <span className={styles.required}>*</span>
                    </span>
                    <input
                      className={styles.input}
                      placeholder="Camiseta, perfume, aretes..."
                      type="text"
                      {...register("name")}
                    />
                  </label>
                </div>

                <div className={styles.variantsCard}>
                  <div className={styles.variantsHeader}>
                    <div className={styles.variantsTitleRow}>
                      <h3 className={styles.cardTitle}>
                        {copy.variantsSectionTitle}
                      </h3>
                      <span className={styles.premiumBadge}>
                        {copy.variantsPremiumBadge}
                      </span>
                    </div>
                    <p className={styles.variantsHint}>{copy.variantsHint}</p>
                  </div>

                  <div className={styles.variantsActions}>
                    <button
                      className={styles.variantPrimaryButton}
                      type="button"
                      onClick={() =>
                        appendVariant({
                          name: "",
                          sku: "",
                          barcode: "",
                          stock: 0,
                          minStock: 0,
                          price: 0,
                          cost: 0,
                        })
                      }
                    >
                      {copy.addVariant}
                    </button>
                    <button
                      className={styles.variantSecondaryButton}
                      type="button"
                    >
                      {copy.variantsHelp}
                    </button>
                  </div>

                  <div className={styles.variantRows}>
                    {variantFields.length === 0 ? (
                      <p className={styles.variantEmpty}>
                        {copy.variantsEmpty}
                      </p>
                    ) : (
                      variantFields.map((field, index) => (
                        <article className={styles.variantRow} key={field.id}>
                          <div className={styles.variantRowHeader}>
                            <strong>
                              {copy.variantLabel} {index + 1}
                            </strong>
                            <button
                              className={styles.variantRemoveButton}
                              type="button"
                              onClick={() => removeVariant(index)}
                            >
                              {copy.removeVariant}
                            </button>
                          </div>

                          <div className={styles.variantGrid}>
                            <label className={styles.field}>
                              <span className={styles.label}>
                                {copy.variantName}
                                <span className={styles.required}>*</span>
                              </span>
                              <input
                                className={styles.input}
                                placeholder={copy.variantNamePlaceholder}
                                type="text"
                                {...register(`variants.${index}.name` as const)}
                              />
                              {errors.variants?.[index]?.name ? (
                                <p className={styles.error}>
                                  {errors.variants[index]?.name?.message}
                                </p>
                              ) : null}
                            </label>

                            <label className={styles.field}>
                              <span className={styles.label}>SKU</span>
                              <input
                                className={styles.input}
                                type="text"
                                {...register(`variants.${index}.sku` as const)}
                              />
                            </label>

                            <label className={styles.field}>
                              <span className={styles.label}>Codigo</span>
                              <input
                                className={styles.input}
                                type="text"
                                {...register(
                                  `variants.${index}.barcode` as const,
                                )}
                              />
                            </label>

                            <label className={styles.field}>
                              <span className={styles.label}>
                                {copy.availableQuantityUnit}
                              </span>
                              <input
                                className={styles.input}
                                min="0"
                                type="number"
                                {...register(
                                  `variants.${index}.stock` as const,
                                )}
                              />
                            </label>

                            <label className={styles.field}>
                              <span className={styles.label}>
                                Cantidad minima
                              </span>
                              <input
                                className={styles.input}
                                min="0"
                                type="number"
                                {...register(
                                  `variants.${index}.minStock` as const,
                                )}
                              />
                            </label>

                            <label className={styles.field}>
                              <span className={styles.label}>
                                Precio de venta
                                <span className={styles.required}>*</span>
                              </span>
                              <input
                                className={styles.input}
                                min="0"
                                step="0.01"
                                type="number"
                                {...register(
                                  `variants.${index}.price` as const,
                                )}
                              />
                            </label>

                            <label className={styles.field}>
                              <span className={styles.label}>
                                Costo de compra
                              </span>
                              <input
                                className={styles.input}
                                min="0"
                                step="0.01"
                                type="number"
                                {...register(`variants.${index}.cost` as const)}
                              />
                            </label>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>

                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>Informacion adicional</h3>

                  {renderCategorySelector()}

                  <label className={styles.toggleCard}>
                    <div className={styles.toggleCopy}>
                      <div className={styles.toggleTitleRow}>
                        <CatalogIcon />
                        <strong>{copy.showInStore}</strong>
                      </div>
                      <p>{copy.showInStoreHint}</p>
                    </div>

                    <span className={styles.toggleControl}>
                      <input
                        className={styles.toggleInput}
                        type="checkbox"
                        {...register("isVisibleInCatalog")}
                      />
                      <span
                        className={
                          isVisibleInCatalog
                            ? styles.toggleTrackActive
                            : styles.toggleTrack
                        }
                      >
                        <span className={styles.toggleThumb} />
                      </span>
                    </span>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>Descripcion</span>
                    <textarea
                      className={styles.textarea}
                      placeholder={copy.descriptionPlaceholder}
                      rows={4}
                      {...register("description")}
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>{copy.taxBase}</span>
                    <select
                      className={styles.select}
                      {...register("taxOptionId")}
                    >
                      <option value="">{copy.selectOption}</option>
                      {inventoryTaxOptions.map((taxOption) => (
                        <option key={taxOption.id} value={taxOption.id}>
                          {taxOption.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Informacion adicional</h3>

                {renderCategorySelector()}

                <label className={styles.toggleCard}>
                  <div className={styles.toggleCopy}>
                    <div className={styles.toggleTitleRow}>
                      <CatalogIcon />
                      <strong>{copy.showInStore}</strong>
                    </div>
                    <p>{copy.showInStoreHint}</p>
                  </div>

                  <span className={styles.toggleControl}>
                    <input
                      className={styles.toggleInput}
                      type="checkbox"
                      {...register("isVisibleInCatalog")}
                    />
                    <span
                      className={
                        isVisibleInCatalog
                          ? styles.toggleTrackActive
                          : styles.toggleTrack
                      }
                    >
                      <span className={styles.toggleThumb} />
                    </span>
                  </span>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Descripcion</span>
                  <textarea
                    className={styles.textarea}
                    placeholder={copy.descriptionPlaceholder}
                    rows={4}
                    {...register("description")}
                  />
                  {errors.description ? (
                    <p className={styles.error}>{errors.description.message}</p>
                  ) : null}
                </label>

                <div className={styles.taxSection}>
                  <h4 className={styles.sectionTitle}>
                    Impuestos del producto
                  </h4>

                  <label className={styles.field}>
                    <span className={styles.label}>{copy.taxBase}</span>
                    <select
                      className={styles.select}
                      {...register("taxOptionId")}
                    >
                      <option value="">{copy.selectOption}</option>
                      {inventoryTaxOptions.map((taxOption) => (
                        <option key={taxOption.id} value={taxOption.id}>
                          {taxOption.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {activeTab === "measures" ? (
                    <>
                      <label className={styles.field}>
                        <span className={styles.label}>
                          {copy.saleUnit}
                          <span className={styles.required}>*</span>
                        </span>
                        <select
                          className={styles.select}
                          value={saleUnit}
                          onChange={(event) =>
                            setSaleUnit(event.target.value as ProductUnit)
                          }
                        >
                          {productUnits.map((unit) => (
                            <option key={unit} value={unit}>
                              {unitLabel(unit)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={styles.field}>
                        <span className={styles.label}>
                          {copy.salePricePerUnit}
                          <span className={styles.required}>*</span>
                        </span>
                        <input
                          className={styles.input}
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          type="number"
                          {...register("price")}
                        />
                      </label>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </section>

          {errors.root?.message ? (
            <p className={styles.submitError}>{errors.root.message}</p>
          ) : null}

          <footer className={styles.footer}>
            {isEditMode ? (
              <button
                className={styles.deleteButton}
                disabled={isMutationPending}
                type="button"
                onClick={() => {
                  void handleDeleteProduct();
                }}
              >
                {copy.deleteProduct}
              </button>
            ) : null}

            <button
              className={styles.submitButton}
              disabled={!isValid || isMutationPending}
              type="submit"
            >
              {isEditMode ? copy.saveProductChanges : copy.createProduct}
            </button>
          </footer>
        </form>
      </div>

      {confirmSwitchState ? (
        <ConfirmSwitchDrawer
          cancelLabel={copy.cancel}
          confirmLabel={copy.confirmSwitchAction}
          description={confirmSwitchState.description}
          title={confirmSwitchState.title}
          onCancel={() => setConfirmSwitchState(null)}
          onConfirm={() => {
            setActiveTab(confirmSwitchState.targetTab);
            setConfirmSwitchState(null);
          }}
        />
      ) : null}

      {isCategoryCreateDrawerOpen ? (
        <CategoryCreateDrawer
          copy={copy}
          errorMessage={categoryCreateError}
          isSubmitting={createCategoryMutation.isPending}
          isVisibleInCatalog={isCategoryVisibleInCatalog}
          name={categoryDraftName}
          productSearchTerm={categoryProductSearchTerm}
          products={categoryDrawerProducts}
          selectedProductIds={categoryProductIds}
          onClose={handleCloseCategoryCreateDrawer}
          onNameChange={(value) => {
            setCategoryDraftName(value);
            setCategoryCreateError(null);
          }}
          onProductSearchChange={setCategoryProductSearchTerm}
          onSubmit={() => {
            void handleCreateCategory();
          }}
          onToggleProduct={handleToggleCategoryProduct}
          onToggleVisibility={() =>
            setIsCategoryVisibleInCatalog(
              (currentIsVisible) => !currentIsVisible,
            )
          }
        />
      ) : null}

      {previewImageIndex !== null ? (
        <ProductImagePreviewDialog
          images={productImages}
          selectedIndex={previewImageIndex}
          onClose={() => setPreviewImageIndex(null)}
          onSelect={setPreviewImageIndex}
        />
      ) : null}
    </>
  );
}
