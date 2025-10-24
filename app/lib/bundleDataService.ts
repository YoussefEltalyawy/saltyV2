import { BUNDLE_COLLECTIONS } from './bundleConfig';

const SALTY_CLUB_COLLECTION_HANDLE = 'salty-club';

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
   * Fetch products by their IDs
   */
  async fetchProductsByIds(ids: string[]): Promise<any[]> {
    const products: any[] = [];
    
    for (const id of ids) {
      const cacheKey = `product_id_${id}`;
      
      if (this.cache.has(cacheKey)) {
        products.push(this.cache.get(cacheKey));
        continue;
      }

      try {
        // Convert ID to Shopify GID format if needed
        const graphqlId = id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`;
        
        const result = await this.storefront.query(`
          query GetProductById($id: ID!) {
            product(id: $id) {
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
          variables: { id: graphqlId },
        });

        const product = result?.product || null;
        if (product) {
          this.cache.set(cacheKey, product);
          products.push(product);
        }
      } catch (err) {
        console.error(`Error fetching product ${id}:`, err);
      }
    }

    return products;
  }

  /**
   * Fetch a collection by ID
   */
  async fetchCollectionById(id: string): Promise<any> {
    const cacheKey = `collection_id_${id}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Convert ID to Shopify GID format if needed
      const graphqlId = id.startsWith('gid://') ? id : `gid://shopify/Collection/${id}`;
      
      const result = await this.storefront.query(`
        query GetCollectionById($id: ID!) {
          collection(id: $id) {
            id
            title
            handle
            description
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
        variables: { id: graphqlId },
      });

      const collection = result?.collection || null;
      this.cache.set(cacheKey, collection);
      return collection;
    } catch (err) {
      console.error(`Error fetching collection ${id}:`, err);
      return null;
    }
  }

  /**
   * Fetch collection handles and IDs for a given product handle
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
              nodes { 
                handle
                id
              }
            }
          }
        }
      `, { variables: { handle: productHandle } });

      const collections = result?.product?.collections?.nodes || [];
      const handles = collections.map((c: any) => c.handle);
      const ids = collections.map((c: any) => c.id?.split('/').pop());
      const allIdentifiers = [...handles, ...ids];
      
      this.cache.set(cacheKey, allIdentifiers);
      return allIdentifiers;
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
    isInSaltyClub: boolean;
    isLinenShirt: boolean;
    isLinenPants: boolean;
    complementaryProducts: any[];
    polos: any[];
    caps: any[];
    tops: any[];
    linenShirt: any;
    linenPants: any;
    isZipUp: boolean;
    isHoodie: boolean;
    isSweatpants: boolean;
    isInCollection619384013005: boolean;
    zipUpProducts: any[];
    hoodieProducts: any[];
    sweatpantsProducts: any[];
    collectionBundle3Products: any;
  }> {
    const handles = await this.fetchProductCollectionHandles(productHandle);

    const isInDenim = handles.includes(BUNDLE_COLLECTIONS.DENIM);
    const isInPolo = handles.includes(BUNDLE_COLLECTIONS.POLO);
    const isInCaps = handles.includes(BUNDLE_COLLECTIONS.CAPS);
    const isInTops = handles.includes(BUNDLE_COLLECTIONS.TOPS);
    const isInSaltyClub = handles.includes(SALTY_CLUB_COLLECTION_HANDLE);

    const isLinenShirt = productHandle === 'linen-shirt';
    const isLinenPants = productHandle === 'linen-pants';
    
    // Check for new bundles by fetching the product and checking its ID
    const product = await this.fetchProduct(productHandle);
    const productId = product?.id?.split('/').pop();
    
    const isZipUp = productId === '9085394354381';
    const isHoodie = ['9085406118093', '9085406052557'].includes(productId);
    const isSweatpants = ['9085410410701', '9085413949645'].includes(productId);
    const isInCollection619384013005 = handles.includes('619384013005');
    
    // Debug logging
    if (isInCollection619384013005) {
      console.log(`Product ${productHandle} is in collection 619384013005`);
    }

    const [polos, caps, tops, linenShirt, linenPants, complementaryProducts, zipUpProducts, hoodieProducts, sweatpantsProducts, collectionBundle3Products] = await Promise.all([
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.POLO),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.CAPS),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.TOPS),
      (isLinenShirt || isLinenPants) ? this.fetchProduct('linen-shirt') : Promise.resolve(null),
      (isLinenShirt || isLinenPants) ? this.fetchProduct('linen-pants') : Promise.resolve(null),
      this.fetchComplementaryProductsByHandle(productHandle),
      // Always fetch zip up products if product is zip up or sweatpants
      (isZipUp || isSweatpants) ? this.fetchProductsByIds(['9085394354381']) : Promise.resolve([]),
      // Always fetch hoodie products if product is hoodie or sweatpants
      (isHoodie || isSweatpants) ? this.fetchProductsByIds(['9085406118093', '9085406052557']) : Promise.resolve([]),
      // Always fetch sweatpants products if product is zip up, hoodie, or sweatpants
      (isZipUp || isHoodie || isSweatpants) ? this.fetchProductsByIds(['9085410410701', '9085413949645']) : Promise.resolve([]),
      // Always fetch collection if product is in collection 619384013005
      isInCollection619384013005 ? this.fetchCollectionById('619384013005') : Promise.resolve(null),
    ]);

    return {
      isInDenim,
      isInPolo,
      isInCaps,
      isInTops,
      isInSaltyClub,
      isLinenShirt,
      isLinenPants,
      complementaryProducts,
      polos,
      caps,
      tops,
      linenShirt,
      linenPants,
      isZipUp,
      isHoodie,
      isSweatpants,
      isInCollection619384013005,
      zipUpProducts,
      hoodieProducts,
      sweatpantsProducts,
      collectionBundle3Products,
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
    zipUpProducts: any[];
    sweatpantsProducts: any[];
    hoodieProducts: any[];
    collectionBundle3Products: any;
  }> {
    const [
      polos,
      denims,
      caps,
      tops,
      linenShirt,
      linenPants,
      cocktailsBabyTee,
      zipUpProducts,
      sweatpantsProducts,
      hoodieProducts,
      collectionBundle3Products
    ] = await Promise.all([
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.POLO),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.DENIM),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.CAPS),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.TOPS),
      this.fetchProduct('linen-shirt'),
      this.fetchProduct('linen-pants'),
      this.fetchProduct('cocktails-baby-tee-pre-order'),
      this.fetchProductsByIds(['9085394354381']), // Zip Up
      this.fetchProductsByIds(['9085410410701', '9085413949645']), // Sweatpants
      this.fetchProductsByIds(['9085406118093', '9085406052557']), // Hoodies
      this.fetchCollectionById('619384013005'), // Collection for bundle 3
    ]);

    return {
      polos,
      denims,
      caps,
      tops,
      linenShirt,
      linenPants,
      cocktailsBabyTee,
      zipUpProducts,
      sweatpantsProducts,
      hoodieProducts,
      collectionBundle3Products,
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
