import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BusinessCategoryPickerModal } from "@/shared/components/business/BusinessCategoryPickerModal";
import { SideDrawer } from "@/shared/components/ui/SideDrawer";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import {
  businessCategoryOptions,
  type BusinessCategoryOption,
} from "@/shared/constants/business-categories";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./CreateBusinessModal.module.css";

export type CreateBusinessModalValues = {
  businessName: string;
  businessCategory: BusinessCategoryOption;
  address: string;
  city: string;
  phone: string;
  email: string;
  document: string;
};

type CreateBusinessModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: CreateBusinessModalValues) => Promise<void>;
};

export function CreateBusinessModal({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: CreateBusinessModalProps) {
  const { dictionary } = useAppTranslation();
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const formId = "create-business-form";

  const schema = useMemo(
    () =>
      z.object({
        businessName: z
          .string()
          .trim()
          .min(2, dictionary.layout.sidebar.createBusiness.validation.name),
        businessCategory: z.enum(businessCategoryOptions, {
          errorMap: () => ({
            message: dictionary.layout.sidebar.createBusiness.validation.category,
          }),
        }),
        address: z.string().trim(),
        city: z.string().trim(),
        phone: z.string().trim(),
        email: z
          .string()
          .trim()
          .refine(
            (value) =>
              value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            dictionary.layout.sidebar.createBusiness.validation.email,
          ),
        document: z.string().trim(),
      }),
    [dictionary],
  );

  const {
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<CreateBusinessModalValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      businessName: "",
      businessCategory: undefined,
      address: "",
      city: "",
      phone: "",
      email: "",
      document: "",
    },
  });

  const selectedBusinessCategory = watch("businessCategory");

  async function submitForm(values: CreateBusinessModalValues) {
    try {
      await onSubmit(values);
      reset();
      onClose();
    } catch (error) {
      setError("root", {
        message: getErrorMessage(
          error,
          dictionary.layout.sidebar.createBusiness.errorMessage,
        ),
      });
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <>
      <SideDrawer
        bodyClassName={styles.drawerBody}
        className={styles.backdrop}
        closeLabel={dictionary.common.close}
        description={dictionary.layout.sidebar.createBusiness.requiredHint}
        footer={
          <button
            className={styles.primaryButton}
            disabled={isSubmitting || !isValid}
            form={formId}
            type="submit"
          >
            {isSubmitting
              ? dictionary.layout.sidebar.createBusiness.pending
              : dictionary.layout.sidebar.createBusiness.submit}
          </button>
        }
        footerClassName={styles.footer}
        isOpen={isOpen}
        panelClassName={styles.drawer}
        title={dictionary.layout.sidebar.createBusiness.title}
        onClose={handleClose}
      >
        <form
          className={styles.form}
          id={formId}
          noValidate
          onSubmit={handleSubmit(submitForm)}
        >
          <label className={styles.field}>
            <span className={styles.label}>
              {dictionary.layout.sidebar.createBusiness.categoryLabel}
              <span className={styles.requiredMark}>*</span>
            </span>
            <button
              className={styles.categoryButton}
              type="button"
              onClick={() => setCategoryModalOpen(true)}
            >
              <span>
                {selectedBusinessCategory
                  ? dictionary.categories[
                      selectedBusinessCategory as keyof typeof dictionary.categories
                    ]
                  : dictionary.layout.sidebar.createBusiness.categoryPlaceholder}
              </span>
              <span className={styles.fieldSuffix}>⌄</span>
            </button>
          </label>
          {errors.businessCategory ? (
            <p className={styles.errorMessage}>
              {errors.businessCategory.message}
            </p>
          ) : null}

          <label className={styles.field}>
            <span className={styles.label}>
              {dictionary.layout.sidebar.createBusiness.nameLabel}
              <span className={styles.requiredMark}>*</span>
            </span>
            <input
              className={styles.input}
              placeholder={dictionary.layout.sidebar.createBusiness.namePlaceholder}
              type="text"
              {...register("businessName")}
            />
          </label>
          {errors.businessName ? (
            <p className={styles.errorMessage}>{errors.businessName.message}</p>
          ) : null}

          <label className={styles.field}>
            <span className={styles.label}>
              {dictionary.layout.sidebar.createBusiness.addressLabel}
            </span>
            <input
              className={styles.input}
              placeholder={dictionary.layout.sidebar.createBusiness.addressPlaceholder}
              type="text"
              {...register("address")}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              {dictionary.layout.sidebar.createBusiness.cityLabel}
            </span>
            <input
              className={styles.input}
              placeholder={dictionary.layout.sidebar.createBusiness.cityPlaceholder}
              type="text"
              {...register("city")}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              {dictionary.layout.sidebar.createBusiness.phoneLabel}
            </span>
            <div className={styles.phoneField}>
              <span className={styles.phonePrefix}>
                <span className={styles.phoneFlag}>🇨🇴</span>
              </span>
              <input
                className={styles.phoneInput}
                placeholder={dictionary.layout.sidebar.createBusiness.phonePlaceholder}
                type="tel"
                {...register("phone")}
              />
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              {dictionary.layout.sidebar.createBusiness.emailLabel}
            </span>
            <input
              className={styles.input}
              placeholder={dictionary.layout.sidebar.createBusiness.emailPlaceholder}
              type="email"
              {...register("email")}
            />
          </label>
          {errors.email ? (
            <p className={styles.errorMessage}>{errors.email.message}</p>
          ) : null}

          <label className={styles.field}>
            <span className={styles.label}>
              {dictionary.layout.sidebar.createBusiness.documentLabel}
            </span>
            <input
              className={styles.input}
              placeholder={dictionary.layout.sidebar.createBusiness.documentPlaceholder}
              type="text"
              {...register("document")}
            />
          </label>

          {errors.root?.message ? (
            <div className={styles.errorBanner} role="alert">
              {errors.root.message}
            </div>
          ) : null}
        </form>
      </SideDrawer>

      <BusinessCategoryPickerModal
        isOpen={isCategoryModalOpen}
        selectedCategory={selectedBusinessCategory}
        onClose={() => setCategoryModalOpen(false)}
        onSelectCategory={(category) => {
          setValue("businessCategory", category, {
            shouldValidate: true,
          });
          setCategoryModalOpen(false);
        }}
      />
    </>
  );
}
