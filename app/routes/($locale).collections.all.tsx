import { type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, type MetaFunction } from 'react-router';
import { Analytics } from '@shopify/hydrogen';
import { ProductCard } from '~/components/ProductCard';
import type { ProductItemFullFragment } from 'storefrontapi.generated';

export const meta: MetaFunction<typeof loader> = () => {
  return [{ title: `SALTY | Products` }];
};

export async function loader(args: LoaderFunctionArgs) {
  const { context, request } = args;
  const { storefront } = context;

  // Get all products without pagination for the "all" collection
  const { products } = await storefront.query(ALL_PRODUCTS_QUERY);

  return { products };
}

export default function Collection() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <div className="collection">
      <h1 className='ml-1 font-semibold uppercase text-small'>Products</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-4 mb-4">
        {products.nodes.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <Analytics.CollectionView data={{ collection: { id: 'all-products', handle: 'all' } }} />
    </div>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItemCollection on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    images(first: 10) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          id
          availableForSale
          image {
            id
            url
            altText
            width
            height
          }
          price {
            amount
            currencyCode
          }
          compareAtPrice {
            amount
            currencyCode
          }
          selectedOptions {
            name
            value
          }
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant {
      price {
        amount
        currencyCode
      }
      compareAtPrice {
        amount
        currencyCode
      }
    }
  }
` as const;

const ALL_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query AllProducts(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: 250) {
      nodes {
        ...ProductItemCollection
      }
    }
  }
` as const;
