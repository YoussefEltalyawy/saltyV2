import { useLoaderData } from 'react-router';
import BundleUpsellCard from './BundleUpsellCard';
import CrossSellUpsellCard from './CrossSellUpsellCard';
import TopsCapBundleCard from './TopsCapBundleCard';

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
          // Check if this is the 4 tops + 1 cap bundle
          if (upsell.minTopsQuantity && upsell.freeCapsQuantity) {
            return (
              <TopsCapBundleCard
                key={idx}
                product={product}
                productOptions={productOptions}
                upsell={upsell}
              />
            );
          }
          
          // Regular cross-sell logic
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