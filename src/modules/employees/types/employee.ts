import type {
  AppUserRole,
  AssignableUserRole,
} from "@/shared/constants/user-roles";

export type EmployeeActivationStatus =
  | "ACTIVE"
  | "PENDING_ACCESS"
  | "PHONE_REQUIRED";

export type EmployeePermissionItem = {
  key: string;
  label: string;
  description: string;
};

export type EmployeePermissionGroup = {
  id: string;
  label: string;
  description: string;
  permissions: EmployeePermissionItem[];
};

export type EmployeePermissionPreset = {
  id: string;
  label: string;
  summary: string;
  recommendedRoles: AppUserRole[];
  permissionGroups: EmployeePermissionGroup[];
};

export type Employee = {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  role: AppUserRole;
  activationStatus: EmployeeActivationStatus;
  recommendedPresetId: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeCreateInput = {
  name: string;
  email?: string;
  phone: string;
  password: string;
  role: AssignableUserRole;
};

export type EmployeeUpdateInput = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: AssignableUserRole;
};
