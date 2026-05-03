import { useMutation } from "@tanstack/react-query";
import { startRegistration } from "@/modules/auth/services/auth-api";

export function useStartRegistrationMutation() {
  return useMutation({
    mutationFn: startRegistration,
    retry: 0,
  });
}
