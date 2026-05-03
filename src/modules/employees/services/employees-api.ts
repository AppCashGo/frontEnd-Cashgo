import type {
  Employee,
  EmployeeCreateInput,
  EmployeePermissionPreset,
  EmployeeUpdateInput,
} from "@/modules/employees/types/employee";
import type { AssignableUserRole } from "@/shared/constants/user-roles";
import {
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from "@/shared/services/api-client";
import { getAuthAccessToken } from "@/shared/services/auth-session";

export function getEmployees() {
  return getJson<Employee[]>("/employees", {
    accessToken: getAuthAccessToken(),
  });
}

export function getEmployeeRoles() {
  return getJson<AssignableUserRole[]>("/employees/roles", {
    accessToken: getAuthAccessToken(),
  });
}

export function getEmployeePermissionPresets() {
  return getJson<EmployeePermissionPreset[]>("/employees/presets", {
    accessToken: getAuthAccessToken(),
  });
}

export function createEmployee(input: EmployeeCreateInput) {
  return postJson<Employee, EmployeeCreateInput>("/employees", input, {
    accessToken: getAuthAccessToken(),
  });
}

export function updateEmployee(employeeId: string, input: EmployeeUpdateInput) {
  return patchJson<Employee, EmployeeUpdateInput>(
    `/employees/${employeeId}`,
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  );
}

export function deleteEmployee(employeeId: string) {
  return deleteJson<void>(`/employees/${employeeId}`, {
    accessToken: getAuthAccessToken(),
  });
}
