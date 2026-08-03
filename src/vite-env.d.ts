/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTEXTORY_API_BASE_URL: string;
  readonly VITE_CONTEXTORY_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
