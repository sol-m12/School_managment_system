const DEFAULT_TENANT_SLUG = "keyit";

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "platform",
  "admin",
  "app",
  "localhost",
]);

function defaultSlug(): string {
  const fromEnv = import.meta.env.VITE_DEFAULT_TENANT_SLUG?.trim();
  return fromEnv || DEFAULT_TENANT_SLUG;
}

/**
 * Subdomain is the school slug: sunrise.yourdomain.com → "sunrise".
 * Bare localhost / apex / reserved hosts fall back to the default school.
 */
export function tenantSlugFromHost(hostname = window.location.hostname): string {
  const host = hostname.toLowerCase().trim();
  if (!host) return defaultSlug();

  if (host === "localhost" || host === "127.0.0.1") return defaultSlug();

  const labels = host.split(".").filter(Boolean);
  if (labels.length === 0) return defaultSlug();

  // sunrise.localhost → sunrise
  if (host.endsWith(".localhost") && labels.length >= 2) {
    const sub = labels[0];
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) return sub;
    return defaultSlug();
  }

  // sunrise.yourdomain.com → sunrise (needs at least subdomain + domain + tld)
  if (labels.length >= 3) {
    const sub = labels[0];
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) return sub;
  }

  return defaultSlug();
}

/** Prefer ?tenant= when present; otherwise use the host subdomain. */
export function resolveTenantSlug(searchParams?: URLSearchParams): string {
  const fromQuery = searchParams?.get("tenant")?.trim();
  if (fromQuery) return fromQuery;
  return tenantSlugFromHost();
}

/**
 * Public school site URL for Super Admin lists.
 * With VITE_APP_BASE_DOMAIN=yourdomain.com → https://slug.yourdomain.com
 * Otherwise → same origin /login?tenant=slug (works in local dev).
 */
export function schoolSiteUrl(slug: string, origin = window.location.origin): string {
  const cleaned = slug.trim().toLowerCase();
  const baseDomain = import.meta.env.VITE_APP_BASE_DOMAIN?.trim().toLowerCase();
  if (baseDomain) {
    const protocol = origin.startsWith("http://") ? "http" : "https";
    return `${protocol}://${cleaned}.${baseDomain}`;
  }
  return `${origin}/login?tenant=${encodeURIComponent(cleaned)}`;
}

export function schoolLoginPath(slug: string): string {
  return `/login?tenant=${encodeURIComponent(slug.trim())}`;
}
