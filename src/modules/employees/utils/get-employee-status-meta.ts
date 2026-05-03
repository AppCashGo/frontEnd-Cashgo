import type { EmployeeActivationStatus } from "@/modules/employees/types/employee";

export type EmployeeStatusMeta = {
  label: string;
  tone: "success" | "accent" | "alert";
  description: string;
};

export function getEmployeeStatusMeta(
  status: EmployeeActivationStatus,
): EmployeeStatusMeta {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Active",
        tone: "success",
        description: "This employee has already signed in at least once.",
      };
    case "PENDING_ACCESS":
      return {
        label: "Pending access",
        tone: "accent",
        description:
          "The employee has a phone number configured but has not signed in yet.",
      };
    case "PHONE_REQUIRED":
      return {
        label: "Phone required",
        tone: "alert",
        description: "A phone number is required so the employee can sign in.",
      };
  }
}
