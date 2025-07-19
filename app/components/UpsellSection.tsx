import { useLoaderData } from 'react-router';
import BundleUpsellCard from './BundleUpsellCard';
import CrossSellUpsellCard from './CrossSellUpsellCard';

function UpsellSection({ product, productOptions, upsells }: {
  product: any;
  productOptions: any[];
  upsells: any[];
}) {
  // Remove the generic type argument, just useLoaderData()
  const loaderData = useLoaderData();
  // Fallback for productCollections
  const productCollections = (loaderData as any)?.productCollections;

  return (
    <div className="flex flex-col gap-10">
      {upsells.map((upsell: any, idx: number) => {
        if (upsell.type === 'bundle') {
          return (
            <BundleUpsellCard
              key={idx}
              product={product}
              productOptions={productOptions}
              upsell={upsell}
            />
          );
        } else if (upsell.type === 'crossSell') {
          // Use real data from collections
          const complementaryProducts = productCollections?.complementaryProducts || [];

          if (complementaryProducts.length > 0) {
            return (
              <CrossSellUpsellCard
                key={idx}
                currentProduct={product}
                complementaryProducts={complementaryProducts}
                upsell={upsell}
              />
            );
          }
        }
        return null;
      })}
    </div>
  );
}

export default UpsellSection; 