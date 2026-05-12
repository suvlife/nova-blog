/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BLOG_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
