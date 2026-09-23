export const ANNOUNCEMENT_METAOBJECTS_QUERY = `#graphql
  query AnnouncementMetaobjects($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    # Metaobject definition type in the Shopify dashboard: "announcement".
    announcements: metaobjects(type: "announcement", first: 10) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            __typename
            ... on Collection {
              handle
              title
            }
          }
        }
      }
    }
  }
` as const;

export type AnnouncementItem = {
  id: string;
  message: string;
  linkLabel?: string;
  collectionHandle?: string;
  collectionTitle?: string;
  backgroundColor?: string;
  textColor?: string;
  sortOrder: number;
};

export function parseAnnouncementMetaobjects(data: any): AnnouncementItem[] {
  const nodes = data?.announcements?.nodes || [];
  return nodes
    .map((node: any) => {
      const fields = Array.isArray(node?.fields) ? node.fields : [];
      const byKey: Record<string, any> = Object.fromEntries(
        fields.map((f: any) => [f?.key, f]),
      );

      // `enabled` missing (older entry) means visible — the client hides
      // announcements by switching it off, not by deleting them.
      const enabledRaw = byKey.enabled?.value;
      const enabled =
        enabledRaw == null
          ? true
          : String(enabledRaw).toLowerCase() === 'true';

      const sortOrderRaw = byKey.sort_order?.value;
      const sortOrder =
        sortOrderRaw != null ? parseInt(sortOrderRaw, 10) : 999;

      return {
        id: node?.id,
        message: byKey.message?.value?.trim() || '',
        linkLabel: byKey.link_label?.value?.trim() || undefined,
        collectionHandle:
          byKey.collection?.reference?.handle || undefined,
        collectionTitle:
          byKey.collection?.reference?.title || undefined,
        backgroundColor: byKey.background_color?.value || undefined,
        textColor: byKey.text_color?.value || undefined,
        sortOrder: Number.isNaN(sortOrder) ? 999 : sortOrder,
        enabled,
      } as AnnouncementItem & { enabled: boolean };
    })
    .filter((a: any) => a.enabled && a.message)
    .sort(
      (a: AnnouncementItem, b: AnnouncementItem) =>
        a.sortOrder - b.sortOrder,
    );
}
