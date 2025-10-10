export const HERO_METAOBJECT_QUERY = `#graphql
  query HeroMetaobject($handle: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    metaobject(handle: { type: "hero", handle: $handle }) {
      id
      handle
      fields {
        key
        value
        reference {
          __typename
          ... on Video {
            sources { url mimeType }
          }
          ... on Collection {
            handle
          }
        }
      }
    }
  }
` as const;

export type HeroVideoSource = { url: string; mimeType?: string | null };
export type HeroContent = {
  videoSources?: HeroVideoSource[];
  videoUrl?: string;
  headline?: string;
  ctaText?: string;
  ctaCollectionHandle?: string;
};

export function parseHeroMetaobject(metaobject: any): HeroContent {
  const fields = Array.isArray(metaobject?.fields) ? metaobject.fields : [];
  const byKey: Record<string, any> = Object.fromEntries(
    fields.map((f: any) => [f?.key, f])
  );

  const videoRef = byKey.video?.reference;
  const sources: HeroVideoSource[] = Array.isArray(videoRef?.sources)
    ? (videoRef.sources as Array<{ url: string; mimeType?: string | null }>)
      .filter((s) => !!s?.url)
      .map((s) => ({ url: s.url, mimeType: s.mimeType ?? null }))
    : [];
  // Prefer MP4 for broad browser compatibility; otherwise pick the first available
  const mp4 = sources.find((s) => (s.mimeType || '').includes('video/mp4'));
  const videoUrl = mp4?.url || sources[0]?.url || byKey.video?.value || undefined;

  const headline = byKey.headline?.value || undefined;
  const ctaText = byKey.cta_text?.value || undefined;
  const ctaCollectionHandle = byKey.cta_collection?.reference?.handle || undefined;

  return { videoSources: sources, videoUrl, headline, ctaText, ctaCollectionHandle };
}


