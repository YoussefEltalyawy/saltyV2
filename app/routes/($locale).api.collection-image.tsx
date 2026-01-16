import { LoaderFunctionArgs } from '@shopify/remix-oxygen';
import type { CollectionImageFragment } from 'storefrontapi.generated';

const COLLECTION_IMAGE_QUERY = `#graphql
  fragment CollectionImage on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query CollectionImage($handle: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      ...CollectionImage
    }
  }
` as const;

export async function loader({ context, request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    let handle = url.searchParams.get('handle');

    if (!handle) {
      throw new Response('Collection handle is required', { status: 400 });
    }

    // Clean handle: remove any trailing slashes, whitespace, or query params
    handle = handle.trim().replace(/\/+$/, '').split('?')[0].split('#')[0];

    if (!handle) {
      throw new Response('Invalid collection handle', { status: 400 });
    }

    const { collection } = await context.storefront.query(COLLECTION_IMAGE_QUERY, {
      variables: {
        handle,
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
      cache: {
        maxAge: 60 * 60 * 24, // 24 hours
        staleWhileRevalidate: 60 * 60, // 1 hour
      },
    });

    if (!collection) {
      console.warn(`Collection not found for handle: ${handle}`);
      throw new Response('Collection not found', { status: 404 });
    }

    // Log if collection exists but has no image (for debugging)
    if (!collection.image && process.env.NODE_ENV === 'development') {
      console.warn(`Collection "${collection.title}" (handle: ${handle}) exists but has no image`);
    }

    return collection;
  } catch (error) {
    // Don't log 404s as errors, but log other errors
    if (error instanceof Response && error.status === 404) {
      throw error;
    }
    console.error('Error fetching collection image:', error);
    throw new Response('Error fetching collection', { status: 500 });
  }
} 