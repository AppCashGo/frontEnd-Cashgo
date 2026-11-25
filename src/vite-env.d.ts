/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_REGISTRATION_ENABLED?: string
  readonly VITE_API_URL?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
