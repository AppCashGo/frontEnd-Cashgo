import { zodResolver } from "@hookform/resolvers/zod";
import {
  type ChangeEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import {
  settingsUserFormSchema,
  type SettingsUserFormValues,
} from "@/modules/settings/schemas/settings-user-form-schema";
import type {
  SettingsUser,
  SettingsUserCreateInput,
  SettingsUserRole,
  SettingsUserUpdateInput,
} from "@/modules/settings/types/settings";
import { SurfaceCard } from "@/shared/components/ui/SurfaceCard";
import {
  isAdminWorkspaceRole,
  assignableUserRoles,
  type AssignableUserRole,
  userRoleLabels,
} from "@/shared/constants/user-roles";
import { useConfirmDialog } from "@/shared/hooks/use-confirm-dialog";
import { formatDate } from "@/shared/utils/format-date";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import {
  IMAGE_UPLOAD_ACCEPT,
  validateImageUploadFile,
} from "@/shared/utils/image-upload-validation";
import { joinClassNames } from "@/shared/utils/join-class-names";
import { resolveApiAssetUrl } from "@/shared/services/api-client";
import styles from "./UsersManagementPanel.module.css";

type UsersManagementPanelProps = {
  currentUserId: string | null;
  errorMessage: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isCreatingUser: boolean;
  isUpdatingUser: boolean;
  isUploadingUserAvatar: boolean;
  isDeletingUser: boolean;
  roles: readonly SettingsUserRole[];
  users: SettingsUser[];
  onCreateUser: (input: SettingsUserCreateInput) => Promise<SettingsUser>;
  onDeleteUser: (userId: string) => Promise<unknown>;
  onRetry: () => void;
  onUploadUserAvatar: (userId: string, file: File) => Promise<SettingsUser>;
  onUpdateUser: (
    userId: string,
    input: SettingsUserUpdateInput,
  ) => Promise<SettingsUser>;
};

function getDefaultValues(user: SettingsUser | null): SettingsUserFormValues {
  const role =
    user && assignableUserRoles.includes(user.role as AssignableUserRole)
      ? (user.role as AssignableUserRole)
      : "STAFF";

  return {
    email: user?.email ?? "",
    name: user?.name ?? "",
    role,
    password: "",
  };
}

function normalizePassword(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function matchesUserSearch(user: SettingsUser, query: string) {
  if (query.length === 0) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();

  return (
    user.name.toLowerCase().includes(normalizedQuery) ||
    user.email.toLowerCase().includes(normalizedQuery) ||
    user.role.toLowerCase().includes(normalizedQuery)
  );
}

function getUserInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
}

export function UsersManagementPanel({
  currentUserId,
  errorMessage,
  isLoading,
  isRefreshing,
  isCreatingUser,
  isUpdatingUser,
  isUploadingUserAvatar,
  isDeletingUser,
  roles,
  users,
  onCreateUser,
  onDeleteUser,
  onRetry,
  onUploadUserAvatar,
  onUpdateUser,
}: UsersManagementPanelProps) {
  const [searchValue, setSearchValue] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const deferredSearchValue = useDeferredValue(searchValue.trim());
  const visibleUsers = users.filter((user) =>
    matchesUserSearch(user, deferredSearchValue),
  );
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const isEditing = selectedUser !== null;
  const isSubmitting =
    isCreatingUser || isUpdatingUser || isUploadingUserAvatar || isDeletingUser;
  const isCurrentUserSelected = selectedUser?.id === currentUserId;
  const storedAvatarUrl = resolveApiAssetUrl(selectedUser?.avatarUrl);
  const visibleAvatarUrl = avatarPreviewUrl ?? storedAvatarUrl;
  const { confirm, confirmationDialog } = useConfirmDialog();
  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<SettingsUserFormValues>({
    resolver: zodResolver(settingsUserFormSchema),
    defaultValues: getDefaultValues(selectedUser),
  });

  useEffect(() => {
    if (users.length === 0) {
      if (selectedUserId !== null) {
        setSelectedUserId(null);
      }

      return;
    }

    const hasSelectedUser = users.some((user) => user.id === selectedUserId);

    if (!hasSelectedUser && selectedUserId !== null) {
      setSelectedUserId(users[0]?.id ?? null);
    }
  }, [selectedUserId, users]);

  const clearAvatarSelection = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }

      return null;
    });

    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    reset(getDefaultValues(selectedUser));
    clearAvatarSelection();
  }, [clearAvatarSelection, selectedUser, reset]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    const validationError = validateImageUploadFile(file);

    if (validationError) {
      clearAvatarSelection();
      setError("root", {
        message: validationError,
      });
      return;
    }

    clearErrors("root");
    setAvatarFile(file);
    setAvatarPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }

      return URL.createObjectURL(file);
    });
  }

  const submitUser = handleSubmit(async (values) => {
    const normalizedPassword = normalizePassword(values.password);

    if (!isEditing && !normalizedPassword) {
      setError("password", {
        message: "La contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }

    try {
      let savedUser: SettingsUser;

      if (isEditing) {
        savedUser = await onUpdateUser(selectedUser.id, {
          email: values.email.trim().toLowerCase(),
          name: values.name.trim(),
          role: values.role,
          ...(normalizedPassword
            ? {
                password: normalizedPassword,
              }
            : {}),
        });
      } else {
        savedUser = await onCreateUser({
          email: values.email.trim().toLowerCase(),
          name: values.name.trim(),
          password: normalizedPassword as string,
          role: values.role,
        });
      }

      if (avatarFile) {
        await onUploadUserAvatar(savedUser.id, avatarFile);
      }

      clearAvatarSelection();

      if (!isEditing) {
        reset(getDefaultValues(null));
      }
    } catch (error) {
      setError("root", {
        message: getErrorMessage(
          error,
          "No fue posible guardar el usuario. Intenta nuevamente.",
        ),
      });
    }
  });

  async function handleDeleteUser() {
    if (!selectedUser || isCurrentUserSelected) {
      return;
    }

    const confirmed = await confirm({
      title: "Eliminar usuario",
      description: `¿Eliminar a ${selectedUser.name} del equipo? Perderá el acceso a este negocio.`,
      confirmLabel: "Eliminar usuario",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      await onDeleteUser(selectedUser.id);
      setSelectedUserId(null);
      reset(getDefaultValues(null));
    } catch (error) {
      setError("root", {
        message: getErrorMessage(
          error,
          "No fue posible eliminar el usuario. Intenta nuevamente.",
        ),
      });
    }
  }

  function handleStartCreate() {
    setSelectedUserId(null);
    reset(getDefaultValues(null));
    clearAvatarSelection();
  }

  return (
    <>
      {confirmationDialog}
      <SurfaceCard className={styles.card}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Equipo y roles</p>
            <h3 className={styles.title}>
              Administra los accesos y responsabilidades de tu equipo.
            </h3>
            <p className={styles.description}>
              Crea cuentas, actualiza perfiles y asigna permisos operativos.
            </p>
          </div>

          <div className={styles.headerActions}>
            {isRefreshing && !isLoading ? (
              <span className={styles.refreshingLabel}>Actualizando...</span>
            ) : null}

            <button
              className={styles.secondaryButton}
              type="button"
              onClick={handleStartCreate}
            >
              Crear usuario
            </button>
          </div>
        </div>

        <label className={styles.searchField}>
          <span className={styles.searchLabel}>Buscar usuarios</span>
          <input
            className={styles.searchInput}
            name="settings-user-search"
            placeholder="Buscar por nombre, correo o rol"
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </label>

        {errorMessage ? (
          <div className={styles.feedbackCard} role="alert">
            <p className={styles.feedbackTitle}>
              No pudimos cargar el equipo
            </p>
            <p className={styles.feedbackDescription}>{errorMessage}</p>
            <button
              className={styles.feedbackButton}
              type="button"
              onClick={onRetry}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        <div className={styles.workspace}>
          <div className={styles.listColumn}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <p className={styles.loadingTitle}>Cargando equipo...</p>
                <p className={styles.loadingDescription}>
                  Estamos consultando usuarios y roles del negocio.
                </p>
              </div>
            ) : null}

            {!isLoading && !errorMessage && visibleUsers.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>
                  No hay usuarios para esta búsqueda
                </p>
                <p className={styles.emptyDescription}>
                  Prueba otro nombre, correo o rol, o crea un usuario nuevo.
                </p>
              </div>
            ) : null}

            {!isLoading && !errorMessage && visibleUsers.length > 0 ? (
              <div className={styles.userList}>
                {visibleUsers.map((user) => {
                  const isSelected = user.id === selectedUserId;
                  const isCurrentUser = user.id === currentUserId;
                  const avatarUrl = resolveApiAssetUrl(user.avatarUrl);

                  return (
                    <button
                      key={user.id}
                      className={joinClassNames(
                        styles.userButton,
                        isSelected && styles.userButtonActive,
                      )}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <div className={styles.userButtonTopRow}>
                        <div className={styles.userIdentity}>
                          <span
                            className={styles.userAvatar}
                            aria-hidden="true"
                          >
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" />
                            ) : (
                              getUserInitials(user.name)
                            )}
                          </span>

                          <div>
                            <p className={styles.userName}>{user.name}</p>
                            <p className={styles.userMeta}>{user.email}</p>
                          </div>
                        </div>

                        <span
                          className={joinClassNames(
                            styles.rolePill,
                            isAdminWorkspaceRole(user.role) &&
                              styles.rolePillAdmin,
                          )}
                        >
                          {userRoleLabels[user.role]}
                        </span>
                      </div>

                      <div className={styles.userButtonFooter}>
                        <span>Creado el {formatDate(user.createdAt)}</span>
                        <span>
                          {isCurrentUser ? "Sesión actual" : "Miembro del equipo"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <form className={styles.form} noValidate onSubmit={submitUser}>
            <div className={styles.formHeader}>
              <div>
                <p className={styles.formEyebrow}>
                  {isEditing ? "Editar usuario" : "Crear usuario"}
                </p>
                <h4 className={styles.formTitle}>
                  {isEditing
                    ? `Actualizar a ${selectedUser.name}`
                    : "Agrega una persona a tu equipo"}
                </h4>
              </div>

              {isEditing ? (
                <span className={styles.formTag}>
                  {isCurrentUserSelected
                    ? "Sesión actual"
                    : userRoleLabels[selectedUser.role]}
                </span>
              ) : null}
            </div>

            <div className={styles.avatarField}>
              <span className={styles.avatarPreview} aria-hidden="true">
                {visibleAvatarUrl ? (
                  <img src={visibleAvatarUrl} alt="" />
                ) : (
                  getUserInitials(selectedUser?.name ?? "Usuario")
                )}
              </span>

              <div className={styles.avatarCopy}>
                <p className={styles.avatarTitle}>Foto de perfil</p>
                <p className={styles.avatarDescription}>
                  Sube una imagen PNG, JPG o WEBP de hasta 2MB.
                </p>
                <div className={styles.avatarActions}>
                  <label
                    className={joinClassNames(
                      styles.avatarUploadButton,
                      (isSubmitting || errorMessage !== null) &&
                        styles.avatarUploadButtonDisabled,
                    )}
                    htmlFor="settings-user-avatar"
                  >
                    {avatarFile ? "Cambiar foto seleccionada" : "Subir foto"}
                  </label>
                  {avatarPreviewUrl ? (
                    <button
                      className={styles.avatarClearButton}
                      disabled={isSubmitting || errorMessage !== null}
                      type="button"
                      onClick={clearAvatarSelection}
                    >
                      Quitar selección
                    </button>
                  ) : null}
                </div>
                <input
                  ref={avatarInputRef}
                  accept={IMAGE_UPLOAD_ACCEPT}
                  className={styles.fileInput}
                  disabled={isSubmitting || errorMessage !== null}
                  id="settings-user-avatar"
                  type="file"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-user-name">
                Nombre
              </label>
              <input
                aria-describedby={
                  errors.name ? "settings-user-name-error" : undefined
                }
                aria-invalid={Boolean(errors.name)}
                className={styles.input}
                disabled={isSubmitting || errorMessage !== null}
                id="settings-user-name"
                placeholder="Camila Perez"
                type="text"
                {...register("name")}
              />
              {errors.name ? (
                <p
                  className={styles.errorMessage}
                  id="settings-user-name-error"
                >
                  {errors.name.message}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-user-email">
                Email
              </label>
              <input
                aria-describedby={
                  errors.email ? "settings-user-email-error" : undefined
                }
                aria-invalid={Boolean(errors.email)}
                className={styles.input}
                disabled={isSubmitting || errorMessage !== null}
                id="settings-user-email"
                placeholder="camila@cashgo.com"
                type="email"
                {...register("email")}
              />
              {errors.email ? (
                <p
                  className={styles.errorMessage}
                  id="settings-user-email-error"
                >
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className={styles.inlineFields}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="settings-user-role">
                  Rol
                </label>
                <select
                  aria-describedby={
                    errors.role ? "settings-user-role-error" : undefined
                  }
                  aria-invalid={Boolean(errors.role)}
                  className={styles.select}
                  disabled={
                    isSubmitting ||
                    errorMessage !== null ||
                    isCurrentUserSelected
                  }
                  id="settings-user-role"
                  {...register("role")}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {userRoleLabels[role]}
                    </option>
                  ))}
                </select>
                {errors.role ? (
                  <p
                    className={styles.errorMessage}
                    id="settings-user-role-error"
                  >
                    {errors.role.message}
                  </p>
                ) : null}
                {isCurrentUserSelected ? (
                  <p className={styles.helperInline}>
                    Puedes actualizar tu perfil, pero el rol de la sesión actual
                    permanece bloqueado para evitar perder el acceso.
                  </p>
                ) : null}
              </div>

              <div className={styles.field}>
                <label
                  className={styles.label}
                  htmlFor="settings-user-password"
                >
                  {isEditing ? "Cambiar contraseña" : "Contraseña"}
                </label>
                <input
                  aria-describedby={
                    errors.password ? "settings-user-password-error" : undefined
                  }
                  aria-invalid={Boolean(errors.password)}
                  className={styles.input}
                  disabled={isSubmitting || errorMessage !== null}
                  id="settings-user-password"
                  placeholder={
                    isEditing
                      ? "Déjala vacía para conservar la actual"
                      : "Mínimo 8 caracteres"
                  }
                  type="password"
                  {...register("password")}
                />
                {errors.password ? (
                  <p
                    className={styles.errorMessage}
                    id="settings-user-password-error"
                  >
                    {errors.password.message}
                  </p>
                ) : null}
              </div>
            </div>

            {errors.root?.message ? (
              <div className={styles.errorBanner} role="alert">
                {errors.root.message}
              </div>
            ) : null}

            <div className={styles.formFooter}>
              <p className={styles.helperText}>
                {isEditing
                  ? `Usuario creado el ${formatDate(selectedUser.createdAt)} y actualizado el ${formatDate(selectedUser.updatedAt)}.`
                  : "El usuario podrá ingresar cuando compartas sus credenciales."}
              </p>

              <div className={styles.formActions}>
                {isEditing ? (
                  <>
                    <button
                      className={styles.ghostButton}
                      type="button"
                      onClick={handleStartCreate}
                    >
                      Crear otro
                    </button>

                    <button
                      className={styles.dangerButton}
                      disabled={isSubmitting || isCurrentUserSelected}
                      type="button"
                      onClick={() => {
                        void handleDeleteUser();
                      }}
                    >
                      Eliminar usuario
                    </button>
                  </>
                ) : null}

                <button
                  className={styles.primaryButton}
                  disabled={isSubmitting || errorMessage !== null}
                  type="submit"
                >
                  {isSubmitting
                    ? isEditing
                      ? "Guardando..."
                      : "Creando..."
                    : isEditing
                      ? "Guardar usuario"
                      : "Crear usuario"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </SurfaceCard>
    </>
  );
}
