import { zodResolver } from "@hookform/resolvers/zod";
import { useDeferredValue, useEffect, useState } from "react";
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
import { formatDate } from "@/shared/utils/format-date";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./UsersManagementPanel.module.css";

type UsersManagementPanelProps = {
  currentUserId: string | null;
  errorMessage: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isCreatingUser: boolean;
  isUpdatingUser: boolean;
  isDeletingUser: boolean;
  roles: readonly SettingsUserRole[];
  users: SettingsUser[];
  onCreateUser: (input: SettingsUserCreateInput) => Promise<unknown>;
  onDeleteUser: (userId: string) => Promise<unknown>;
  onRetry: () => void;
  onUpdateUser: (
    userId: string,
    input: SettingsUserUpdateInput,
  ) => Promise<unknown>;
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

export function UsersManagementPanel({
  currentUserId,
  errorMessage,
  isLoading,
  isRefreshing,
  isCreatingUser,
  isUpdatingUser,
  isDeletingUser,
  roles,
  users,
  onCreateUser,
  onDeleteUser,
  onRetry,
  onUpdateUser,
}: UsersManagementPanelProps) {
  const [searchValue, setSearchValue] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const deferredSearchValue = useDeferredValue(searchValue.trim());
  const visibleUsers = users.filter((user) =>
    matchesUserSearch(user, deferredSearchValue),
  );
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const isEditing = selectedUser !== null;
  const isSubmitting = isCreatingUser || isUpdatingUser || isDeletingUser;
  const isCurrentUserSelected = selectedUser?.id === currentUserId;
  const {
    register,
    handleSubmit,
    reset,
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

  useEffect(() => {
    reset(getDefaultValues(selectedUser));
  }, [selectedUser, reset]);

  const submitUser = handleSubmit(async (values) => {
    const normalizedPassword = normalizePassword(values.password);

    if (!isEditing && !normalizedPassword) {
      setError("password", {
        message: "Password must contain at least 8 characters.",
      });
      return;
    }

    try {
      if (isEditing) {
        await onUpdateUser(selectedUser.id, {
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
        await onCreateUser({
          email: values.email.trim().toLowerCase(),
          name: values.name.trim(),
          password: normalizedPassword as string,
          role: values.role,
        });
      }

      if (!isEditing) {
        reset(getDefaultValues(null));
      }
    } catch (error) {
      setError("root", {
        message: getErrorMessage(
          error,
          "Unable to save the user right now. Please try again.",
        ),
      });
    }
  });

  async function handleDeleteUser() {
    if (!selectedUser || isCurrentUserSelected) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedUser.name} from the workspace?`,
    );

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
          "Unable to delete the user right now. Please try again.",
        ),
      });
    }
  }

  function handleStartCreate() {
    setSelectedUserId(null);
    reset(getDefaultValues(null));
  }

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Users and roles</p>
          <h3 className={styles.title}>
            Manage admin access and day-to-day team members from one workspace.
          </h3>
          <p className={styles.description}>
            Create accounts, adjust names and roles, and keep the operational
            team neatly organized.
          </p>
        </div>

        <div className={styles.headerActions}>
          {isRefreshing && !isLoading ? (
            <span className={styles.refreshingLabel}>Refreshing...</span>
          ) : null}

          <button
            className={styles.secondaryButton}
            type="button"
            onClick={handleStartCreate}
          >
            Create user
          </button>
        </div>
      </div>

      <label className={styles.searchField}>
        <span className={styles.searchLabel}>Search users</span>
        <input
          className={styles.searchInput}
          name="settings-user-search"
          placeholder="Search by name, email or role"
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
        />
      </label>

      {errorMessage ? (
        <div className={styles.feedbackCard} role="alert">
          <p className={styles.feedbackTitle}>Unable to load user management</p>
          <p className={styles.feedbackDescription}>{errorMessage}</p>
          <button
            className={styles.feedbackButton}
            type="button"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className={styles.workspace}>
        <div className={styles.listColumn}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <p className={styles.loadingTitle}>Loading team members...</p>
              <p className={styles.loadingDescription}>
                Pulling users and roles from the admin module.
              </p>
            </div>
          ) : null}

          {!isLoading && !errorMessage && visibleUsers.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>
                No users match the current search
              </p>
              <p className={styles.emptyDescription}>
                Try another name, email or role, or create a new user from the
                form on the right.
              </p>
            </div>
          ) : null}

          {!isLoading && !errorMessage && visibleUsers.length > 0 ? (
            <div className={styles.userList}>
              {visibleUsers.map((user) => {
                const isSelected = user.id === selectedUserId;
                const isCurrentUser = user.id === currentUserId;

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
                      <div>
                        <p className={styles.userName}>{user.name}</p>
                        <p className={styles.userMeta}>{user.email}</p>
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
                      <span>Created {formatDate(user.createdAt)}</span>
                      <span>
                        {isCurrentUser ? "Signed in user" : "Team member"}
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
                {isEditing ? "Edit user" : "Create user"}
              </p>
              <h4 className={styles.formTitle}>
                {isEditing
                  ? `Update ${selectedUser.name}`
                  : "Invite a new teammate into the workspace"}
              </h4>
            </div>

            {isEditing ? (
              <span className={styles.formTag}>
                {isCurrentUserSelected ? "Current session" : selectedUser.role}
              </span>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-user-name">
              Name
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
              <p className={styles.errorMessage} id="settings-user-name-error">
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
              <p className={styles.errorMessage} id="settings-user-email-error">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className={styles.inlineFields}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-user-role">
                Role
              </label>
              <select
                aria-describedby={
                  errors.role ? "settings-user-role-error" : undefined
                }
                aria-invalid={Boolean(errors.role)}
                className={styles.select}
                disabled={
                  isSubmitting || errorMessage !== null || isCurrentUserSelected
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
                  You can update your profile details here, but role changes for
                  the signed-in user stay locked to avoid access issues.
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-user-password">
                {isEditing ? "Reset password" : "Password"}
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
                    ? "Leave blank to keep current password"
                    : "Minimum 8 characters"
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
                ? `User created ${formatDate(selectedUser.createdAt)} and last updated ${formatDate(selectedUser.updatedAt)}.`
                : "New users are created immediately and can sign in as soon as credentials are shared."}
            </p>

            <div className={styles.formActions}>
              {isEditing ? (
                <>
                  <button
                    className={styles.ghostButton}
                    type="button"
                    onClick={handleStartCreate}
                  >
                    Switch to create
                  </button>

                  <button
                    className={styles.dangerButton}
                    disabled={isSubmitting || isCurrentUserSelected}
                    type="button"
                    onClick={() => {
                      void handleDeleteUser();
                    }}
                  >
                    Delete user
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
                    ? "Saving user..."
                    : "Creating user..."
                  : isEditing
                    ? "Save user"
                    : "Create user"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </SurfaceCard>
  );
}
