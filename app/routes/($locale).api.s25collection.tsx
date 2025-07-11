import {LoaderFunctionArgs} from '@shopify/remix-oxygen';
import type {FeaturedCollectionFragment} from 'storefrontapi.generated';

const S25_COLLECTION_QUERY = `#graphql
  fragment S25Collection on Collection {
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
  query S25Collection($handle: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      ...S25Collection
    }
  }
` as const;

export async function loader({context, request}: LoaderFunctionArgs) {
  try {
    const {collection} = await context.storefront.query(S25_COLLECTION_QUERY, {
      variables: {
        handle: 's25-collection',
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
      cache: {
        maxAge: 60 * 60 * 24, // 24 hours
        staleWhileRevalidate: 60 * 60, // 1 hour
      },
    });

    if (!collection) {
      throw new Response('Collection not found', {status: 404});
    }

    return collection;
  } catch (error) {
    console.error('Error fetching S25 collection:', error);
    throw new Response('Error fetching collection', {status: 500});
  }
}