import { useMutation } from "@tanstack/react-query";
import { verifyRegistration } from "@/modules/auth/services/auth-api";

export function useVerifyRegistrationMutation() {
  return useMutation({
    mutationFn: verifyRegistration,
    retry: 0,
  });
}
