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
          ... on MediaImage {
            image { url altText width height }
          }
          ... on Collection {
            handle
          }
        }
      }
    }
    heroSlides: metaobjects(type: "hero_slide", first: 10) {
      nodes {
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
            ... on MediaImage {
              image { url altText width height }
            }
            ... on Collection {
              handle
            }
          }
        }
      }
    }
  }
` as const;

export type HeroVideoSource = { url: string; mimeType?: string | null };
export type HeroSlideContent = {
  mobileVideoSources?: HeroVideoSource[];
  mobileVideoUrl?: string;
  desktopVideoSources?: HeroVideoSource[];
  desktopVideoUrl?: string;
  mobileImageUrl?: string;
  desktopImageUrl?: string;
  headline?: string;
  ctaText?: string;
  ctaCollectionHandle?: string;
  textColor?: string;
  sortOrder?: number;
};

export type HeroContent = HeroSlideContent & {
  slides?: HeroSlideContent[];
};

function parseFields(fields: any[]): HeroSlideContent {
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

  const mobileImageUrl = byKey.mobile_image?.reference?.image?.url || byKey.mobile_image?.value || undefined;
  const desktopImageUrl = byKey.desktop_image?.reference?.image?.url || byKey.desktop_image?.value || undefined;

  const headline = byKey.headline?.value || undefined;
  const ctaText = byKey.cta_text?.value || undefined;
  const ctaCollectionHandle = byKey.cta_collection?.reference?.handle || undefined;
  const textColor = byKey.hero_text_color?.value || undefined;

  // Parse sort_order as a number; default to 999 so unset entries go to the end
  const sortOrderRaw = byKey.sort_order?.value;
  const sortOrder = sortOrderRaw != null ? parseInt(sortOrderRaw, 10) : 999;

  return {
    mobileVideoSources: mobileSources,
    mobileVideoUrl,
    desktopVideoSources: desktopSources,
    desktopVideoUrl,
    mobileImageUrl,
    desktopImageUrl,
    headline,
    ctaText,
    ctaCollectionHandle,
    textColor,
    sortOrder,
  };
}

export function parseHeroMetaobject(heroData: any): HeroContent {
  const metaobject = heroData?.metaobject;
  const fields = Array.isArray(metaobject?.fields) ? metaobject.fields : [];
  const baseHero = parseFields(fields);

  const slidesNodes = heroData?.heroSlides?.nodes || [];
  const slides = slidesNodes
    .map((node: any) => parseFields(node.fields || []))
    // Sort ascending by sortOrder so slide 1 always comes first
    .sort((a: HeroSlideContent, b: HeroSlideContent) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

  return {
    ...baseHero,
    slides: slides.length > 0 ? slides : undefined,
  };
}
