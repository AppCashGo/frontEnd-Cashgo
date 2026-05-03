import { useMutation } from "@tanstack/react-query";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import { loginWithGoogle } from "@/modules/auth/services/auth-api";
import type { GoogleLoginPayload } from "@/modules/auth/types/auth-session";
import { useLanguageStore } from "@/shared/i18n/use-language-store";

export function useGoogleLoginMutation() {
  const setSession = useAuthSessionStore((state) => state.setSession);
  const setLanguagePreference = useLanguageStore(
    (state) => state.setLanguagePreference,
  );

  return useMutation({
    mutationFn: (payload: GoogleLoginPayload) => loginWithGoogle(payload),
    retry: 0,
    onSuccess: (response) => {
      setSession({
        accessToken: response.accessToken,
        user: response.user,
      });
      setLanguagePreference({
        code: response.user.translation.code,
        translationId: response.user.translation.id,
      });
    },
  });
}
