import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEmployee,
  deleteEmployee,
  getEmployeePermissionPresets,
  getEmployeeRoles,
  getEmployees,
  updateEmployee,
} from "@/modules/employees/services/employees-api";
import type {
  EmployeeCreateInput,
  EmployeeUpdateInput,
} from "@/modules/employees/types/employee";

export const employeesQueryKey = ["employees"] as const;
export const employeeRolesQueryKey = ["employees", "roles"] as const;
export const employeePermissionPresetsQueryKey = [
  "employees",
  "presets",
] as const;

export function useEmployeesQuery(enabled = true) {
  return useQuery({
    queryKey: employeesQueryKey,
    queryFn: getEmployees,
    enabled,
  });
}

export function useEmployeeRolesQuery(enabled = true) {
  return useQuery({
    queryKey: employeeRolesQueryKey,
    queryFn: getEmployeeRoles,
    enabled,
  });
}

export function useEmployeePermissionPresetsQuery(enabled = true) {
  return useQuery({
    queryKey: employeePermissionPresetsQueryKey,
    queryFn: getEmployeePermissionPresets,
    enabled,
  });
}

export function useCreateEmployeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EmployeeCreateInput) => createEmployee(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: employeesQueryKey,
      });
    },
  });
}

export function useUpdateEmployeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      input,
    }: {
      employeeId: string;
      input: EmployeeUpdateInput;
    }) => updateEmployee(employeeId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: employeesQueryKey,
      });
    },
  });
}

export function useDeleteEmployeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) => deleteEmployee(employeeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: employeesQueryKey,
      });
    },
  });
}
