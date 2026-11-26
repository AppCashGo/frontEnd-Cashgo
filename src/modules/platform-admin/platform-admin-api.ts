import { useQuery } from "@tanstack/react-query";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import type { Employee } from "@/modules/employees/types/employee";
import { deleteJson, getJson, postJson, putJson } from "@/shared/services/api-client";
import { getAuthAccessToken } from "@/shared/services/auth-session";

export const planModules = {
  billing: "Facturación",
  quotes: "Cotizaciones",
  reports: "Estadísticas",
  deliveries: "Domicilios y catálogo público",
  assistant: "Asistente CashGo",
} as const;

export type PlanModule = keyof typeof planModules;

export type CommercialSettings = {
  planName: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED";
  maxUsers: number | null;
  validUntil: string | null;
  revision: number;
  modules?: PlanModule[];
};

export type PlatformBusiness = {
  id: number;
  businessName: string;
  businessCategory: string | null;
  _count: { memberships: number };
  platformSettings: (CommercialSettings & { managed: boolean }) | null;
  ownerInvitations: Array<{ email: string; expiresAt: string; acceptedAt: string | null }>;
};

export type PlatformBusinessChange = {
  id: number;
  actorUserId: number;
  previous: CommercialSettings | null;
  next: CommercialSettings;
  createdAt: string;
};

export function usePlatformAccess() {
  const userId = useAuthSessionStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["platform-access", userId],
    queryFn: () => getJson<{ allowed: boolean }>("/platform-admin/access", {
      accessToken: getAuthAccessToken(),
    }),
    enabled: Boolean(userId),
    retry: false,
  });
}

export function listPlatformBusinesses() {
  return getJson<PlatformBusiness[]>("/platform-admin/businesses", {
    accessToken: getAuthAccessToken(),
  });
}

export function listPlatformBusinessChanges(businessId: number) {
  return getJson<PlatformBusinessChange[]>(`/platform-admin/businesses/${businessId}/changes`, {
    accessToken: getAuthAccessToken(),
  });
}

export function savePlatformBusiness(businessId: number, settings: CommercialSettings) {
  const { planName, status, maxUsers, validUntil, revision, modules } = settings;
  return putJson<NonNullable<PlatformBusiness["platformSettings"]>, CommercialSettings>(`/platform-admin/businesses/${businessId}`, {
    planName, status, maxUsers, validUntil, revision, modules,
  }, {
    accessToken: getAuthAccessToken(),
  });
}

export type InvitationDelivery = {
  businessId: number;
  emailSent: boolean;
  link: string | null;
  path: string;
  expiresAt: string;
};

type CreatePlatformBusiness = CommercialSettings & {
  businessName: string;
  businessCategory: string;
  ownerEmail: string;
};

export function createPlatformBusiness(input: CreatePlatformBusiness) {
  return postJson<InvitationDelivery, CreatePlatformBusiness>("/platform-admin/businesses", input, {
    accessToken: getAuthAccessToken(),
  });
}

export function renewOwnerInvitation(businessId: number) {
  return postJson<InvitationDelivery, Record<string, never>>(`/platform-admin/businesses/${businessId}/owner-invitation`, {}, {
    accessToken: getAuthAccessToken(),
  });
}

export function listPlatformBusinessEmployees(businessId: number) {
  return getJson<Pick<Employee, "id" | "name" | "email" | "role" | "canRemove">[]>(
    `/platform-admin/businesses/${businessId}/employees`,
    { accessToken: getAuthAccessToken() },
  );
}

export function removePlatformBusinessEmployee(businessId: number, employeeId: string) {
  return deleteJson<void>(`/platform-admin/businesses/${businessId}/employees/${employeeId}`, {
    accessToken: getAuthAccessToken(),
    suppressWriteErrorNotification: true,
  });
}
