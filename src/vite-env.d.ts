/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTEXTORY_API_BASE_URL: string;
  readonly VITE_CONTEXTORY_APP_ENV?: string;
  readonly VITE_KAKAO_AUTHORIZATION_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
