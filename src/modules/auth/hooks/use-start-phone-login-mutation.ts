import { useMutation } from "@tanstack/react-query";
import { startPhoneLogin } from "@/modules/auth/services/auth-api";

export function useStartPhoneLoginMutation() {
  return useMutation({
    mutationFn: startPhoneLogin,
    retry: 0,
  });
}
