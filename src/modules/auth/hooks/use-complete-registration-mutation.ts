import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import { completeRegistration } from "@/modules/auth/services/auth-api";
import { getModuleLandingPath } from "@/routes/module-navigation-routes";
import { useLanguageStore } from "@/shared/i18n/use-language-store";

export function useCompleteRegistrationMutation() {
  const navigate = useNavigate();
  const setSession = useAuthSessionStore((state) => state.setSession);
  const setLanguagePreference = useLanguageStore(
    (state) => state.setLanguagePreference,
  );

  return useMutation({
    mutationFn: completeRegistration,
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
      navigate(
        getModuleLandingPath(
          response.user.translation.code === "en" ? "en" : "es",
          response.user.businessCategory,
          response.user.role,
        ),
        { replace: true },
      );
    },
  });
}
