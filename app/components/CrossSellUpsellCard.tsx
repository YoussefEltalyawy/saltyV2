import { useState, useEffect } from 'react';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';

function CrossSellUpsellCard({ currentProduct, complementaryProducts, upsell }: {
  currentProduct: any;
  complementaryProducts: any[];
  upsell: any;
}) {
  const { title, description, discountValue } = upsell;
  const { open } = useAside();
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (complementaryProducts.length > 0 && !selectedProduct) {
      const product = complementaryProducts[0];
      setSelectedProduct(product);
      if (product.variants.nodes.length > 0) {
        // Find first available variant instead of just first variant
        const firstAvailableVariant = product.variants.nodes.find((v: any) => v.availableForSale);
        if (firstAvailableVariant) {
          setSelectedVariantId(firstAvailableVariant.id);
          setSelectedVariant(firstAvailableVariant);
          const initialOptions: { [key: string]: string } = {};
          firstAvailableVariant.selectedOptions.forEach((option: any) => {
            initialOptions[option.name] = option.value;
          });
          setSelectedOptions(initialOptions);
        }
      }
    }
  }, [complementaryProducts, selectedProduct]);

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productHandle = e.target.value;
    const product = complementaryProducts.find(p => p.handle === productHandle);
    if (product) {
      setSelectedProduct(product);
      if (product.variants.nodes.length > 0) {
        // Find first available variant instead of just first variant
        const firstAvailableVariant = product.variants.nodes.find((v: any) => v.availableForSale);
        if (firstAvailableVariant) {
          setSelectedVariantId(firstAvailableVariant.id);
          setSelectedVariant(firstAvailableVariant);
          const initialOptions: { [key: string]: string } = {};
          firstAvailableVariant.selectedOptions.forEach((option: any) => {
            initialOptions[option.name] = option.value;
          });
          setSelectedOptions(initialOptions);
        } else {
          setSelectedVariantId(null);
          setSelectedVariant(null);
          setSelectedOptions({});
        }
      } else {
        setSelectedVariantId(null);
        setSelectedVariant(null);
        setSelectedOptions({});
      }
    }
  };

  const handleOptionChange = (name: string, value: string) => {
    const newOptions = { ...selectedOptions, [name]: value };
    setSelectedOptions(newOptions);
    if (selectedProduct) {
      const matchingVariant = selectedProduct.variants.nodes.find((variant: any) => {
        return variant.selectedOptions.every((option: any) => {
          return newOptions[option.name] === option.value;
        });
      });
      if (matchingVariant) {
        setSelectedVariantId(matchingVariant.id);
        setSelectedVariant(matchingVariant);
      }
    }
  };

  const getProductOptions = () => {
    if (!selectedProduct || !selectedProduct.options) return [];
    return selectedProduct.options;
  };

  const getOptionValues = (optionName: string) => {
    const option = selectedProduct?.options?.find((opt: any) => opt.name === optionName);
    return option && option.optionValues ? option.optionValues.map((v: any) => v.name) : [];
  };

  // Color swatch helper
  const getSwatchColor = (product: any, color: string): string | undefined => {
    if (!product?.options) return undefined;
    const colorOption = product.options.find((opt: any) => opt.name.toLowerCase() === 'color');
    if (!colorOption || !colorOption.optionValues) return undefined;
    const value = colorOption.optionValues.find((v: any) => v.name === color);
    return value?.swatch?.color;
  };

  const lines = [];
  if (currentProduct.selectedOrFirstAvailableVariant?.id) {
    lines.push({
      merchandiseId: currentProduct.selectedOrFirstAvailableVariant.id,
      quantity: 1
    });
  }
  if (selectedVariantId) {
    lines.push({
      merchandiseId: selectedVariantId,
      quantity: 1
    });
  }

  const handleClick = () => {
    if (!selectedVariantId) {
      setError('Please select a product to complete the bundle.');
      return false;
    }
    setError('');
    open('cart');
    return true;
  };

  const calculatePrices = () => {
    if (!currentProduct.selectedOrFirstAvailableVariant?.price || !selectedVariant?.price) {
      return { original: 0, discounted: 0 };
    }
    const currentProductPrice = parseFloat(currentProduct.selectedOrFirstAvailableVariant.price.amount);
    const complementaryProductPrice = parseFloat(selectedVariant.price.amount);
    const originalTotal = currentProductPrice + complementaryProductPrice;
    const discountedTotal = originalTotal * (1 - discountValue / 100);
    return {
      original: originalTotal,
      discounted: discountedTotal,
      currencyCode: currentProduct.selectedOrFirstAvailableVariant.price.currencyCode
    };
  };
  const prices = calculatePrices();

  return (
    <div className="mb-4 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">{title}</h2>
      <p className="mb-6 text-gray-700">{description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current product */}
        <div className="flex flex-col border border-gray-100 p-3">
          <h3 className="text-sm font-medium mb-2">Current Selection</h3>
          <div className="w-full aspect-square mb-3 bg-gray-100 max-h-48">
            {currentProduct.selectedOrFirstAvailableVariant?.image?.url ? (
              <img
                src={currentProduct.selectedOrFirstAvailableVariant.image.url}
                alt={currentProduct.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400 text-xs">No image available</span>
              </div>
            )}
          </div>
          <div className="text-sm font-medium">{currentProduct.title}</div>
          <div className="text-xs text-gray-500 mt-1">
            {(currentProduct.selectedOrFirstAvailableVariant?.selectedOptions ?? []).map((option: any) => (
              <span key={option.name}>{option.name}: {option.value} </span>
            ))}
          </div>
          <div className="mt-2 text-sm font-medium">
            {currentProduct.selectedOrFirstAvailableVariant?.price?.amount} {currentProduct.selectedOrFirstAvailableVariant?.price?.currencyCode}
          </div>
        </div>
        {/* Complementary product selection */}
        <div className="flex flex-col border border-gray-100 p-3">
          <h3 className="text-sm font-medium mb-2">Choose a complementary item</h3>
          <select
            className="border border-gray-300 rounded px-2 py-1 mb-3 text-sm"
            onChange={handleProductChange}
            value={selectedProduct?.handle || ''}
          >
            {(complementaryProducts ?? []).map((product: any) => (
              <option key={product.handle} value={product.handle}>
                {product.title}
              </option>
            ))}
          </select>
          {selectedProduct && (
            <>
              <div className="w-full aspect-square mb-3 bg-gray-100 max-h-48">
                {selectedVariant?.image?.url ? (
                  <img
                    src={selectedVariant.image.url}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                ) : selectedProduct.featuredImage?.url ? (
                  <img
                    src={selectedProduct.featuredImage.url}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No image available</span>
                  </div>
                )}
              </div>
              <div className="text-sm font-medium">{selectedProduct.title}</div>
              {/* Variant options */}
              {/* Variant Selection Dropdown */}
              <div className="product-options mb-3">
                <h5 className="text-xs font-medium text-gray-900 mb-2">Select Variant</h5>
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  value={`${selectedOptions['Color'] || ''}/${selectedOptions['Size'] || ''}`}
                  onChange={(e) => {
                    if (e.target.value === '') return;
                    const [color, size] = e.target.value.split('/');
                    if (color && size) {
                      // Update both color and size at once to avoid race conditions
                      setSelectedOptions(prev => ({
                        ...prev,
                        Color: color,
                        Size: size,
                      }));

                      // Find the variant for this color/size combination
                      if (selectedProduct?.variants?.nodes) {
                        const variant = selectedProduct.variants.nodes.find((v: any) => {
                          const hasColor = v.selectedOptions.some((opt: any) =>
                            opt.name.toLowerCase() === 'color' && opt.value === color
                          );
                          const hasSize = v.selectedOptions.some((opt: any) =>
                            opt.name.toLowerCase() === 'size' && opt.value === size
                          );
                          return hasColor && hasSize;
                        });

                        if (variant) {
                          setSelectedVariant(variant);
                        }
                      }
                    }
                  }}
                >
                  <option value="">Choose color/size...</option>
                  {(() => {
                    if (!selectedProduct?.variants?.nodes) return [];

                    return selectedProduct.variants.nodes.map((variant: any) => {
                      const colorOption = variant.selectedOptions.find((opt: any) =>
                        opt.name.toLowerCase() === 'color'
                      );
                      const sizeOption = variant.selectedOptions.find((opt: any) =>
                        opt.name.toLowerCase() === 'size'
                      );

                      if (colorOption && sizeOption) {
                        const value = `${colorOption.value}/${sizeOption.value}`;
                        const label = `${colorOption.value}/${sizeOption.value}`;
                        const available = variant.availableForSale;

                        return (
                          <option
                            key={value}
                            value={value}
                            disabled={!available}
                            style={{
                              color: available ? '#000' : '#9CA3AF',
                              backgroundColor: available ? '#fff' : '#F3F4F6',
                            }}
                          >
                            {label} {!available ? '(Out of Stock)' : ''}
                          </option>
                        );
                      }
                      return null;
                    }).filter(Boolean);
                  })()}
                </select>
              </div>
              <div className="mt-2 text-sm font-medium">
                {selectedVariant?.price?.amount} {selectedVariant?.price?.currencyCode}
              </div>
            </>
          )}
        </div>
      </div>
      {/* Bundle pricing */}
      <div className="mt-6 text-center">
        <div className="text-lg font-medium">Bundle Price:</div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-500 line-through">
            {prices.original.toFixed(2)} {prices.currencyCode}
          </span>
          <span className="text-xl font-bold">
            {prices.discounted.toFixed(2)} {prices.currencyCode}
          </span>
          <span className="text-green-600 text-sm">
            (Save {discountValue}%)
          </span>
        </div>
      </div>
      {error && <div className="text-red-600 mt-4 text-sm text-center">{error}</div>}
      <div className="mt-6">
        <AddToCartButton
          disabled={lines.length < 2}
          lines={lines}
          onClick={handleClick}
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            Add Bundle to Cart
          </span>
        </AddToCartButton>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">Discount applied automatically at checkout.</div>
    </div>
  );
}

export default CrossSellUpsellCard; 