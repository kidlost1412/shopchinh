/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_ENV_MODE?: string
  readonly VITE_GOOGLE_SHEET_ID?: string
  readonly VITE_GOOGLE_SHEET_NAME?: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
