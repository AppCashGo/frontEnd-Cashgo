import { getJson, postJson } from "@/shared/services/api-client";
import { getAuthAccessToken } from "@/shared/services/auth-session";
import type {
  AuthUser,
  GoogleLoginPayload,
  LoginCredentials,
  LoginResponse,
  PhoneLoginStartPayload,
  PhoneLoginStartResponse,
  PhoneLoginVerifyPayload,
  RegisterCompletePayload,
  RegisterStartPayload,
  RegisterStartResponse,
  RegisterVerifyPayload,
  RegisterVerifyResponse,
} from "@/modules/auth/types/auth-session";

const signInRequestOptions = {
  handleGlobalAuthFailure: false,
  suppressWriteErrorNotification: true,
};

export function getCurrentAuthUser() {
  return getJson<AuthUser>("/auth/me", {
    accessToken: getAuthAccessToken(),
  });
}

export function login(credentials: LoginCredentials) {
  return postJson<LoginResponse, LoginCredentials>("/auth/login", credentials, signInRequestOptions);
}

export function loginWithGoogle(payload: GoogleLoginPayload) {
  return postJson<LoginResponse, GoogleLoginPayload>("/auth/google", payload, signInRequestOptions);
}

type StartEmailCodeInput = { identifier: string; password?: string };

export function startEmailLogin(input: StartEmailCodeInput) {
  return postJson<{ requestToken: string; expiresInSeconds: number }, StartEmailCodeInput>(
    "/auth/login/email/start",
    input,
    signInRequestOptions,
  );
}

export function verifyEmailLogin(input: { requestToken: string; verificationCode: string }) {
  return postJson<LoginResponse, typeof input>(
    "/auth/login/email/verify",
    input,
    signInRequestOptions,
  );
}

export function startPhoneLogin(payload: PhoneLoginStartPayload) {
  return postJson<PhoneLoginStartResponse, PhoneLoginStartPayload>(
    "/auth/login/phone/start",
    payload,
    signInRequestOptions,
  );
}

export function verifyPhoneLogin(payload: PhoneLoginVerifyPayload) {
  return postJson<LoginResponse, PhoneLoginVerifyPayload>(
    "/auth/login/phone/verify",
    payload,
    signInRequestOptions,
  );
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

export function acceptEmployeeInvitation(payload: { token: string; password: string }) {
  return postJson<{ email: string }, typeof payload>(
    "/employee-invitations/accept",
    payload,
    signInRequestOptions,
  );
}

export function requestPasswordReset(email: string) {
  return postJson<void, { email: string }>("/auth/password-reset/request", { email }, signInRequestOptions);
}

export function completePasswordReset(input: { token: string; password: string }) {
  return postJson<void, typeof input>("/auth/password-reset/complete", input, signInRequestOptions);
}
