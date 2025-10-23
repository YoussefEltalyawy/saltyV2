import { ProductCard } from './ProductCard';
import type { ProductItemFullFragment } from 'storefrontapi.generated';

interface YouMayAlsoLikeProps {
  products: ProductItemFullFragment[];
}

export function YouMayAlsoLike({ products }: YouMayAlsoLikeProps) {
  // Don't render if no products
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="ml-2 font-bold uppercase text-small">You May Also Like</h2>
      <div className="grid grid-cols-2 gap-x-[3px] gap-y-4 mb-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
