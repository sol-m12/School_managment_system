/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Parent domain for school subdomains, e.g. yourdomain.com */
  readonly VITE_APP_BASE_DOMAIN?: string;
  /** Fallback school slug when the host has no subdomain (default keyit) */
  readonly VITE_DEFAULT_TENANT_SLUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
