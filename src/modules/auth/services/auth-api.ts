import { postJson } from "@/shared/services/api-client";
import type {
  GoogleLoginPayload,
  LoginCredentials,
  LoginResponse,
  RegisterCompletePayload,
  RegisterStartPayload,
  RegisterStartResponse,
  RegisterVerifyPayload,
  RegisterVerifyResponse,
} from "@/modules/auth/types/auth-session";

export function login(credentials: LoginCredentials) {
  return postJson<LoginResponse, LoginCredentials>("/auth/login", credentials);
}

export function loginWithGoogle(payload: GoogleLoginPayload) {
  return postJson<LoginResponse, GoogleLoginPayload>("/auth/google", payload);
}

export function startRegistration(payload: RegisterStartPayload) {
  return postJson<RegisterStartResponse, RegisterStartPayload>(
    "/auth/register/start",
    payload,
  );
}

export function verifyRegistration(payload: RegisterVerifyPayload) {
  return postJson<RegisterVerifyResponse, RegisterVerifyPayload>(
    "/auth/register/verify",
    payload,
  );
}

export function completeRegistration(payload: RegisterCompletePayload) {
  return postJson<LoginResponse, RegisterCompletePayload>(
    "/auth/register/complete",
    payload,
  );
}
