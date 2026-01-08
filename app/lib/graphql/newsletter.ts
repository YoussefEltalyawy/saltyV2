// NOTE: The type must match the metafield definition type in your Shopify admin
// Common types: "newsletter_popup", "newsletter", "newsletter-popup", "newsletter_popup", etc.
// Check your Shopify admin > Settings > Custom data > Metaobjects to find the correct type
export const NEWSLETTER_METAOBJECT_QUERY = `#graphql
  query NewsletterMetaobject($handle: String!, $type: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    metaobject(handle: { type: $type, handle: $handle }) {
      id
      handle
      fields {
        key
        value
      }
    }
  }
` as const;

export type NewsletterContent = {
  title?: string;
  description?: string;
  discountCode?: string;
};

export function parseNewsletterMetaobject(metaobject: any): NewsletterContent {
  if (!metaobject?.fields) {
    return {};
  }

  const fields = Array.isArray(metaobject.fields) ? metaobject.fields : [];
  const byKey: Record<string, any> = Object.fromEntries(
    fields.map((f: any) => [f?.key, f])
  );

  const title = byKey.title?.value || undefined;
  const description = byKey.description?.value || undefined;
  const discountCode = byKey.discount_code?.value || byKey['discount code']?.value || undefined;

  return { title, description, discountCode };
}
