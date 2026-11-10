/**
 * Hydrogen expects `checkoutDomain` to be a bare host (for example
 * `15a94f-41.myshopify.com`) and builds `https://${checkoutDomain}/api/...`
 * from it. When the env var is a full URL with a path, such as
 * `15a94f-41.myshopify.com/checkouts/`, the result is
 * `.../checkouts//api/...`, which 404s and fails CORS. Normalize to the host.
 */
export function normalizeCheckoutDomain(
  value?: string | null,
): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol).host;
  } catch {
    return undefined;
  }
}
