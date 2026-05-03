export const appUserRoles = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "SELLER",
  "ACCOUNTANT",
  "STAFF",
] as const;

export const assignableUserRoles = [
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "SELLER",
  "ACCOUNTANT",
  "STAFF",
] as const;

export const adminUserRoles = ["OWNER", "ADMIN"] as const;
export const teamManagementRoles = ["OWNER", "ADMIN", "MANAGER"] as const;

export type AppUserRole = (typeof appUserRoles)[number];
export type AssignableUserRole = (typeof assignableUserRoles)[number];

export const userRoleLabels: Record<AppUserRole, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  CASHIER: "Cajero",
  SELLER: "Vendedor",
  ACCOUNTANT: "Contador",
  STAFF: "Colaborador",
};

export function isAdminWorkspaceRole(role?: AppUserRole | null) {
  return (
    role !== undefined &&
    role !== null &&
    adminUserRoles.includes(role as (typeof adminUserRoles)[number])
  );
}

export function isTeamManagementRole(role?: AppUserRole | null) {
  return (
    role !== undefined &&
    role !== null &&
    teamManagementRoles.includes(role as (typeof teamManagementRoles)[number])
  );
}
