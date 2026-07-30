import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEmployee,
  deleteEmployee,
  getEmployeePermissionPresets,
  getEmployeeRoles,
  getEmployees,
  uploadEmployeeAvatar,
  updateEmployee,
} from "@/modules/employees/services/employees-api";
import type {
  Employee,
  EmployeeCreateInput,
  EmployeeUpdateInput,
} from "@/modules/employees/types/employee";

export const employeesQueryKey = ["employees"] as const;
export const employeeRolesQueryKey = ["employees", "roles"] as const;
export const employeePermissionPresetsQueryKey = [
  "employees",
  "presets",
] as const;

function upsertEmployeeInCache(
  current: Employee[] | undefined,
  employee: Employee,
) {
  if (!current) {
    return [employee];
  }

  const existingIndex = current.findIndex((item) => item.id === employee.id);

  if (existingIndex === -1) {
    return [employee, ...current];
  }

  return current.map((item) => (item.id === employee.id ? employee : item));
}

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
    onSuccess: async (employee) => {
      queryClient.setQueryData<Employee[]>(employeesQueryKey, (current) =>
        upsertEmployeeInCache(current, employee),
      );

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
    onSuccess: async (employee) => {
      queryClient.setQueryData<Employee[]>(employeesQueryKey, (current) =>
        upsertEmployeeInCache(current, employee),
      );

      await queryClient.invalidateQueries({
        queryKey: employeesQueryKey,
      });
    },
  });
}

export function useUploadEmployeeAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, file }: { employeeId: string; file: File }) =>
      uploadEmployeeAvatar(employeeId, file),
    onSuccess: async (employee) => {
      queryClient.setQueryData<Employee[]>(employeesQueryKey, (current) =>
        upsertEmployeeInCache(current, employee),
      );

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
    onSuccess: async (_result, employeeId) => {
      queryClient.setQueryData<Employee[]>(employeesQueryKey, (current) =>
        current?.filter((employee) => employee.id !== employeeId),
      );

      await queryClient.invalidateQueries({
        queryKey: employeesQueryKey,
      });
    },
  });
}
