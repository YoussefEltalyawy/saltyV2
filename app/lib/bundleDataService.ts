import { BUNDLE_COLLECTIONS } from './bundleConfig';

// Centralized data fetching for bundles
export class BundleDataService {
  private storefront: any;
  private cache: Map<string, any> = new Map();

  constructor(storefront: any) {
    this.storefront = storefront;
  }

  /**
   * Fetch products from a collection
   */
  async fetchCollectionProducts(collectionHandle: string): Promise<any[]> {
    const cacheKey = `collection_${collectionHandle}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const result = await this.storefront.query(`
        query GetCollectionProducts($handle: String!) {
          collection(handle: $handle) {
            products(first: 50) {
              nodes {
                id
                title
                handle
                description
                featuredImage {
                  url
                  altText
                }
                options {
                  name
                  optionValues {
                    name
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
                variants(first: 100) {
                  nodes {
                    id
                    availableForSale
                    image {
                      url
                      altText
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
                }
              }
            }
          }
        }
      `, {
        variables: { handle: collectionHandle },
      });

      const products = result?.collection?.products?.nodes || [];
      this.cache.set(cacheKey, products);
      return products;
    } catch (err) {
      console.error(`Error fetching collection ${collectionHandle}:`, err);
      return [];
    }
  }

  /**
   * Fetch a specific product by handle
   */
  async fetchProduct(handle: string): Promise<any> {
    const cacheKey = `product_${handle}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const result = await this.storefront.query(`
        query GetProduct($handle: String!) {
          product(handle: $handle) {
            id
            title
            handle
            description
            featuredImage {
              url
              altText
            }
            options {
              name
              optionValues {
                name
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
            variants(first: 100) {
              nodes {
                id
                availableForSale
                image {
                  url
                  altText
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
            }
          }
        }
      `, {
        variables: { handle },
      });

      const product = result?.product || null;
      this.cache.set(cacheKey, product);
      return product;
    } catch (err) {
      console.error(`Error fetching product ${handle}:`, err);
      return null;
    }
  }

  /**
   * Fetch collection handles for a given product handle
   */
  async fetchProductCollectionHandles(productHandle: string): Promise<string[]> {
    const cacheKey = `product_collections_${productHandle}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const result = await this.storefront.query(`
        query ProductCollections($handle: String!) {
          product(handle: $handle) {
            collections(first: 10) {
              nodes { handle }
            }
          }
        }
      `, { variables: { handle: productHandle } });

      const handles = result?.product?.collections?.nodes?.map((c: any) => c.handle) || [];
      this.cache.set(cacheKey, handles);
      return handles;
    } catch (err) {
      console.error(`Error fetching collections for product ${productHandle}:`, err);
      return [];
    }
  }

  /**
   * Fetch complementary products for cross-selling based on membership in denim/polo
   */
  async fetchComplementaryProductsByHandle(productHandle: string): Promise<any[]> {
    try {
      const handles = await this.fetchProductCollectionHandles(productHandle);
      const isInDenim = handles.includes(BUNDLE_COLLECTIONS.DENIM);
      const isInPolo = handles.includes(BUNDLE_COLLECTIONS.POLO);

      if (!isInDenim && !isInPolo) return [];

      const complementaryCollection = isInDenim
        ? BUNDLE_COLLECTIONS.POLO
        : BUNDLE_COLLECTIONS.DENIM;

      return await this.fetchCollectionProducts(complementaryCollection);
    } catch (err) {
      console.error('Error fetching complementary products:', err);
      return [];
    }
  }

  /**
   * Product page bundle-related data in one call to mirror existing loader shape
   */
  async fetchProductPageBundleData(productHandle: string): Promise<{
    isInDenim: boolean;
    isInPolo: boolean;
    isInCaps: boolean;
    isInTops: boolean;
    isLinenShirt: boolean;
    isLinenPants: boolean;
    complementaryProducts: any[];
    polos: any[];
    caps: any[];
    tops: any[];
    linenShirt: any;
    linenPants: any;
  }> {
    const handles = await this.fetchProductCollectionHandles(productHandle);

    const isInDenim = handles.includes(BUNDLE_COLLECTIONS.DENIM);
    const isInPolo = handles.includes(BUNDLE_COLLECTIONS.POLO);
    const isInCaps = handles.includes(BUNDLE_COLLECTIONS.CAPS);
    const isInTops = handles.includes(BUNDLE_COLLECTIONS.TOPS);

    const isLinenShirt = productHandle === 'linen-shirt';
    const isLinenPants = productHandle === 'linen-pants';

    const [polos, caps, tops, linenShirt, linenPants, complementaryProducts] = await Promise.all([
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.POLO),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.CAPS),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.TOPS),
      (isLinenShirt || isLinenPants) ? this.fetchProduct('linen-shirt') : Promise.resolve(null),
      (isLinenShirt || isLinenPants) ? this.fetchProduct('linen-pants') : Promise.resolve(null),
      this.fetchComplementaryProductsByHandle(productHandle),
    ]);

    return {
      isInDenim,
      isInPolo,
      isInCaps,
      isInTops,
      isLinenShirt,
      isLinenPants,
      complementaryProducts,
      polos,
      caps,
      tops,
      linenShirt,
      linenPants,
    };
  }

  /**
   * Fetch all bundle-related data
   */
  async fetchAllBundleData(): Promise<{
    polos: any[];
    denims: any[];
    caps: any[];
    tops: any[];
    linenShirt: any;
    linenPants: any;
    cocktailsBabyTee: any;
  }> {
    const [
      polos,
      denims,
      caps,
      tops,
      linenShirt,
      linenPants,
      cocktailsBabyTee
    ] = await Promise.all([
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.POLO),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.DENIM),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.CAPS),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.TOPS),
      this.fetchProduct('linen-shirt'),
      this.fetchProduct('linen-pants'),
      this.fetchProduct('cocktails-baby-tee-pre-order'),
    ]);

    return {
      polos,
      denims,
      caps,
      tops,
      linenShirt,
      linenPants,
      cocktailsBabyTee,
    };
  }

  /**
   * Fetch complementary products for cross-selling
   */
  async fetchComplementaryProducts(productHandle: string): Promise<any[]> {
    // This would be implemented based on business logic
    // For now, return empty array
    return [];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Factory function to create a data service instance
export function createBundleDataService(storefront: any): BundleDataService {
  return new BundleDataService(storefront);
}
