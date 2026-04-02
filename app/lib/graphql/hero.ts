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
  mobileVideoSources?: HeroVideoSource[];
  mobileVideoUrl?: string;
  desktopVideoSources?: HeroVideoSource[];
  desktopVideoUrl?: string;
  headline?: string;
  ctaText?: string;
  ctaCollectionHandle?: string;
};

export function parseHeroMetaobject(metaobject: any): HeroContent {
  const fields = Array.isArray(metaobject?.fields) ? metaobject.fields : [];
  const byKey: Record<string, any> = Object.fromEntries(
    fields.map((f: any) => [f?.key, f])
  );

  const getSources = (videoRef: any): HeroVideoSource[] => {
    return Array.isArray(videoRef?.sources)
      ? (videoRef.sources as Array<{ url: string; mimeType?: string | null }>)
        .filter((s) => !!s?.url)
        .map((s) => ({ url: s.url, mimeType: s.mimeType ?? null }))
      : [];
  };

  const mobileVideoRef = byKey.mobile_video?.reference;
  const mobileSources = getSources(mobileVideoRef);
  const mobileMp4 = mobileSources.find((s) => (s.mimeType || '').includes('video/mp4'));
  const mobileVideoUrl = mobileMp4?.url || mobileSources[0]?.url || byKey.mobile_video?.value || undefined;

  const desktopVideoRef = byKey.desktop_video?.reference;
  const desktopSources = getSources(desktopVideoRef);
  const desktopMp4 = desktopSources.find((s) => (s.mimeType || '').includes('video/mp4'));
  const desktopVideoUrl = desktopMp4?.url || desktopSources[0]?.url || byKey.desktop_video?.value || undefined;

  const headline = byKey.headline?.value || undefined;
  const ctaText = byKey.cta_text?.value || undefined;
  const ctaCollectionHandle = byKey.cta_collection?.reference?.handle || undefined;

  return {
    mobileVideoSources: mobileSources,
    mobileVideoUrl,
    desktopVideoSources: desktopSources,
    desktopVideoUrl,
    headline,
    ctaText,
    ctaCollectionHandle
  };
}


